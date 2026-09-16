import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/bookingService';
import * as waitlistService from '../services/waitlistService';
import * as communicationService from '../services/customerCommunicationService';
import {
  createBookingSchema, updateBookingSchema, listBookingsQuerySchema, cancelBookingSchema,
  rejectBookingSchema,
  joinWaitlistSchema, listWaitlistQuerySchema,
} from '../validators/bookings';
import { sendSuccess, sendPaginated } from '../utils/response';
import * as bookingImportService from '../services/bookingImportService';

export async function getTripAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.getTripAvailability(req.user!.tenantId, req.params.tripId);
    sendSuccess(res, result, 'Trip availability fetched');
  } catch (err) { next(err); }
}

export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBookingSchema.parse(req.body);
    const result = await bookingService.createBooking(req.user!.tenantId, input);
    sendSuccess(res, result, 'Booking created', undefined, 201);
  } catch (err) { next(err); }
}

export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listBookingsQuerySchema.parse(req.query);
    const result = await bookingService.listBookings(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Bookings fetched');
  } catch (err) { next(err); }
}

export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.getBookingById(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Booking fetched');
  } catch (err) { next(err); }
}

export async function updateBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateBookingSchema.parse(req.body);
    const result = await bookingService.updateBooking(req.user!.tenantId, req.params.id, input);
    sendSuccess(res, result, 'Booking updated');
  } catch (err) { next(err); }
}

export async function confirmBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.confirmBooking(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Booking confirmed');
  } catch (err) { next(err); }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const input = cancelBookingSchema.parse(req.body);
    const result = await bookingService.cancelBooking(req.user!.tenantId, req.params.id, input.reason);
    sendSuccess(res, result, 'Booking cancelled');
  } catch (err) { next(err); }
}

export async function refundBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.refundBooking(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Booking refunded');
  } catch (err) { next(err); }
}

// ─── Phase 7.6: approval workflow ───

export async function submitBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.submitBooking(req.user!.tenantId, req.params.id, req.user!.id);
    sendSuccess(res, result, 'Booking submitted for approval');
  } catch (err) { next(err); }
}

export async function approveBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.approveBooking(req.user!.tenantId, req.params.id, req.user!.id);
    sendSuccess(res, result, 'Booking approved');
  } catch (err) { next(err); }
}

export async function rejectBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const input = rejectBookingSchema.parse(req.body);
    const result = await bookingService.rejectBooking(req.user!.tenantId, req.params.id, input.reason, req.user!.id);
    sendSuccess(res, result, 'Booking rejected');
  } catch (err) { next(err); }
}

export async function getBookingHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.getBookingHistory(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Booking history fetched');
  } catch (err) { next(err); }
}

export async function downloadBookingTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const pdf = await bookingService.generateTicketPdf(req.user!.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

export async function getBookingDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.getBookingDashboard(req.user!.tenantId);
    sendSuccess(res, result, 'Booking dashboard fetched');
  } catch (err) { next(err); }
}

export async function joinWaitlist(req: Request, res: Response, next: NextFunction) {
  try {
    const input = joinWaitlistSchema.parse(req.body);
    const result = await waitlistService.joinWaitlist(req.user!.tenantId, input, req.user!.id);
    sendSuccess(res, result, 'Joined waitlist', undefined, 201);
  } catch (err) { next(err); }
}

export async function listWaitlist(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listWaitlistQuerySchema.parse(req.query);
    const result = await waitlistService.listWaitlist(req.user!.tenantId, query);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Waitlist fetched');
  } catch (err) { next(err); }
}

export async function expireWaitlistOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await waitlistService.expireOffers(req.user!.tenantId);
    sendSuccess(res, result, 'Expired stale waitlist offers');
  } catch (err) { next(err); }
}

export async function removeWaitlistEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await waitlistService.removeWaitlistEntry(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Waitlist entry removed');
  } catch (err) { next(err); }
}

export async function listCommunications(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await communicationService.listCommunications(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Communication log fetched');
  } catch (err) { next(err); }
}

export async function resendCommunication(req: Request, res: Response, next: NextFunction) {
  try {
    const type = (req.body?.type || '').toString();
    if (!['confirmation', 'receipt', 'reminder', 'cancellation', 'delay_alert'].includes(type)) {
      return sendSuccess(res, { sent: false, reason: 'unsupported' }, 'Unsupported communication type', undefined, 400);
    }
    const result = await communicationService.resendCommunication(req.user!.tenantId, req.params.id, type);
    sendSuccess(res, result, result.sent ? 'Communication sent' : 'Communication failed to send');
  } catch (err) { next(err); }
}

export async function sendTripDelayAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const delayMinutes = Number(req.body?.delay_minutes || 0);
    const reason = req.body?.delay_reason?.toString() || undefined;
    const result = await communicationService.sendTripDelayAlerts(
      req.user!.tenantId, req.params.tripId, delayMinutes, reason
    );
    sendSuccess(res, result, `Delay alert sent to ${result.sent} passenger(s)`);
  } catch (err) { next(err); }
}

// ─── Phase 7.7: Excel Import ───

export async function downloadImportTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const buf = bookingImportService.generateTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="seum-booking-import-template.xlsx"');
    res.setHeader('Content-Length', String(buf.length));
    res.send(buf);
  } catch (err) { next(err); }
}

export async function importBookings(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded — attach an .xlsx file as field "file"' } });
    }
    // Validate file extension / mimetype loosely
    const name = (req.file.originalname || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return res.status(400).json({ success: false, error: { message: 'Invalid file type — only .xlsx is accepted' } });
    }
    const result = await bookingImportService.importBookings(req.user!.tenantId, req.file.buffer, req.user!.id);
    if (!result.success) {
      // Fail-safe: validation errors — 422 with per-row errors, no bookings created
      return res.status(422).json({
        success: false,
        error: { message: 'Import validation failed — no bookings created', details: result.errors },
        data: result,
      });
    }
    sendSuccess(res, result, `Imported ${result.createdCount} booking(s) as pending approval`, undefined, 201);
  } catch (err) { next(err); }
}
