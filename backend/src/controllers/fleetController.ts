import { Request, Response, NextFunction } from 'express';
import * as fleetService from '../services/fleetService';
import { createDocumentExpiryNotifications } from '../services/notificationService';
import { createBusSchema, updateBusSchema, listBusesQuerySchema, createDocumentSchema, updateDocumentSchema, updateReadinessSchema, readinessQuerySchema, createFuelLogSchema, fuelLogQuerySchema, createAssignmentSchema, updateAssignmentSchema, assignmentQuerySchema, calendarQuerySchema } from '../validators/fleet';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createBus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createBusSchema.parse(req.body);
    const bus = await fleetService.createBus(req.user!.tenantId, data);
    return sendSuccess(res, bus, 'Bus created successfully', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listBuses(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listBusesQuerySchema.parse(req.query);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await fleetService.listBuses(req.user!.tenantId, queryParams, isSuperAdmin);
    return sendPaginated(res, result.data, result.meta.total, queryParams.page, queryParams.pageSize, 'Buses retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getBus(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const bus = await fleetService.getBusById(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, bus, 'Bus retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateBus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateBusSchema.parse(req.body);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const bus = await fleetService.updateBus(req.user!.tenantId, req.params.id, data, isSuperAdmin);
    return sendSuccess(res, bus, 'Bus updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteBus(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const bus = await fleetService.softDeleteBus(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, bus, 'Bus deactivated');
  } catch (err) {
    next(err);
  }
}

export async function getBusHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const timeline = await fleetService.getBusHistory(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, timeline, 'Bus history retrieved');
  } catch (err) {
    next(err);
  }
}

// ─── Documents ───

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createDocumentSchema.parse(req.body);
    const doc = await fleetService.createDocument(req.params.id, req.user!.tenantId, data);
    return sendSuccess(res, doc, 'Document created', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await fleetService.listDocuments(req.params.id, req.user!.tenantId);
    return sendSuccess(res, docs, 'Documents retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await fleetService.getDocument(req.params.id, req.params.docId, req.user!.tenantId);
    return sendSuccess(res, doc, 'Document retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateDocumentSchema.parse(req.body);
    const doc = await fleetService.updateDocument(req.params.id, req.params.docId, req.user!.tenantId, data);
    return sendSuccess(res, doc, 'Document updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await fleetService.deleteDocument(req.params.id, req.params.docId, req.user!.tenantId);
    return sendSuccess(res, doc, 'Document deleted');
  } catch (err) {
    next(err);
  }
}

export async function getExpiringDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const docs = await fleetService.getExpiringDocuments(req.user!.tenantId, days);
    return sendSuccess(res, docs, 'Expiring documents retrieved');
  } catch (err) {
    next(err);
  }
}

export async function checkExpiryNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await createDocumentExpiryNotifications(req.user!.tenantId);
    return sendSuccess(res, { notificationsCreated: created }, 'Expiry check complete');
  } catch (err) {
    next(err);
  }
}

// ─── Readiness ───

export async function updateReadiness(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateReadinessSchema.parse(req.body);
    const readiness = await fleetService.updateReadiness(data.busId, req.user!.tenantId, req.user!.id, data);
    return sendSuccess(res, readiness, 'Readiness status updated');
  } catch (err) {
    next(err);
  }
}

export async function getReadiness(req: Request, res: Response, next: NextFunction) {
  try {
    const query = readinessQuerySchema.parse(req.query);
    const readiness = await fleetService.getReadiness(req.user!.tenantId, query.status);
    return sendSuccess(res, readiness, 'Readiness status retrieved');
  } catch (err) {
    next(err);
  }
}

// ─── Fuel Tracking ───

export async function createFuelLog(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createFuelLogSchema.parse(req.body);
    const log = await fleetService.createFuelLog(req.user!.tenantId, data);
    return sendSuccess(res, log, 'Fuel log created', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listFuelLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = fuelLogQuerySchema.parse(req.query);
    const result = await fleetService.listFuelLogs(req.user!.tenantId, query);
    return sendPaginated(res, result.data, result.meta.total, query.page, query.pageSize, 'Fuel logs retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getFuelAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const busId = req.query.busId as string | undefined;
    const analytics = await fleetService.getFuelAnalytics(req.user!.tenantId, busId);
    return sendSuccess(res, analytics, 'Fuel analytics retrieved');
  } catch (err) {
    next(err);
  }
}

export async function checkFuelEfficiency(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await fleetService.checkFuelEfficiencyDrop(req.user!.tenantId);
    return sendSuccess(res, result, 'Fuel efficiency check complete');
  } catch (err) {
    next(err);
  }
}

// ─── Assignments ───

export async function createAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createAssignmentSchema.parse(req.body);
    const assignment = await fleetService.createAssignment(req.user!.tenantId, req.user!.id, data);
    return sendSuccess(res, assignment, 'Assignment created', undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = assignmentQuerySchema.parse(req.query);
    const result = await fleetService.listAssignments(req.user!.tenantId, query);
    return sendPaginated(res, result.data, result.meta.total, query.page, query.pageSize, 'Assignments retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateAssignmentSchema.parse(req.body);
    const assignment = await fleetService.updateAssignment(req.user!.tenantId, req.params.id, data);
    return sendSuccess(res, assignment, 'Assignment updated');
  } catch (err) {
    next(err);
  }
}

export async function getCalendarData(req: Request, res: Response, next: NextFunction) {
  try {
    const query = calendarQuerySchema.parse(req.query);
    const data = await fleetService.getCalendarData(req.user!.tenantId, query.month, query.year, query.busId);
    return sendSuccess(res, data, 'Calendar data retrieved');
  } catch (err) {
    next(err);
  }
}
