import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as invoiceController from '../controllers/invoiceController';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.create);
router.get('/', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), invoiceController.list);
router.get('/:id', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), invoiceController.detail);
router.patch('/:id', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.update);
router.post('/:id/issue', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.issue);
router.post('/:id/pay', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.pay);
router.post('/:id/cancel', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.cancel);
router.post('/:id/refund', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.refund);
router.get('/:id/pdf', requireRole('super_admin', 'company_admin', 'finance_accountant', 'operations_manager'), invoiceController.downloadPdf);
router.post('/:id/send', requireRole('super_admin', 'company_admin', 'finance_accountant'), invoiceController.send);

export default router;
