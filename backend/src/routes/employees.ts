import { Router } from 'express';
import * as employeeController from '../controllers/employeeController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const HR_WRITE = CAP.hrWrite;
const HR_READ = CAP.hrRead;

router.post('/', authenticate, requireRole(...HR_WRITE), employeeController.createEmployee);
router.get('/', authenticate, requireRole(...HR_READ), employeeController.listEmployees);
router.get('/:id', authenticate, requireRole(...HR_READ), employeeController.getEmployee);
router.patch('/:id', authenticate, requireRole(...HR_WRITE), employeeController.updateEmployee);
router.delete('/:id', authenticate, requireRole(...HR_WRITE), employeeController.deleteEmployee);

export default router;
