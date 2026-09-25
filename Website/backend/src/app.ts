import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import mapRoutes from './routes/mapRoutes';
import locationRoutes from './routes/locationRoutes';
import pathRoutes from './routes/pathRoutes';
import destinationRoutes from './routes/destinationRoutes';
import robotRoutes from './routes/robotRoutes';
import navigationRoutes from './routes/navigationRoutes';

export function createApp(): express.Application {
  const app = express();

  // Basic security and parsing middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, robot client) or any local/LAN origin
      callback(null, true);
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Reasonable for campus LAN environment
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), system: 'CampusConnect API' });
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/paths', pathRoutes);
  app.use('/api/destinations', destinationRoutes);
  app.use('/api/robot', robotRoutes);
  app.use('/api/navigation', navigationRoutes);

  // Global error handler
  app.use(errorHandler);

  return app;
}
