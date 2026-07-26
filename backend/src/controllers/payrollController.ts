import { Request, Response } from 'express';
import * as payrollService from '../services/payrollService';

export async function createBatch(req: Request, res: Response) {
  try {
    const { period_start, period_end } = req.body;
    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, error: 'period_start and period_end are required' });
    }
    const data = await payrollService.createBatch(req.user!.tenantId, period_start, period_end, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}

export async function listBatches(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const data = await payrollService.listBatches(req.user!.tenantId, status as string | undefined);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getBatchDetail(req: Request, res: Response) {
  try {
    const data = await payrollService.getBatchDetail(req.user!.tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err.message === 'Payroll batch not found' ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function approveBatch(req: Request, res: Response) {
  try {
    const data = await payrollService.approveBatch(req.user!.tenantId, req.params.id, req.user!.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err.message === 'Payroll batch not found' ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function payBatch(req: Request, res: Response) {
  try {
    const data = await payrollService.payBatch(req.user!.tenantId, req.params.id, req.user!.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err.message === 'Payroll batch not found' ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deleteBatch(req: Request, res: Response) {
  try {
    const data = await payrollService.deleteBatch(req.user!.tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}
