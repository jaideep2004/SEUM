import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/payrollController';

const router = Router();
router.use(authenticate);

router.post('/batches', ctrl.createBatch);
router.get('/batches', ctrl.listBatches);
router.get('/batches/:id', ctrl.getBatchDetail);
router.patch('/batches/:id/approve', ctrl.approveBatch);
router.patch('/batches/:id/pay', ctrl.payBatch);
router.delete('/batches/:id', ctrl.deleteBatch);

export default router;
