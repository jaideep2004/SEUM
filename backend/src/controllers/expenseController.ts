import { Request, Response, NextFunction } from 'express';
import * as expenseService from '../services/expenseService';
import { createExpenseSchema, listExpensesSchema } from '../validators/expenses';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createExpenseSchema.parse(req.body);
    const result = await expenseService.createExpense(req.user!.tenantId, input, req.user!.id);
    sendSuccess(res, result, 'Expense recorded', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listExpensesSchema.parse(req.query);
    const result = await expenseService.listExpenses(req.user!.tenantId, {
      expense_category: query.expense_category, status: query.status,
      bus_id: query.bus_id, driver_id: query.driver_id,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Expenses fetched');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await expenseService.getExpenseDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Expense detail fetched');
  } catch (err) { next(err); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await expenseService.approveExpense(req.user!.tenantId, req.params.id, req.user!.id);
    sendSuccess(res, result, 'Expense approved');
  } catch (err) { next(err); }
}

export async function reimburse(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await expenseService.reimburseExpense(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Expense reimbursed');
  } catch (err) { next(err); }
}

export async function uploadReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    const fileUrl = `/uploads/${req.file.filename}`;
    const result = await expenseService.attachReceipt(req.user!.tenantId, req.params.id, fileUrl);
    sendSuccess(res, result, 'Receipt uploaded');
  } catch (err) { next(err); }
}
