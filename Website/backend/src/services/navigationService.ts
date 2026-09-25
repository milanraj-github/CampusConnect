import { prisma } from '../utils/prisma';
import { getSocketServer } from '../websocket/socketServer';
import { RobotService } from './robotService';

export interface CommandDto {
  command: 'GOTO' | 'STOP' | 'RETURN_HOME' | 'PAUSE' | 'RESUME';
  destination?: string;
  parameters?: any;
}

export class NavigationService {
  static async sendCommand(cmd: CommandDto) {
    const robot = await RobotService.getRobotStatus();

    // Log command
    await RobotService.addLog({
      state: robot.currentState,
      location: robot.currentLocation?.name || null,
      direction: robot.currentDirection,
      message: `Admin command received: ${cmd.command} ${cmd.destination ? `-> ${cmd.destination}` : ''}`,
    });

    // Forward command to robot over WebSocket
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/robot').emit('robot:command', cmd);
      }
    } catch (e) {}

    return {
      success: true,
      message: `Command '${cmd.command}' dispatched to robot`,
      command: cmd,
    };
  }

  static async getNavigationStatus() {
    const robot = await RobotService.getRobotStatus();
    const latestLogs = await RobotService.getLogs(20);

    return {
      robot,
      recentLogs: latestLogs,
    };
  }
}
