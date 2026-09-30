import { Router } from 'express';
import * as subscriptionPlanController from '../controllers/subscriptionPlanController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import { validate } from '../middleware/validate';
import { createPlanSchema, updatePlanSchema } from '../controllers/subscriptionPlanController';

const router = Router();

router.get('/', authenticate, requireRole(...CAP.planRead), subscriptionPlanController.listPlans);
router.get('/:id', authenticate, requireRole(...CAP.planRead), subscriptionPlanController.getPlan);
router.post('/', authenticate, requireRole(...CAP.platformAdmin), validate(createPlanSchema), subscriptionPlanController.createPlan);
router.patch('/:id', authenticate, requireRole(...CAP.platformAdmin), validate(updatePlanSchema), subscriptionPlanController.updatePlan);
router.delete('/:id', authenticate, requireRole(...CAP.platformAdmin), subscriptionPlanController.deletePlan);
router.delete('/:id/permanent', authenticate, requireRole(...CAP.platformAdmin), subscriptionPlanController.hardDeletePlan);

export default router;
