import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

jest.mock('../services/customerCommunicationService', () => ({
  sendBookingConfirmationEmail: () => Promise.resolve(undefined),
  sendPaymentReceipt: () => Promise.resolve(undefined),
  sendCancellationNotification: () => Promise.resolve(undefined),
}));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', CID = 'c1', TRIP = 'tr1';

const TRIP_CTX = {
  id: TRIP, tenant_id: TID, status: 'scheduled', scheduled_date: '2026-08-20',
  scheduled_start_time: '08:00:00', route_id: 'r1', bus_id: 'b1',
  route_name: 'Jeddah-Makkah', origin: 'Jeddah', destination: 'Makkah',
  capacity_seated: 50, capacity_standing: 0, plate_number: 'SEUM-100',
};

const BOOKING = {
  id: 'bk1', tenant_id: TID, customer_id: CID, trip_id: TRIP,
  booking_reference: 'BK-2026-0001', number_of_passengers: 2,
  seat_numbers: [5, 6], total_amount: '400.00', paid_amount: '200.00',
  balance: '200.00', status: 'pending', booking_date: '2026-08-12',
  payment_status: 'partial', notes: null, cancel_reason: null,
  cancelled_at: null, refunded_at: null, created_at: '2026-08-12', updated_at: '2026-08-12',
  customer_name: 'Ahmed Al-Otaibi', customer_phone: '0551234567', customer_email: null,
  customer_is_company: false, customer_company_name: null,
  trip_status: 'scheduled', bus_plate: 'SEUM-100', bus_make: 'Mercedes', bus_model: 'Tourismo',
};

beforeEach(() => { jest.resetAllMocks(); });

describe('createBooking', () => {
  it('creates booking with reference and passengers', async () => {
    mockQ1
      .mockResolvedValueOnce({ id: CID })
      .mockResolvedValueOnce({ ...TRIP_CTX })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...BOOKING, status: 'pending' })
      .mockResolvedValueOnce({ ...BOOKING, status: 'pending' });
    mockQ
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]); // getPassengers
    const { createBooking } = require('../services/bookingService');
    const b = await createBooking(TID, {
      customer_id: CID, trip_id: TRIP, seat_numbers: [5, 6],
      total_amount: 400, paid_amount: 200,
      passengers: [
        { passenger_name: 'Ahmed', seat_number: 5 },
        { passenger_name: 'Omar', seat_number: 6 },
      ],
    });
    expect(b.bookingReference).toMatch(/^BK-2026-\d{4}$/);
    expect(b.paymentStatus).toBe('partial');
    expect(mockQ).toHaveBeenCalledWith(expect.stringContaining('booking_passengers'), expect.anything());
  });

  it('rejects seats already taken', async () => {
    mockQ1
      .mockResolvedValueOnce({ id: CID })
      .mockResolvedValueOnce({ ...TRIP_CTX });
    mockQ.mockResolvedValueOnce([{ seat: 5 }, { seat: 6 }]);
    const { createBooking } = require('../services/bookingService');
    await expect(createBooking(TID, {
      customer_id: CID, trip_id: TRIP, seat_numbers: [5], total_amount: 100,
    })).rejects.toThrow('already taken');
  });

  it('rejects seat out of range', async () => {
    mockQ1
      .mockResolvedValueOnce({ id: CID })
      .mockResolvedValueOnce({ ...TRIP_CTX });
    mockQ.mockResolvedValueOnce([]);
    const { createBooking } = require('../services/bookingService');
    await expect(createBooking(TID, {
      customer_id: CID, trip_id: TRIP, seat_numbers: [51], total_amount: 100,
    })).rejects.toThrow('Validation failed');
  });

  it('rejects paid amount exceeding total', async () => {
    mockQ1
      .mockResolvedValueOnce({ id: CID })
      .mockResolvedValueOnce({ ...TRIP_CTX });
    mockQ.mockResolvedValueOnce([]);
    const { createBooking } = require('../services/bookingService');
    await expect(createBooking(TID, {
      customer_id: CID, trip_id: TRIP, seat_numbers: [1], total_amount: 100, paid_amount: 200,
    })).rejects.toThrow('Validation failed');
  });

  it('rejects booking on completed trip', async () => {
    mockQ1
      .mockResolvedValueOnce({ id: CID })
      .mockResolvedValueOnce({ ...TRIP_CTX, status: 'completed' });
    const { createBooking } = require('../services/bookingService');
    await expect(createBooking(TID, {
      customer_id: CID, trip_id: TRIP, seat_numbers: [1], total_amount: 100,
    })).rejects.toThrow('not available for booking');
  });
});

