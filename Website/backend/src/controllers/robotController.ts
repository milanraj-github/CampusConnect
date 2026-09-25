import { Request, Response, NextFunction } from 'express';
import { RobotService } from '../services/robotService';
import { RpiService } from '../services/rpiService';

export class RobotController {
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const robot = await RobotService.getRobotStatus();
      res.json({ success: true, data: robot });
    } catch (error: any) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await RobotService.updateStatus(req.body);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      next(error);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const logs = await RobotService.getLogs(limit);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      next(error);
    }
  }

  static async addLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const log = await RobotService.addLog(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      next(error);
    }
  }

  static async fetchFromRpi(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subpath = req.query.path ? String(req.query.path) : '';
      const result = await RpiService.fetchFromRpi(subpath);
      res.json({ success: result.connected, ...result });
    } catch (error: any) {
      next(error);
    }
  }

  static async updateRpiConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = req.body;
      if (url) {
        RpiService.setActiveUrl(url);
      }
      res.json({ success: true, currentUrl: RpiService.getActiveUrl() });
    } catch (error: any) {
      next(error);
    }
  }

  static async sendRpiCommand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { command, destination, parameters } = req.body;
      const result = await RpiService.sendCommandToRpi(command, destination, parameters);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
}
