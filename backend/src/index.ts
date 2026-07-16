import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

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

app.use(errorHandler);

// Only listen directly when NOT on Vercel serverless
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    logger.info({ port: config.port }, `SEUM API running on http://localhost:${config.port}`);
  });
}

export default app;
