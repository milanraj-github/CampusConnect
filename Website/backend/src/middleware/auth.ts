import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      robotToken?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}

export function authenticateRobot(req: Request, res: Response, next: NextFunction): void {
  const robotToken = req.headers['x-robot-token'] || req.query.token;
  if (!robotToken || robotToken !== config.robotToken) {
    res.status(401).json({ success: false, error: 'Invalid or missing robot authentication token' });
    return;
  }
  req.robotToken = String(robotToken);
  next();
}
