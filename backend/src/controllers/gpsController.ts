import { Request, Response, NextFunction } from 'express';
import * as gpsService from '../services/gpsService';
import {
  ingestPositionSchema, tripHistoryQuerySchema, overspeedReportQuerySchema,
  createGeofenceSchema, updateGeofenceSchema,
  routeSettingsSchema, routeCorridorSchema, busSpeedThresholdSchema,
} from '../validators/gps';
import { sendSuccess } from '../utils/response';

function tenantOf(req: Request): string {
  // Device-key path sets req.deviceTenantId; JWT path uses req.user.
  return (req as any).deviceTenantId || req.user!.tenantId;
}

export async function ingest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = ingestPositionSchema.parse(req.body);
    const tenantId = (req as any).deviceTenantId || data.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant context required (JWT or device key + tenantId)' },
      });
    }
    const position = await gpsService.ingestPosition(tenantId, {
      busId: data.busId,
      deviceId: data.deviceId,
      latitude: data.latitude,
      longitude: data.longitude,
      speedKmh: data.speedKmh ?? null,
      heading: data.heading ?? null,
      altitude: data.altitude ?? null,
      recordedAt: data.recordedAt,
      ignitionStatus: data.ignitionStatus ?? null,
      odometerReading: data.odometerReading ?? null,
    });
    return sendSuccess(res, position, 'Position ingested', undefined, 201);
  } catch (err) { next(err); }
}

export async function currentPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gpsService.getCurrentPositions(tenantOf(req));
    return sendSuccess(res, data, 'Current positions retrieved');
  } catch (err) { next(err); }
}

export async function tripHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const q = tripHistoryQuerySchema.parse(req.query);
    const data = await gpsService.getTripHistory(tenantOf(req), q.tripId, { from: q.from, to: q.to, limit: q.limit });
    return sendSuccess(res, data, 'Trip history retrieved');
  } catch (err) { next(err); }
}

export async function overspeedReport(req: Request, res: Response, next: NextFunction) {
  try {
    const q = overspeedReportQuerySchema.parse(req.query);
    const data = await gpsService.getOverspeedReport(tenantOf(req), q);
    return sendSuccess(res, data, 'Overspeed report retrieved');
  } catch (err) { next(err); }
}

export async function createGeofence(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createGeofenceSchema.parse(req.body);
    const fence = await gpsService.createGeofence(tenantOf(req), {
      name: data.name,
      type: data.type,
      coordinates: data.coordinates ?? null,
      centerLat: data.centerLat ?? null,
      centerLng: data.centerLng ?? null,
      radiusMeters: data.radiusMeters ?? null,
      rules: data.rules ?? {},
      isActive: data.isActive ?? true,
    });
    return sendSuccess(res, fence, 'Geofence created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listGeofences(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gpsService.listGeofences(tenantOf(req));
    return sendSuccess(res, data, 'Geofences retrieved');
  } catch (err) { next(err); }
}

export async function updateGeofence(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateGeofenceSchema.parse(req.body);
    const fence = await gpsService.updateGeofence(tenantOf(req), req.params.id, {
      name: data.name,
      type: data.type,
      coordinates: data.coordinates ?? undefined,
      centerLat: data.centerLat ?? undefined,
      centerLng: data.centerLng ?? undefined,
      radiusMeters: data.radiusMeters ?? undefined,
      rules: data.rules,
      isActive: data.isActive,
    });
    return sendSuccess(res, fence, 'Geofence updated');
  } catch (err) { next(err); }
}

export async function deleteGeofence(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await gpsService.deleteGeofence(tenantOf(req), req.params.id);
    return sendSuccess(res, result, 'Geofence deleted');
  } catch (err) { next(err); }
}

export async function getRouteSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gpsService.getRouteSettings(tenantOf(req), req.params.routeId);
    return sendSuccess(res, data, 'Route settings retrieved');
  } catch (err) { next(err); }
}

export async function updateRouteSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = routeSettingsSchema.parse(req.body);
    const settings = await gpsService.updateRouteSettings(tenantOf(req), req.params.routeId, data);
    return sendSuccess(res, settings, 'Route settings updated');
  } catch (err) { next(err); }
}

export async function setRouteCorridor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = routeCorridorSchema.parse(req.body);
    const result = await gpsService.setRouteCorridor(tenantOf(req), req.params.routeId, data.corridor);
    return sendSuccess(res, result, 'Route corridor saved');
  } catch (err) { next(err); }
}

export async function getRouteCorridor(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await gpsService.getRouteCorridor(tenantOf(req), req.params.routeId);
    return sendSuccess(res, result, 'Route corridor retrieved');
  } catch (err) { next(err); }
}

export async function setBusSpeedThreshold(req: Request, res: Response, next: NextFunction) {
  try {
    const data = busSpeedThresholdSchema.parse(req.body);
    const result = await gpsService.setBusSpeedThreshold(tenantOf(req), data.busId, data.thresholdKmh);
    return sendSuccess(res, result, 'Bus speed threshold saved');
  } catch (err) { next(err); }
}

export async function listBusSpeedThresholds(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gpsService.listBusSpeedThresholds(tenantOf(req));
    return sendSuccess(res, data, 'Bus speed thresholds retrieved');
  } catch (err) { next(err); }
}
