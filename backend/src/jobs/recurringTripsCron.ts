import { config } from '../config';
import { logger } from '../utils/logger';
import { autoGenerateUpcomingTrips } from '../services/recurringTripService';

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Single execution of the auto-generation job.
 * Tenant-scoped via service, idempotent, honours frequency/days_of_week.
 * Guarded against overlapping runs.
 */
export async function runRecurringTripsAutoGenerate(): Promise<void> {
  if (isRunning) {
    logger.warn('Recurring trips auto-generation already running — skipping');
    return;
  }
  isRunning = true;
  try {
    logger.info('Running recurring trips auto-generation job');
    const windowDays = config.recurringTripsCron.windowDays;
    const result = await autoGenerateUpcomingTrips({ windowDays });
    logger.info(
      { window: result.window, totalPatterns: result.totalPatterns, generatedTotal: result.generatedTotal },
      'Recurring trips auto-generation job complete',
    );
  } catch (err) {
    logger.error({ err }, 'Recurring trips auto-generation job failed');
  } finally {
    isRunning = false;
  }
}

/**
 * Schedule the job to run periodically.
 * - Enabled by default; set RECURRING_TRIPS_AUTO_GENERATE=false to disable.
 * - Interval via RECURRING_TRIPS_CRON_INTERVAL_MS (default daily 86400000ms).
 * - Window via RECURRING_TRIPS_WINDOW_DAYS (default 14 days).
 * Runs once on startup (after 10s delay) then on interval. On Vercel serverless this should not run.
 */
export function scheduleRecurringTripsCron(): void {
  if (!config.recurringTripsCron.enabled) {
    logger.info('Recurring trips auto-generation cron disabled via config');
    return;
  }
  if (intervalHandle) {
    logger.warn('Recurring trips cron already scheduled');
    return;
  }

  const intervalMs = config.recurringTripsCron.intervalMs;
  const windowDays = config.recurringTripsCron.windowDays;

  logger.info({ intervalMs, windowDays }, 'Recurring trips auto-generation cron scheduled');

  // Initial run after short delay so DB pool is ready and doesn't block server startup
  setTimeout(() => {
    runRecurringTripsAutoGenerate().catch((err) => logger.error({ err }, 'Initial recurring trips job failed'));
  }, 10_000);

  intervalHandle = setInterval(() => {
    runRecurringTripsAutoGenerate().catch((err) => logger.error({ err }, 'Recurring trips cron run failed'));
  }, intervalMs);

  // Allow process to exit cleanly if this is the only handle remaining
  if (typeof (intervalHandle as any).unref === 'function') {
    (intervalHandle as any).unref();
  }
}

export function stopRecurringTripsCron(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Recurring trips auto-generation cron stopped');
  }
}
