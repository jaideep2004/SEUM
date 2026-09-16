import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import * as bookingController from '../controllers/bookingController';

const router = Router();

const BOOKING_WRITE = ['super_admin', 'company_admin', 'operations_manager', 'customer_service'];
const BOOKING_READ = [...BOOKING_WRITE, 'finance_accountant', 'executive'];
const SUPERVISOR_ROLES = ['super_admin', 'company_admin', 'operations_manager'];
// Planning queue access
const PLANNING_ROLES = ['super_admin', 'company_admin', 'operations_manager', 'fleet_manager'];

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.mimetype === 'application/vnd.ms-excel'
      || file.originalname.toLowerCase().endsWith('.xlsx')
      || file.originalname.toLowerCase().endsWith('.xls');
    // Accept but controller will validate extension; multer filter permissive
    cb(null, true);
  },
});

router.get('/import/template', authenticate, requireRole(...BOOKING_READ), bookingController.downloadImportTemplate);
router.post('/import', authenticate, requireRole(...BOOKING_WRITE), importUpload.single('file'), bookingController.importBookings);

router.get('/trips/:tripId/availability', authenticate, requireRole(...BOOKING_READ), bookingController.getTripAvailability);
router.get('/dashboard', authenticate, requireRole(...BOOKING_READ), bookingController.getBookingDashboard);
router.get('/waitlist', authenticate, requireRole(...BOOKING_READ), bookingController.listWaitlist);
router.post('/waitlist', authenticate, requireRole(...BOOKING_WRITE), bookingController.joinWaitlist);
router.post('/waitlist/expire-offers', authenticate, requireRole(...BOOKING_WRITE), bookingController.expireWaitlistOffers);
router.delete('/waitlist/:id', authenticate, requireRole(...BOOKING_WRITE), bookingController.removeWaitlistEntry);
router.post('/', authenticate, requireRole(...BOOKING_WRITE), bookingController.createBooking);
router.get('/', authenticate, requireRole(...BOOKING_READ), bookingController.listBookings);
router.get('/:id', authenticate, requireRole(...BOOKING_READ), bookingController.getBooking);
router.get('/:id/history', authenticate, requireRole(...BOOKING_READ), bookingController.getBookingHistory);
router.get('/:id/ticket', authenticate, requireRole(...BOOKING_READ), bookingController.downloadBookingTicket);
router.patch('/:id', authenticate, requireRole(...BOOKING_WRITE), bookingController.updateBooking);

// Approval workflow — Phase 7.6
router.post('/:id/submit', authenticate, requireRole(...BOOKING_WRITE), bookingController.submitBooking);
router.post('/:id/approve', authenticate, requireRole(...SUPERVISOR_ROLES), bookingController.approveBooking);
router.post('/:id/reject', authenticate, requireRole(...SUPERVISOR_ROLES), bookingController.rejectBooking);

router.post('/:id/confirm', authenticate, requireRole(...BOOKING_WRITE), bookingController.confirmBooking);
router.post('/:id/cancel', authenticate, requireRole(...BOOKING_WRITE), bookingController.cancelBooking);
router.post('/:id/refund', authenticate, requireRole(...BOOKING_WRITE), bookingController.refundBooking);
router.get('/:id/communications', authenticate, requireRole(...BOOKING_READ), bookingController.listCommunications);
router.post('/:id/communications/resend', authenticate, requireRole(...BOOKING_WRITE), bookingController.resendCommunication);
router.post('/trips/:tripId/delay-alert', authenticate, requireRole(...BOOKING_WRITE), bookingController.sendTripDelayAlert);

export default router;
