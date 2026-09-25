import { prisma } from '../utils/prisma';
import { getSocketServer } from '../websocket/socketServer';
import { logger } from '../utils/logger';

export interface RobotStateUpdateDto {
  robotToken?: string;
  name?: string;
  status?: string;
  currentLocationId?: number | null;
  currentLocationName?: string | null;
  currentDirection?: string | null;
  currentDestination?: string | null;
  currentState?: string;
  battery?: number;
  obstacleStatus?: string;
  qrStatus?: string;
}

export class RobotService {
  static async getRobotStatus() {
    let robot = await prisma.robot.findFirst({
      include: {
        currentLocation: true,
      },
    });

    if (!robot) {
      robot = await prisma.robot.create({
        data: {
          name: 'CampusBot-01',
          token: process.env.ROBOT_TOKEN || 'campusconnect_robot_secure_token_98765',
          status: 'OFFLINE',
          currentState: 'IDLE',
          battery: 100.0,
          obstacleStatus: 'CLEAR',
          qrStatus: 'NOT_VERIFIED',
        },
        include: {
          currentLocation: true,
        },
      });
    }

    return robot;
  }

  static async updateStatus(dto: RobotStateUpdateDto) {
    let robot = await prisma.robot.findFirst();
    if (!robot) {
      robot = await prisma.robot.create({
        data: {
          name: dto.name || 'CampusBot-01',
          token: process.env.ROBOT_TOKEN || 'campusconnect_robot_secure_token_98765',
        },
      });
    }

    let locationId = dto.currentLocationId;
    if (dto.currentLocationName && !locationId) {
      const loc = await prisma.location.findFirst({
        where: { name: dto.currentLocationName },
      });
      if (loc) locationId = loc.id;
    }

    const updated = await prisma.robot.update({
      where: { id: robot.id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(locationId !== undefined && { currentLocationId: locationId }),
        ...(dto.currentDirection !== undefined && { currentDirection: dto.currentDirection }),
        ...(dto.currentDestination !== undefined && { currentDestination: dto.currentDestination }),
        ...(dto.currentState !== undefined && { currentState: dto.currentState }),
        ...(dto.battery !== undefined && { battery: dto.battery }),
        ...(dto.obstacleStatus !== undefined && { obstacleStatus: dto.obstacleStatus }),
        ...(dto.qrStatus !== undefined && { qrStatus: dto.qrStatus }),
        lastHeartbeat: new Date(),
      },
      include: {
        currentLocation: true,
      },
    });

    // Broadcast to dashboard
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/dashboard').emit('robot:status', updated);
      }
    } catch (e) {
      // Ignored if socket server not ready
    }

    return updated;
  }

  static async addLog(data: {
    state: string;
    location?: string | null;
    direction?: string | null;
    message: string;
  }) {
    const robot = await this.getRobotStatus();

    const log = await prisma.navigationLog.create({
      data: {
        robotId: robot.id,
        state: data.state,
        location: data.location || null,
        direction: data.direction || null,
        message: data.message,
      },
    });

    // Broadcast log to dashboard
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/dashboard').emit('robot:log', log);
      }
    } catch (e) {}

    return log;
  }

  static async getLogs(limit = 100) {
    return prisma.navigationLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }
}
