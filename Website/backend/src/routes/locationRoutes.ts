import { Router } from 'express';
import { z } from 'zod';
import { LocationController } from '../controllers/locationController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const createLocationSchema = z.object({
  mapId: z.number().optional(),
  name: z.string().min(1),
  type: z.enum(['START', 'DESTINATION', 'WAYPOINT']),
  x: z.number(),
  y: z.number(),
  qrId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['START', 'DESTINATION', 'WAYPOINT']).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  qrId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

router.get('/', LocationController.getAll);
router.get('/qr/:qrId', LocationController.getByQrId);
router.get('/:id', LocationController.getById);
router.post('/', authenticate, validateBody(createLocationSchema), LocationController.create);
router.put('/:id', authenticate, validateBody(updateLocationSchema), LocationController.update);
router.delete('/:id', authenticate, LocationController.delete);

export default router;
