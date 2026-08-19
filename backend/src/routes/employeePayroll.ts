import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as payrollController from '../controllers/employeePayrollController';

const router = Router();

const HR_WRITE = ['super_admin', 'company_admin', 'hr_manager', 'finance_accountant'];
const HR_READ = [...HR_WRITE, 'operations_manager'];

router.post('/salary-structures', authenticate, requireRole(...HR_WRITE), payrollController.upsertStructure);
router.get('/salary-structures', authenticate, requireRole(...HR_READ), payrollController.listStructures);
router.get('/salary-structures/:id', authenticate, requireRole(...HR_READ), payrollController.getStructure);
router.patch('/salary-structures/:id', authenticate, requireRole(...HR_WRITE), payrollController.updateStructure);

router.post('/generate', authenticate, requireRole(...HR_WRITE), payrollController.generate);
router.get('/', authenticate, requireRole(...HR_READ), payrollController.list);
router.get('/summary', authenticate, requireRole(...HR_READ), payrollController.summary);
router.get('/:id', authenticate, requireRole(...HR_READ), payrollController.detail);
router.patch('/:id/approve', authenticate, requireRole(...HR_WRITE), payrollController.approve);
router.patch('/:id/pay', authenticate, requireRole(...HR_WRITE), payrollController.pay);

export default router;
