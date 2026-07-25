import { Router } from 'express';
import * as subscriptionPlanController from '../controllers/subscriptionPlanController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPlanSchema, updatePlanSchema } from '../controllers/subscriptionPlanController';

const router = Router();

router.get('/', authenticate, requireRole('super_admin', 'company_admin'), subscriptionPlanController.listPlans);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin'), subscriptionPlanController.getPlan);
router.post('/', authenticate, requireRole('super_admin'), validate(createPlanSchema), subscriptionPlanController.createPlan);
router.patch('/:id', authenticate, requireRole('super_admin'), validate(updatePlanSchema), subscriptionPlanController.updatePlan);
router.delete('/:id', authenticate, requireRole('super_admin'), subscriptionPlanController.deletePlan);
router.delete('/:id/permanent', authenticate, requireRole('super_admin'), subscriptionPlanController.hardDeletePlan);

export default router;
