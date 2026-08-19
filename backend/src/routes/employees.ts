import { Router } from 'express';
import * as employeeController from '../controllers/employeeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const HR_WRITE = ['super_admin', 'company_admin', 'hr_manager'];
const HR_READ = [...HR_WRITE, 'operations_manager', 'finance_accountant'];

router.post('/', authenticate, requireRole(...HR_WRITE), employeeController.createEmployee);
router.get('/', authenticate, requireRole(...HR_READ), employeeController.listEmployees);
router.get('/:id', authenticate, requireRole(...HR_READ), employeeController.getEmployee);
router.patch('/:id', authenticate, requireRole(...HR_WRITE), employeeController.updateEmployee);
router.delete('/:id', authenticate, requireRole(...HR_WRITE), employeeController.deleteEmployee);

export default router;
