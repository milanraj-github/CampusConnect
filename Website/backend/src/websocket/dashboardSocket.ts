import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { RobotService } from '../services/robotService';
import { MapService } from '../services/mapService';

export function setupDashboardNamespace(io: SocketIOServer): void {
  const dashboardNamespace = io.of('/dashboard');

  dashboardNamespace.on('connection', async (socket: Socket) => {
    logger.info(`Dashboard client connected: [${socket.id}]`);

    // Send initial status snapshot to dashboard on connect
    try {
      const robot = await RobotService.getRobotStatus();
      const logs = await RobotService.getLogs(30);
      const map = await MapService.getActiveMap();

      socket.emit('initial:state', {
        robot,
        logs,
        map,
      });
    } catch (err: any) {
      logger.error('Error sending initial state to dashboard client:', err);
    }

    socket.on('disconnect', () => {
      logger.info(`Dashboard client disconnected: [${socket.id}]`);
    });
  });
}
