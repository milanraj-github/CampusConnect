import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { setupRobotNamespace } from './robotSocket';
import { setupDashboardNamespace } from './dashboardSocket';

let ioInstance: SocketIOServer | null = null;

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  ioInstance = io;

  // Setup namespaces
  setupRobotNamespace(io);
  setupDashboardNamespace(io);

  logger.info('Socket.IO initialized with /robot and /dashboard namespaces');
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}
