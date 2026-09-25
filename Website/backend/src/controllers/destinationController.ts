import { Request, Response, NextFunction } from 'express';
import { DestinationService } from '../services/destinationService';

export class DestinationController {
  static async getInfoByLocationId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locationId = parseInt(req.params.locationId, 10);
      const data = await DestinationService.getInfoByLocationId(locationId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  static async addInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locationId = parseInt(req.params.locationId, 10);
      const { question, answer } = req.body;
      const created = await DestinationService.addInfo({ locationId, question, answer });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async updateInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { question, answer } = req.body;
      const updated = await DestinationService.updateInfo(id, question, answer);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      await DestinationService.deleteInfo(id);
      res.json({ success: true, message: 'Question & answer deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
