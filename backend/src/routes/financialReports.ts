import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/financialReportController';

const router = Router();
router.use(authenticate);

// Data endpoints
router.get('/profit-loss', ctrl.getProfitLoss);
router.get('/balance-sheet', ctrl.getBalanceSheet);
router.get('/ar-aging', ctrl.getArAging);
router.get('/ap-aging', ctrl.getApAging);
router.get('/cash-flow', ctrl.getCashFlow);
router.get('/expense-category', ctrl.getExpenseByCategory);
router.get('/revenue-route', ctrl.getRevenueByRoute);
router.get('/revenue-bus', ctrl.getRevenueByBus);

// Export
router.get('/export/:report_type/:format', ctrl.exportReport);

// Scheduled reports
router.get('/schedules', ctrl.listSchedules);
router.post('/schedules', ctrl.createSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

export default router;
