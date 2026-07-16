import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv !== 'production' && !process.env.VERCEL ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});
