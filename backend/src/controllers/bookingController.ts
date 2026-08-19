import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/bookingService';
import * as waitlistService from '../services/waitlistService';
import * as communicationService from '../services/customerCommunicationService';
import {
  createBookingSchema, updateBookingSchema, listBookingsQuerySchema, cancelBookingSchema,
  joinWaitlistSchema, listWaitlistQuerySchema,
} from '../validators/bookings';
import { sendSuccess, sendPaginated } from '../utils/response';

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