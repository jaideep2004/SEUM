import { Request, Response, NextFunction } from 'express';
import * as journalService from '../services/journalEntryService';
import { createJournalEntrySchema, listJournalEntriesSchema } from '../validators/journalEntries';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createJournalEntrySchema.parse(req.body);
    const result = await journalService.createJournalEntry(req.user!.tenantId, {
      date: input.date, description: input.description,
      referenceType: input.reference_type, referenceId: input.reference_id,
      lines: input.lines.map(l => ({
        accountId: l.account_id, debitAmount: l.debit_amount,
        creditAmount: l.credit_amount, description: l.description,
      })),
    }, req.user!.id);
    sendSuccess(res, result, 'Journal entry created', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listJournalEntriesSchema.parse(req.query);
    const result = await journalService.listJournalEntries(req.user!.tenantId, {
      status: query.status, startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Journal entries fetched');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await journalService.getJournalEntryDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Journal entry detail fetched');
  } catch (err) { next(err); }
}

export async function post(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await journalService.postJournalEntry(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Journal entry posted');
  } catch (err) { next(err); }
}
