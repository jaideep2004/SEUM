import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as ctrl from '../controllers/financialReportController';

const FIN_READ = CAP.financeRead;
const FIN_WRITE = CAP.financeWrite;

const router = Router();
router.use(authenticate);

// Data endpoints
router.get('/profit-loss', requireRole(...FIN_READ), ctrl.getProfitLoss);
router.get('/balance-sheet', requireRole(...FIN_READ), ctrl.getBalanceSheet);
router.get('/ar-aging', requireRole(...FIN_READ), ctrl.getArAging);
router.get('/ap-aging', requireRole(...FIN_READ), ctrl.getApAging);
router.get('/cash-flow', requireRole(...FIN_READ), ctrl.getCashFlow);
router.get('/expense-category', requireRole(...FIN_READ), ctrl.getExpenseByCategory);
router.get('/revenue-route', requireRole(...FIN_READ), ctrl.getRevenueByRoute);
router.get('/revenue-bus', requireRole(...FIN_READ), ctrl.getRevenueByBus);

// Export
router.get('/export/:report_type/:format', requireRole(...FIN_READ), ctrl.exportReport);

// Scheduled reports
router.get('/schedules', requireRole(...FIN_READ), ctrl.listSchedules);
router.post('/schedules', requireRole(...FIN_WRITE), ctrl.createSchedule);
router.delete('/schedules/:id', requireRole(...FIN_WRITE), ctrl.deleteSchedule);

export default router;
