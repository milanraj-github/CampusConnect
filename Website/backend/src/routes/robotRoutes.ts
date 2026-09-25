import { Router } from 'express';
import { z } from 'zod';
import { RobotController } from '../controllers/robotController';
import { validateBody } from '../middleware/validate';
import { authenticateRobot, authenticate } from '../middleware/auth';

const router = Router();

const updateStatusSchema = z.object({
  status: z.string().optional(),
  currentLocationId: z.number().nullable().optional(),
  currentLocationName: z.string().nullable().optional(),
  currentDirection: z.string().nullable().optional(),
  currentDestination: z.string().nullable().optional(),
  currentState: z.string().optional(),
  battery: z.number().optional(),
  obstacleStatus: z.string().optional(),
  qrStatus: z.string().optional(),
});

const addLogSchema = z.object({
  state: z.string(),
  location: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  message: z.string(),
});

// Admin or robot can get status
router.get('/status', RobotController.getStatus);
// Robot can update its status via API
router.post('/status', authenticateRobot, validateBody(updateStatusSchema), RobotController.updateStatus);
// Robot or admin can view logs
router.get('/logs', RobotController.getLogs);
// Robot can add log via API
router.post('/logs', authenticateRobot, validateBody(addLogSchema), RobotController.addLog);

// Raspberry Pi direct integration & proxy endpoints
router.get('/rpi/fetch', RobotController.fetchFromRpi);
router.post('/rpi/config', authenticate, RobotController.updateRpiConfig);
router.post('/rpi/command', authenticate, RobotController.sendRpiCommand);

export default router;
