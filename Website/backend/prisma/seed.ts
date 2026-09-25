import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Admin User
  const adminEmail = 'admin@campusconnect.local';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    admin = await prisma.user.create({
      data: {
        name: 'Campus Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  // 2. Seed Campus Map
  let map = await prisma.campusMap.findFirst({ where: { name: 'Main Campus' } });
  if (!map) {
    map = await prisma.campusMap.create({
      data: {
        name: 'Main Campus',
        version: 1,
        isActive: true,
      },
    });
    console.log(`Created Campus Map: ${map.name}`);
  }

  // 3. Seed Locations (Matching Demo Scenario Section 43)
  const locStart = await prisma.location.upsert({
    where: { mapId_name: { mapId: map.id, name: 'Main Entrance' } },
    update: {},
    create: {
      mapId: map.id,
      name: 'Main Entrance',
      type: 'START',
      x: 100,
      y: 300,
      qrId: 'QR-START-01',
      description: 'Campus Main Entrance and reception lobby where robot docks.',
    },
  });

  const locBlockA = await prisma.location.upsert({
    where: { mapId_name: { mapId: map.id, name: 'Block A' } },
    update: {},
    create: {
      mapId: map.id,
      name: 'Block A',
      type: 'WAYPOINT',
      x: 350,
      y: 300,
      qrId: 'QR-BLOCK-A-01',
      description: 'Academic block housing computer science and engineering labs.',
    },
  });

  const locLibrary = await prisma.location.upsert({
    where: { mapId_name: { mapId: map.id, name: 'Library' } },
    update: {},
    create: {
      mapId: map.id,
      name: 'Library',
      type: 'DESTINATION',
      x: 600,
      y: 150,
      qrId: 'QR-LIBRARY-01',
      description: 'Central campus library with digital catalog and quiet study halls.',
    },
  });

  const locCanteen = await prisma.location.upsert({
    where: { mapId_name: { mapId: map.id, name: 'Canteen' } },
    update: {},
    create: {
      mapId: map.id,
      name: 'Canteen',
      type: 'DESTINATION',
      x: 600,
      y: 450,
      qrId: 'QR-CANTEEN-01',
      description: 'Student cafeteria and dining area serving hot meals and drinks.',
    },
  });

  // 4. Seed Paths
  await prisma.path.deleteMany({ where: { mapId: map.id } });

  // Main Entrance -> Block A (EAST, 15m)
  await prisma.path.create({
    data: {
      mapId: map.id,
      fromLocationId: locStart.id,
      toLocationId: locBlockA.id,
      direction: 'EAST',
      distance: 15.0,
      bidirectional: true,
    },
  });

  // Block A -> Library (NORTH, 10m)
  await prisma.path.create({
    data: {
      mapId: map.id,
      fromLocationId: locBlockA.id,
      toLocationId: locLibrary.id,
      direction: 'NORTH',
      distance: 10.0,
      bidirectional: true,
    },
  });

  // Block A -> Canteen (SOUTH, 10m)
  await prisma.path.create({
    data: {
      mapId: map.id,
      fromLocationId: locBlockA.id,
      toLocationId: locCanteen.id,
      direction: 'SOUTH',
      distance: 10.0,
      bidirectional: true,
    },
  });

  // 5. Seed Destination Q&A Info
  await prisma.destinationInfo.deleteMany({});

  // Library Q&A
  await prisma.destinationInfo.createMany({
    data: [
      {
        locationId: locLibrary.id,
        question: 'What are the library timings?',
        answer: 'The library is open from 9 AM to 6 PM Monday through Saturday.',
      },
      {
        locationId: locLibrary.id,
        question: 'Which floor is the reading room on?',
        answer: 'The reading room is located on the ground floor next to the reference section.',
      },
      {
        locationId: locLibrary.id,
        question: 'How many books can I borrow at a time?',
        answer: 'Students can borrow up to four books for two weeks using their campus ID card.',
      },
      {
        locationId: locLibrary.id,
        question: 'Is Wi-Fi available in the library?',
        answer: 'Yes, high-speed campus Wi-Fi is available across all floors of the library.',
      },
    ],
  });

  // Canteen Q&A
  await prisma.destinationInfo.createMany({
    data: [
      {
        locationId: locCanteen.id,
        question: 'What are the canteen timings?',
        answer: 'The canteen is open from 8 AM to 8 PM every day.',
      },
      {
        locationId: locCanteen.id,
        question: 'What food is available today?',
        answer: 'The canteen serves hot meals, sandwiches, snacks, juices, tea, and coffee.',
      },
      {
        locationId: locCanteen.id,
        question: 'Are digital payments accepted?',
        answer: 'Yes, UPI, card, and campus wallet payments are all accepted.',
      },
    ],
  });

  // 6. Seed Robot record
  await prisma.robot.upsert({
    where: { name: 'CampusBot-01' },
    update: {
      currentLocationId: locStart.id,
      currentDirection: 'NORTH',
    },
    create: {
      name: 'CampusBot-01',
      token: process.env.ROBOT_TOKEN || 'campusconnect_robot_secure_token_98765',
      status: 'OFFLINE',
      currentState: 'IDLE',
      currentLocationId: locStart.id,
      currentDirection: 'NORTH',
      battery: 100.0,
      obstacleStatus: 'CLEAR',
      qrStatus: 'VERIFIED',
    },
  });

  console.log('Database seeded successfully with demo campus map & Q&A!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
