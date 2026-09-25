import { Router } from 'express';
import { z } from 'zod';
import { MapController } from '../controllers/mapController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const locationSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  type: z.enum(['START', 'DESTINATION', 'WAYPOINT']),
  x: z.number(),
  y: z.number(),
  qrId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const pathSchema = z.object({
  id: z.number().optional(),
  fromLocationName: z.string().min(1),
  toLocationName: z.string().min(1),
  direction: z.enum(['NORTH', 'EAST', 'SOUTH', 'WEST']),
  distance: z.number().positive(),
  bidirectional: z.boolean().optional(),
});

const saveMapSchema = z.object({
  name: z.string().optional(),
  locations: z.array(locationSchema),
  paths: z.array(pathSchema),
});

router.get('/', MapController.getActiveMap);
router.get('/:id', MapController.getMapById);
router.post('/save', authenticate, validateBody(saveMapSchema), MapController.saveVisualMap);

export default router;
