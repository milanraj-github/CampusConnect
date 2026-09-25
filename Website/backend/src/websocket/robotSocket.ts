import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RobotService } from '../services/robotService';
import { MapService } from '../services/mapService';

export function setupRobotNamespace(io: SocketIOServer): void {
  const robotNamespace = io.of('/robot');

  // Middleware for token authentication
  robotNamespace.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || token !== config.robotToken) {
      logger.warn(`Robot connection rejected: Invalid or missing token from ${socket.id}`);
      return next(new Error('Authentication failed: Invalid robot token'));
    }
    next();
  });

  robotNamespace.on('connection', async (socket: Socket) => {
    logger.info(`Robot connected to WebSocket: [${socket.id}]`);

    // Mark robot as online
    const robot = await RobotService.updateStatus({
      status: 'ONLINE',
    });

    await RobotService.addLog({
      state: robot.currentState,
      location: robot.currentLocation?.name || null,
      direction: robot.currentDirection,
      message: 'Robot connected to server',
    });

    // Handle telemetry / state updates from robot
    socket.on('robot:telemetry', async (data) => {
      try {
        await RobotService.updateStatus({
          currentState: data.state,
          currentLocationName: data.location,
          currentDirection: data.direction,
          currentDestination: data.destination,
          battery: data.battery,
          obstacleStatus: data.obstacle,
          qrStatus: data.qr_verified ? 'VERIFIED' : 'NOT_VERIFIED',
          status: 'ONLINE',
        });
      } catch (err: any) {
        logger.error('Error handling robot telemetry:', err);
      }
    });

    // Handle robot navigation logs
    socket.on('robot:log', async (data) => {
      try {
        await RobotService.addLog({
          state: data.state || 'UNKNOWN',
          location: data.location || null,
          direction: data.direction || null,
          message: data.message || '',
        });
      } catch (err: any) {
        logger.error('Error handling robot log:', err);
      }
    });

    // Handle robot request for full map
    socket.on('robot:request_map', async (_data, callback) => {
      try {
        const map = await MapService.getActiveMap();
        logger.info(`Robot requested map -> returning v${map.version}`);
        if (typeof callback === 'function') {
          callback({ success: true, map });
        } else {
          socket.emit('robot:map_data', map);
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Heartbeat from robot
    socket.on('robot:heartbeat', async (data) => {
      try {
        await RobotService.updateStatus({
          battery: data?.battery,
          status: 'ONLINE',
        });
      } catch (err) {}
    });

    socket.on('disconnect', async (reason) => {
      logger.warn(`Robot disconnected: [${socket.id}] Reason: ${reason}`);
      await RobotService.updateStatus({
        status: 'OFFLINE',
      });
      await RobotService.addLog({
        state: 'IDLE',
        message: `Robot disconnected: ${reason}`,
      });
    });
  });
}
