import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';
import auditRoutes from './routes/audit';
import userRoutes from './routes/users';
import fleetRoutes from './routes/fleet';
import notificationRoutes from './routes/notifications';
import operationsRoutes from './routes/operations';
import subscriptionPlanRoutes from './routes/subscriptionPlans';
import driverRoutes from './routes/drivers';
import driverAttendanceRoutes from './routes/driverAttendance';
import driverLeaveRoutes from './routes/driverLeaves';
import driverViolationRoutes from './routes/driverViolations';
import driverScoreRoutes from './routes/driverScores';
import driverPayrollRoutes from './routes/driverPayroll';
import accountRoutes from './routes/accounts';
import journalEntryRoutes from './routes/journalEntries';
import invoiceRoutes from './routes/invoices';
import expenseRoutes from './routes/expenses';
import tripProfitabilityRoutes from './routes/tripProfitability';
import financialReportRoutes from './routes/financialReports';
import payrollRoutes from './routes/payroll';
import bankReconciliationRoutes from './routes/bankReconciliation';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'incoming request');
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'SEUM API is running', data: { timestamp: new Date().toISOString() } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/fleet', fleetRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/operations', operationsRoutes);
app.use('/api/v1/subscription-plans', subscriptionPlanRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/drivers/attendance', driverAttendanceRoutes);
app.use('/api/v1/drivers/leaves', driverLeaveRoutes);
app.use('/api/v1/drivers/violations', driverViolationRoutes);
app.use('/api/v1/drivers/scores', driverScoreRoutes);
app.use('/api/v1/drivers/payroll', driverPayrollRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/accounting/journal-entries', journalEntryRoutes);
app.use('/api/v1/accounting/invoices', invoiceRoutes);
app.use('/api/v1/accounting/expenses', expenseRoutes);
app.use('/api/v1/accounting/trip-profitability', tripProfitabilityRoutes);
app.use('/api/v1/accounting/reports', financialReportRoutes);
app.use('/api/v1/accounting/payroll', payrollRoutes);
app.use('/api/v1/accounting/banking', bankReconciliationRoutes);

app.use(errorHandler);

// Only listen directly when NOT on Vercel serverless
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    logger.info({ port: config.port }, `SEUM API running on http://localhost:${config.port}`);
  });
}

export default app;
