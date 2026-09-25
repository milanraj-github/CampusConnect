import { Request, Response, NextFunction } from 'express';
import { LocationService } from '../services/locationService';

export class LocationController {
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mapId = req.query.mapId ? parseInt(String(req.query.mapId), 10) : undefined;
      const locations = await LocationService.getAll(mapId);
      res.json({ success: true, data: locations });
    } catch (error: any) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const loc = await LocationService.getById(id);
      res.json({ success: true, data: loc });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  static async getByQrId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const qrId = req.params.qrId;
      const loc = await LocationService.getByQrId(qrId);
      if (!loc) {
        res.status(404).json({ success: false, error: 'No location mapped to this QR ID' });
        return;
      }
      res.json({ success: true, data: loc });
    } catch (error: any) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loc = await LocationService.create(req.body);
      res.status(201).json({ success: true, data: loc });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const loc = await LocationService.update(id, req.body);
      res.json({ success: true, data: loc });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await LocationService.delete(id);
      res.json({ success: true, message: 'Location deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
