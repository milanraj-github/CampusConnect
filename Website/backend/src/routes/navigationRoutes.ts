import { Router } from 'express';
import { z } from 'zod';
import { NavigationController } from '../controllers/navigationController';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const commandSchema = z.object({
  command: z.enum(['GOTO', 'STOP', 'RETURN_HOME', 'PAUSE', 'RESUME']),
  destination: z.string().optional(),
  parameters: z.any().optional(),
});

router.get('/status', NavigationController.getStatus);
router.post('/command', authenticate, validateBody(commandSchema), NavigationController.sendCommand);

export default router;
