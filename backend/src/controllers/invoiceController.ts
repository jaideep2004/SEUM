import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoiceService';
import { createInvoiceSchema, updateInvoiceSchema, listInvoicesSchema, recordPaymentSchema } from '../validators/invoices';
import { sendSuccess, sendPaginated } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createInvoiceSchema.parse(req.body);
    const result = await invoiceService.createInvoice(req.user!.tenantId, {
      customer_name: input.customer_name, customer_contact: input.customer_contact,
      invoice_date: input.invoice_date, due_date: input.due_date,
      tax_amount: input.tax_amount, reference_trip_ids: input.reference_trip_ids,
      notes: input.notes, line_items: input.line_items,
    }, req.user!.id);
    sendSuccess(res, result, 'Invoice created', undefined, 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listInvoicesSchema.parse(req.query);
    const result = await invoiceService.listInvoices(req.user!.tenantId, {
      status: query.status, customer_name: query.customer_name,
      startDate: query.start_date, endDate: query.end_date,
      page: query.page, pageSize: query.pageSize,
    });
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Invoices fetched');
  } catch (err) { next(err); }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.getInvoiceDetail(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Invoice detail fetched');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateInvoiceSchema.parse(req.body);
    const result = await invoiceService.updateInvoice(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Invoice updated');
  } catch (err) { next(err); }
}

export async function issue(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.issueInvoice(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Invoice issued');
  } catch (err) { next(err); }
}

export async function pay(req: Request, res: Response, next: NextFunction) {
  try {
    const input = recordPaymentSchema.parse(req.body);
    const result = await invoiceService.recordPayment(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Payment recorded');
  } catch (err) { next(err); }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.cancelInvoice(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Invoice cancelled');
  } catch (err) { next(err); }
}

export async function refund(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.refundInvoice(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Invoice refunded');
  } catch (err) { next(err); }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const pdf = await invoiceService.generateInvoicePdf(req.user!.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

export async function send(req: Request, res: Response, next: NextFunction) {
  try {
    const channel = req.query.channel as string;
    if (!channel || !['email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ success: false, error: { message: 'channel must be email or whatsapp' } });
    }
    const result = await invoiceService.sendInvoice(req.user!.tenantId, req.params.id, channel as 'email' | 'whatsapp');
    sendSuccess(res, result, `Invoice sent via ${channel}`);
  } catch (err) { next(err); }
}
