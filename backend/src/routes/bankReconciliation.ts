import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/bankReconciliationController';

const router = Router();
router.use(authenticate);

// Bank accounts
router.post('/accounts', ctrl.createAccount);
router.get('/accounts', ctrl.listAccounts);
router.get('/accounts/:id', ctrl.getAccount);
router.patch('/accounts/:id', ctrl.updateAccount);

// Transactions
router.post('/accounts/:accountId/transactions', ctrl.importTransactions);
router.post('/accounts/:accountId/transactions/csv', ctrl.csvUpload, ctrl.importTransactions);
router.get('/accounts/:accountId/transactions', ctrl.listTransactions);

// Reconciliation
router.get('/reconciliation/unmatched', ctrl.getUnmatched);
router.post('/reconciliation/match', ctrl.matchTransaction);
router.post('/reconciliation/unmatch/:id', ctrl.unmatchTransaction);

export default router;
