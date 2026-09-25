import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initializeSocketServer } from './websocket/socketServer';
import { prisma } from './utils/prisma';

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to SQLite database via Prisma');

    const app = createApp();
    const server = http.createServer(app);

    // Attach Socket.IO
    initializeSocketServer(server);

    server.listen(config.port, () => {
      logger.info(`=================================================`);
      logger.info(`CampusConnect Backend Server running on port ${config.port}`);
      logger.info(`HTTP REST API: http://localhost:${config.port}/api`);
      logger.info(`WebSocket namespaces: /robot and /dashboard`);
      logger.info(`=================================================`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
