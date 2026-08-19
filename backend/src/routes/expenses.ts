import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import * as expenseController from '../controllers/expenseController';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(authenticate);

router.post('/', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), expenseController.create);
router.get('/', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), expenseController.list);
router.get('/:id', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), expenseController.detail);
router.patch('/:id/approve', requireRole('super_admin', 'company_admin', 'finance_accountant'), expenseController.approve);
router.patch('/:id/reimburse', requireRole('super_admin', 'company_admin', 'finance_accountant'), expenseController.reimburse);
router.post('/:id/receipt', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), upload.single('receipt'), expenseController.uploadReceipt);

export default router;
