import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as payrollController from '../controllers/driverPayrollController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

router.post('/generate', authenticate, requireRole(...CAP.driverPayrollWrite), payrollController.generate);
router.get('/', authenticate, requireRole(...CAP.driverPayrollRead), payrollController.list);
router.get('/summary', authenticate, requireRole(...CAP.driverPayrollRead), payrollController.summary);
router.get('/:id', authenticate, requireRole(...CAP.driverPayrollRead), payrollController.detail);
router.patch('/:id/approve', authenticate, requireRole(...CAP.driverPayrollWrite), payrollController.approve);
router.patch('/:id/pay', authenticate, requireRole(...CAP.driverPayrollWrite), payrollController.pay);

export default router;
