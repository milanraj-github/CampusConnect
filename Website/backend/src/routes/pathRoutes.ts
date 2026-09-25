import { Router } from 'express';
import { z } from 'zod';
import { PathController } from '../controllers/pathController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const createPathSchema = z.object({
  mapId: z.number().optional(),
  fromLocationId: z.number().int().positive(),
  toLocationId: z.number().int().positive(),
  direction: z.enum(['NORTH', 'EAST', 'SOUTH', 'WEST']),
  distance: z.number().positive(),
  bidirectional: z.boolean().optional(),
});

router.get('/', PathController.getAll);
router.post('/', authenticate, validateBody(createPathSchema), PathController.create);
router.delete('/:id', authenticate, PathController.delete);

export default router;
