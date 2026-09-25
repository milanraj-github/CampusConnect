import { Request, Response, NextFunction } from 'express';
import { PathService } from '../services/pathService';

export class PathController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mapId = req.query.mapId ? parseInt(String(req.query.mapId), 10) : undefined;
      const paths = await PathService.getAll(mapId);
      res.json({ success: true, data: paths });
    } catch (error: any) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const path = await PathService.create(req.body);
      res.status(201).json({ success: true, data: path });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await PathService.delete(id);
      res.json({ success: true, message: 'Path deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