describe('getTripAvailability', () => {
  it('returns capacity, occupied and available seats', async () => {
    mockQ1.mockResolvedValueOnce({ ...TRIP_CTX });
    mockQ.mockResolvedValueOnce([{ seat: 2 }]);
    const { getTripAvailability } = require('../services/bookingService');
    const a = await getTripAvailability(TID, TRIP);
    expect(a.capacity).toBe(50);
    expect(a.occupied).toEqual([2]);
    expect(a.available).toHaveLength(49);
    expect(a.available).not.toContain(2);
  });
});

describe('listBookings', () => {
  it('filters by status and search term', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...BOOKING }]);
    const { listBookings } = require('../services/bookingService');
    const r = await listBookings(TID, { page: 1, pageSize: 50, status: 'pending', search: 'Ahmed' });
    expect(r.data).toHaveLength(1);
    expect(r.meta.total).toBe(1);
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('bk.status = $2');
    expect(sql).toContain('ILIKE');
  });
});

describe('booking lifecycle', () => {
  it('confirms a pending booking', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...BOOKING, status: 'pending' })
      .mockResolvedValueOnce({ ...BOOKING, status: 'confirmed' });
    mockQ.mockResolvedValue([]);
    const { confirmBooking } = require('../services/bookingService');
    const b = await confirmBooking(TID, 'bk1');
    expect(b.status).toBe('confirmed');
  });

  it('rejects confirming a cancelled booking', async () => {
    mockQ1.mockResolvedValueOnce({ ...BOOKING, status: 'cancelled' });
    const { confirmBooking } = require('../services/bookingService');
    await expect(confirmBooking(TID, 'bk1')).rejects.toThrow('Only pending bookings');
  });

  it('cancels with reason', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...BOOKING, status: 'confirmed' })
      .mockResolvedValueOnce({ ...BOOKING, status: 'cancelled', cancel_reason: 'Customer request' });
    mockQ.mockResolvedValue([]);
    const { cancelBooking } = require('../services/bookingService');
    const b = await cancelBooking(TID, 'bk1', 'Customer request');
    expect(b.status).toBe('cancelled');
    expect(b.cancelReason).toBe('Customer request');
  });

  it('requires a reason to cancel', async () => {
    mockQ1.mockResolvedValueOnce({ ...BOOKING, status: 'confirmed' });
    const { cancelBooking } = require('../services/bookingService');
    await expect(cancelBooking(TID, 'bk1', '   ')).rejects.toThrow('Validation failed');
  });

  it('refunds paid booking and zeroes paid amount', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...BOOKING, status: 'confirmed', paid_amount: '200.00' })
      .mockResolvedValueOnce({ ...BOOKING, status: 'refunded', paid_amount: '0.00', balance: '400.00' });
    mockQ.mockResolvedValue([]);
    const { refundBooking } = require('../services/bookingService');
    const b = await refundBooking(TID, 'bk1');
    expect(b.status).toBe('refunded');
    const vals = mockQ.mock.calls[0][1] as any[];
    expect(vals).toContain(400);
  });

  it('rejects refund when nothing was paid', async () => {
    mockQ1.mockResolvedValueOnce({ ...BOOKING, status: 'confirmed', paid_amount: '0.00' });
    const { refundBooking } = require('../services/bookingService');
    await expect(refundBooking(TID, 'bk1')).rejects.toThrow('Validation failed');
  });

  it('updates seats with conflict exclusion', async () => {
    mockQ1
      .mockResolvedValueOnce({ ...BOOKING })
      .mockResolvedValueOnce({ ...TRIP_CTX })
      .mockResolvedValueOnce({ ...BOOKING, seat_numbers: [7, 8] });
    mockQ
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { updateBooking } = require('../services/bookingService');
    const b = await updateBooking(TID, 'bk1', { seat_numbers: [7, 8] });
    expect(b.seatNumbers).toEqual([7, 8]);
    const vals = mockQ.mock.calls[0][1] as any[];
    expect(vals).toContain('bk1');
  });
});

describe('generateTicketPdf', () => {
  it('produces a pdf buffer', async () => {
    mockQ1.mockResolvedValueOnce({ ...BOOKING, status: 'confirmed' });
    mockQ.mockResolvedValue([
      { id: 'p1', booking_id: 'bk1', passenger_name: 'Ahmed', id_number: null, seat_number: 5, age: 30, special_requirements: null },
    ]);
    const { generateTicketPdf } = require('../services/bookingService');
    const buf = await generateTicketPdf(TID, 'bk1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });
});
