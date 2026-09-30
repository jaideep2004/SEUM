import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as expenseController from '../controllers/expenseController';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(authenticate);

router.post('/', requireRole(...CAP.financeWrite), expenseController.create);
router.get('/', requireRole(...CAP.financeRead), expenseController.list);
router.get('/:id', requireRole(...CAP.financeRead), expenseController.detail);
router.patch('/:id/approve', requireRole(...CAP.financeWrite), expenseController.approve);
router.patch('/:id/reimburse', requireRole(...CAP.financeWrite), expenseController.reimburse);
router.post('/:id/receipt', requireRole(...CAP.financeWrite), upload.single('receipt'), expenseController.uploadReceipt);

export default router;
