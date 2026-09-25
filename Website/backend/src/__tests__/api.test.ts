import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';

const app = createApp();

describe('CampusConnect Backend API Tests', () => {
  let authToken = '';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.system).toBe('CampusConnect API');
  });

  test('POST /api/auth/login with valid credentials should return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@campusconnect.local',
        password: 'admin123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@campusconnect.local');
    authToken = res.body.data.token;
  });

  test('GET /api/map should return active campus map with locations and paths', async () => {
    const res = await request(app).get('/api/map');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locations).toBeDefined();
    expect(res.body.data.locations.length).toBeGreaterThan(0);
    expect(res.body.data.paths).toBeDefined();
  });

  test('GET /api/locations should return all campus locations', async () => {
    const res = await request(app).get('/api/locations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/robot/status should return robot state', async () => {
    const res = await request(app).get('/api/robot/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentState).toBeDefined();
    expect(res.body.data.name).toBe('CampusBot-01');
  });

  test('POST /api/robot/status with valid robot token updates telemetry', async () => {
    const res = await request(app)
      .post('/api/robot/status')
      .set('x-robot-token', 'campusconnect_robot_secure_token_98765')
      .send({
        currentState: 'NAVIGATING',
        battery: 98.5,
        obstacleStatus: 'CLEAR',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentState).toBe('NAVIGATING');
    expect(res.body.data.battery).toBe(98.5);
  });
});
