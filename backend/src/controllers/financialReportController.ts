import { Request, Response } from 'express';
import * as reportService from '../services/financialReportService';
import { query } from '../db';

export async function getProfitLoss(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.profitLoss(req.tenantId, start_date as string, end_date as string);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getBalanceSheet(req: Request, res: Response) {
  try {
    const { as_of_date } = req.query;
    const data = await reportService.balanceSheet(req.tenantId, (as_of_date as string) || new Date().toISOString().split('T')[0]);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getArAging(req: Request, res: Response) {
  try {
    const { as_of_date } = req.query;
    const data = await reportService.arAging(req.tenantId, (as_of_date as string) || new Date().toISOString().split('T')[0]);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getApAging(req: Request, res: Response) {
  try {
    const { as_of_date } = req.query;
    const data = await reportService.apAging(req.tenantId, (as_of_date as string) || new Date().toISOString().split('T')[0]);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getCashFlow(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.cashFlow(req.tenantId, start_date as string, end_date as string);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getExpenseByCategory(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.expenseByCategory(req.tenantId, start_date as string, end_date as string);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getRevenueByRoute(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.revenueByRoute(req.tenantId, start_date as string, end_date as string);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getRevenueByBus(req: Request, res: Response) {
  try {
    const { start_date, end_date } = req.query;
    const data = await reportService.revenueByBus(req.tenantId, start_date as string, end_date as string);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function exportReport(req: Request, res: Response) {
  try {
    const { report_type, format } = req.params;
    const allowed = ['profit-loss','balance-sheet','ar-aging','ap-aging','cash-flow','expense-category','revenue-route','revenue-bus'];
    if (!allowed.includes(report_type)) {
      return res.status(400).json({ success: false, error: 'Invalid report type' });
    }

    if (format === 'pdf') {
      const buf = await reportService.generatePdf(req.tenantId, report_type, req.query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type}-${Date.now()}.pdf"`);
      res.send(buf);
    } else if (format === 'csv') {
      const csv = await reportService.generateCsv(req.tenantId, report_type, req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({ success: false, error: 'Format must be pdf or csv' });
    }
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

// ─── Report Schedule CRUD ───

export async function listSchedules(req: Request, res: Response) {
  try {
    const rows = await query(
      `SELECT * FROM report_schedules WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [req.tenantId],
    );
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function createSchedule(req: Request, res: Response) {
  try {
    const { report_type, frequency, format, recipients } = req.body;
    if (!report_type || !frequency) {
      return res.status(400).json({ success: false, error: 'report_type and frequency are required' });
    }
    const row = await query(
      `INSERT INTO report_schedules (tenant_id, report_type, frequency, format, recipients, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.tenantId, report_type, frequency, format || 'pdf', recipients || [], req.userId],
    );
    res.status(201).json({ success: true, data: row[0] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function deleteSchedule(req: Request, res: Response) {
  try {
    await query(
      `DELETE FROM report_schedules WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId],
    );
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}
