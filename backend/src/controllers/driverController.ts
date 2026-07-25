import { Request, Response, NextFunction } from 'express';
import * as driverService from '../services/driverService';
import { createDriverSchema, updateDriverSchema, listDriversQuerySchema, createDriverDocSchema } from '../validators/drivers';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AppError } from '../utils/errors';

export async function createDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createDriverSchema.parse(req.body);
    const driver = await driverService.createDriver(req.user!.tenantId, req.user!.id, data);
    return sendSuccess(res, driver, 'Driver created successfully', undefined, 201);
  } catch (err) { next(err); }
}

export async function listDrivers(req: Request, res: Response, next: NextFunction) {
  try {
    const queryParams = listDriversQuerySchema.parse(req.query);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await driverService.listDrivers(req.user!.tenantId, queryParams, isSuperAdmin);
    return sendPaginated(res, result.data, result.meta.total, queryParams.page, queryParams.pageSize, 'Drivers retrieved');
  } catch (err) { next(err); }
}

export async function getDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const driver = await driverService.getDriverById(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, driver, 'Driver retrieved');
  } catch (err) { next(err); }
}

export async function updateDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateDriverSchema.parse(req.body);
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const driver = await driverService.updateDriver(req.user!.tenantId, req.params.id, data, isSuperAdmin);
    return sendSuccess(res, driver, 'Driver updated');
  } catch (err) { next(err); }
}

export async function deleteDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await driverService.softDeleteDriver(req.user!.tenantId, req.params.id, isSuperAdmin);
    return sendSuccess(res, result, 'Driver deactivated');
  } catch (err) { next(err); }
}

export async function uploadPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const fileUrl = `/uploads/${req.file.filename}`;
    const isSuperAdmin = req.user!.roles.includes('super_admin');
    const result = await driverService.uploadDriverPhoto(req.user!.tenantId, req.params.id, fileUrl, isSuperAdmin);
    return sendSuccess(res, result, 'Photo uploaded');
  } catch (err) { next(err); }
}

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createDriverDocSchema.parse(req.body);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const doc = await driverService.createDriverDocument(req.user!.tenantId, req.params.id, data, fileUrl);
    return sendSuccess(res, doc, 'Document added', undefined, 201);
  } catch (err) { next(err); }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const docs = await driverService.listDriverDocuments(req.user!.tenantId, req.params.id);
    return sendSuccess(res, docs, 'Documents retrieved');
  } catch (err) { next(err); }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await driverService.deleteDriverDocument(req.user!.tenantId, req.params.id, req.params.docId);
    return sendSuccess(res, result, 'Document deleted');
  } catch (err) { next(err); }
}

export async function getExpiringLicenses(req: Request, res: Response, next: NextFunction) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const drivers = await driverService.getExpiringLicenses(req.user!.tenantId, days);
    return sendSuccess(res, drivers, 'Expiring licenses retrieved');
  } catch (err) { next(err); }
}

export async function getExpiringMedical(req: Request, res: Response, next: NextFunction) {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const drivers = await driverService.getExpiringMedicalFitness(req.user!.tenantId, days);
    return sendSuccess(res, drivers, 'Expiring medical fitness retrieved');
  } catch (err) { next(err); }
}
