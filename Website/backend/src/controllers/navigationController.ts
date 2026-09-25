import { Request, Response, NextFunction } from 'express';
import { NavigationService } from '../services/navigationService';

export class NavigationController {
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await NavigationService.getNavigationStatus();
      res.json({ success: true, data: status });
    } catch (error: any) {
      next(error);
    }
  }

  static async sendCommand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NavigationService.sendCommand(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
