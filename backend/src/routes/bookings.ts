import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as bookingController from '../controllers/bookingController';

const router = Router();

const BOOKING_WRITE = ['super_admin', 'company_admin', 'operations_manager', 'customer_service'];
const BOOKING_READ = [...BOOKING_WRITE, 'finance_accountant', 'executive'];

router.get('/trips/:tripId/availability', authenticate, requireRole(...BOOKING_READ), bookingController.getTripAvailability);
router.get('/dashboard', authenticate, requireRole(...BOOKING_READ), bookingController.getBookingDashboard);
router.get('/waitlist', authenticate, requireRole(...BOOKING_READ), bookingController.listWaitlist);
router.post('/waitlist', authenticate, requireRole(...BOOKING_WRITE), bookingController.joinWaitlist);
router.post('/waitlist/expire-offers', authenticate, requireRole(...BOOKING_WRITE), bookingController.expireWaitlistOffers);
router.delete('/waitlist/:id', authenticate, requireRole(...BOOKING_WRITE), bookingController.removeWaitlistEntry);
router.post('/', authenticate, requireRole(...BOOKING_WRITE), bookingController.createBooking);
router.get('/', authenticate, requireRole(...BOOKING_READ), bookingController.listBookings);
router.get('/:id', authenticate, requireRole(...BOOKING_READ), bookingController.getBooking);
router.get('/:id/ticket', authenticate, requireRole(...BOOKING_READ), bookingController.downloadBookingTicket);
router.patch('/:id', authenticate, requireRole(...BOOKING_WRITE), bookingController.updateBooking);
router.post('/:id/confirm', authenticate, requireRole(...BOOKING_WRITE), bookingController.confirmBooking);
router.post('/:id/cancel', authenticate, requireRole(...BOOKING_WRITE), bookingController.cancelBooking);
router.post('/:id/refund', authenticate, requireRole(...BOOKING_WRITE), bookingController.refundBooking);
router.get('/:id/communications', authenticate, requireRole(...BOOKING_READ), bookingController.listCommunications);
router.post('/:id/communications/resend', authenticate, requireRole(...BOOKING_WRITE), bookingController.resendCommunication);
router.post('/trips/:tripId/delay-alert', authenticate, requireRole(...BOOKING_WRITE), bookingController.sendTripDelayAlert);

export default router;