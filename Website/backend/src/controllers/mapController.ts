import { Request, Response, NextFunction } from 'express';
import { MapService } from '../services/mapService';

export class MapController {
  static async getActiveMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const map = await MapService.getActiveMap();
      res.json({ success: true, data: map });
    } catch (error: any) {
      next(error);
    }
  }

  static async getMapById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const map = await MapService.getMapById(id);
      res.json({ success: true, data: map });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  static async saveVisualMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, locations, paths } = req.body;
      const updatedMap = await MapService.saveVisualMap({ name, locations, paths });
      res.json({ success: true, data: updatedMap, message: 'Campus map updated and synchronized successfully' });
    } catch (error: any) {
      next(error);
    }
  }
}
