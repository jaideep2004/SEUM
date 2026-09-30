import { Router, Request, Response, NextFunction } from 'express';
import * as gpsController from '../controllers/gpsController';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

const TRACK_READ = CAP.trackingRead;
const TRACK_WRITE = CAP.trackingWrite;

// ─── Tiny in-memory rate limiter for device ingestion (no new deps).
// Max 300 requests/min per key (device_id or IP). Lazy sweep, no timers
// (safe under jest/supertest — no open handles).
const ingestBuckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

export function ingestRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = String((req.body as any)?.deviceId || req.headers['x-device-key'] || req.ip || 'unknown');
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, v] of ingestBuckets) {
      if (v.resetAt <= now) ingestBuckets.delete(k);
    }
  }
  const bucket = ingestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    ingestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > 300) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Ingest rate limit exceeded (300/min). Try again in ${Math.ceil((bucket.resetAt - now) / 1000)}s.`,
      },
    });
  }
  return next();
}

/** Test-only: reset the ingest rate limiter. */
export function _resetIngestRateLimit(): void {
  ingestBuckets.clear();
  lastSweep = Date.now();
}

/**
 * GPS device auth: hardware posts with header `x-device-key: <GPS_INGEST_KEY>`
 * plus `tenantId` in the body (no JWT). Everything else uses normal JWT auth.
 *
 * Documented contract:
 *   - Fleet hardware → POST /api/gps/ingest with x-device-key + tenantId in body.
 *   - Dashboard/users → same endpoint with Bearer JWT (tenant from token).
 */
export function authenticateDeviceOrUser(req: Request, res: Response, next: NextFunction) {
  const deviceKey = req.headers['x-device-key'];
  const expected = process.env.GPS_INGEST_KEY;
  if (typeof deviceKey === 'string' && deviceKey.length > 0 && expected && deviceKey === expected) {
    const tenantId = (req.body as any)?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Device requests must include tenantId in the body' },
      });
    }
    (req as any).deviceTenantId = tenantId;
    return next();
  }
  return authenticate(req, res, next);
}

// ─── 9.3 Ingestion (devices via key, users via JWT) ───
router.post('/ingest', ingestRateLimit, authenticateDeviceOrUser, gpsController.ingest);

// ─── 9.3 Reads (fleet/ops roles) ───
router.get('/current-positions', authenticate, requireRole(...TRACK_READ), gpsController.currentPositions);
router.get('/trip-history', authenticate, requireRole(...TRACK_READ), gpsController.tripHistory);

// ─── 9.4 Geofences ───
router.post('/geofences', authenticate, requireRole(...TRACK_WRITE), gpsController.createGeofence);
router.get('/geofences', authenticate, requireRole(...TRACK_READ), gpsController.listGeofences);
router.patch('/geofences/:id', authenticate, requireRole(...TRACK_WRITE), gpsController.updateGeofence);
router.delete('/geofences/:id', authenticate, requireRole(...TRACK_WRITE), gpsController.deleteGeofence);

// ─── 9.5 + 9.7 Route settings & corridor ───
router.get('/route-settings/:routeId', authenticate, requireRole(...TRACK_READ), gpsController.getRouteSettings);
router.patch('/route-settings/:routeId', authenticate, requireRole(...TRACK_WRITE), gpsController.updateRouteSettings);
router.post('/route-corridor/:routeId', authenticate, requireRole(...TRACK_WRITE), gpsController.setRouteCorridor);
router.get('/route-corridor/:routeId', authenticate, requireRole(...TRACK_READ), gpsController.getRouteCorridor);

// ─── 9.7 Speed thresholds + report ───
router.post('/bus-thresholds', authenticate, requireRole(...TRACK_WRITE), gpsController.setBusSpeedThreshold);
router.get('/bus-thresholds', authenticate, requireRole(...TRACK_READ), gpsController.listBusSpeedThresholds);
router.get('/overspeed-report', authenticate, requireRole(...TRACK_READ), gpsController.overspeedReport);

export default router;
