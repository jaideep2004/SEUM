import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as invoiceController from '../controllers/invoiceController';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(...CAP.financeWrite), invoiceController.create);
router.get('/', requireRole(...CAP.financeRead), invoiceController.list);
router.get('/:id', requireRole(...CAP.financeRead), invoiceController.detail);
router.patch('/:id', requireRole(...CAP.financeWrite), invoiceController.update);
router.post('/:id/issue', requireRole(...CAP.financeWrite), invoiceController.issue);
router.post('/:id/pay', requireRole(...CAP.financeWrite), invoiceController.pay);
router.post('/:id/cancel', requireRole(...CAP.financeWrite), invoiceController.cancel);
router.post('/:id/refund', requireRole(...CAP.financeWrite), invoiceController.refund);
router.get('/:id/pdf', requireRole(...CAP.financeRead), invoiceController.downloadPdf);
router.post('/:id/send', requireRole(...CAP.financeWrite), invoiceController.send);

export default router;
