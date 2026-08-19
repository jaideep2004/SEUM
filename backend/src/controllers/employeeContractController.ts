import { Request, Response, NextFunction } from 'express';
import * as contractService from '../services/employeeContractService';
import {
  createContractSchema, updateContractSchema, listContractsQuerySchema,
  createDocumentSchema, updateDocumentSchema, listDocumentsQuerySchema,
  expiryAlertsQuerySchema,
} from '../validators/employeeContracts';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function createContract(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createContractSchema.parse(req.body);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const result = await contractService.createContract(req.user!.tenantId, req.user!.id, input, fileUrl);
    sendSuccess(res, result, 'Contract created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listContracts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listContractsQuerySchema.parse(req.query);
    const result = await contractService.listContracts(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Contracts fetched');
  } catch (err) { next(err); }
}

export async function getContract(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.getContractById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Contract fetched');
  } catch (err) { next(err); }
}

export async function updateContract(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateContractSchema.parse(req.body);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const result = await contractService.updateContract(req.user!.tenantId, req.params.id, input, fileUrl);
    sendSuccess(res, result, 'Contract updated');
  } catch (err) { next(err); }
}

export async function deleteContract(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.deleteContract(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Contract deleted');
  } catch (err) { next(err); }
}

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDocumentSchema.parse(req.body);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const result = await contractService.createDocument(req.user!.tenantId, req.user!.id, input, fileUrl);
    sendSuccess(res, result, 'Document created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listDocumentsQuerySchema.parse(req.query);
    const result = await contractService.listDocuments(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Documents fetched');
  } catch (err) { next(err); }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDocumentSchema.parse(req.body);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const result = await contractService.updateDocument(req.user!.tenantId, req.params.id, input, fileUrl);
    sendSuccess(res, result, 'Document updated');
  } catch (err) { next(err); }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await contractService.deleteDocument(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Document deleted');
  } catch (err) { next(err); }
}

export async function expiryAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = expiryAlertsQuerySchema.parse(req.query);
    const result = await contractService.getExpiryAlerts(req.user!.tenantId, days);
    sendSuccess(res, result, 'Expiry alerts fetched');
  } catch (err) { next(err); }
}