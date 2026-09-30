import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as ctrl from '../controllers/bankReconciliationController';

const FIN_READ = CAP.financeRead;
const FIN_WRITE = CAP.financeWrite;

const router = Router();
router.use(authenticate);

// Bank accounts
router.post('/accounts', requireRole(...FIN_WRITE), ctrl.createAccount);
router.get('/accounts', requireRole(...FIN_READ), ctrl.listAccounts);
router.get('/accounts/:id', requireRole(...FIN_READ), ctrl.getAccount);
router.patch('/accounts/:id', requireRole(...FIN_WRITE), ctrl.updateAccount);

// Transactions
router.post('/accounts/:accountId/transactions', requireRole(...FIN_WRITE), ctrl.importTransactions);
router.post('/accounts/:accountId/transactions/csv', requireRole(...FIN_WRITE), ctrl.csvUpload, ctrl.importTransactions);
router.get('/accounts/:accountId/transactions', requireRole(...FIN_READ), ctrl.listTransactions);

// Reconciliation
router.get('/reconciliation/unmatched', requireRole(...FIN_READ), ctrl.getUnmatched);
router.post('/reconciliation/match', requireRole(...FIN_WRITE), ctrl.matchTransaction);
router.post('/reconciliation/unmatch/:id', requireRole(...FIN_WRITE), ctrl.unmatchTransaction);

export default router;
