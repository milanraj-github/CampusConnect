import { Router } from 'express';
import { z } from 'zod';
import { DestinationController } from '../controllers/destinationController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const createInfoSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const updateInfoSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

router.get('/:locationId/info', DestinationController.getInfoByLocationId);
router.post('/:locationId/info', authenticate, validateBody(createInfoSchema), DestinationController.addInfo);
router.put('/info/:id', authenticate, validateBody(updateInfoSchema), DestinationController.updateInfo);
router.delete('/info/:id', authenticate, DestinationController.deleteInfo);

export default router;
