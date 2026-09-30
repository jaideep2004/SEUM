import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as ctrl from '../controllers/payrollController';

const PAY_READ = CAP.payrollRead;
const PAY_WRITE = CAP.payrollWrite;

const router = Router();
router.use(authenticate);

router.post('/batches', requireRole(...PAY_WRITE), ctrl.createBatch);
router.get('/batches', requireRole(...PAY_READ), ctrl.listBatches);
router.get('/batches/:id', requireRole(...PAY_READ), ctrl.getBatchDetail);
router.patch('/batches/:id/approve', requireRole(...PAY_WRITE), ctrl.approveBatch);
router.patch('/batches/:id/pay', requireRole(...PAY_WRITE), ctrl.payBatch);
router.delete('/batches/:id', requireRole(...PAY_WRITE), ctrl.deleteBatch);

export default router;
