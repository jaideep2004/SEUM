import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', BID = 'b1', TRIP = 'tr1';

const bookingRow = {
  id: BID, tenant_id: TID, booking_reference: 'BK-2026-0001',
  total_amount: '100.00', paid_amount: '100.00', balance: '0.00',
  status: 'confirmed', payment_status: 'paid',
  customer_name: 'Ahmed', customer_email: 'ahmed@example.com', customer_phone: '+966500000000',
  scheduled_date: '2026-09-01', scheduled_start_time: '06:00',
  route_name: 'Mecca Line', origin: 'Jeddah', destination: 'Mecca',
  trip_id: TRIP, bus_plate: 'ABC 123',
};

beforeEach(() => { jest.clearAllMocks(); });

describe('customer communication service', () => {
  it('rejects sending confirmation when booking has no customer email', async () => {
    mockQ1.mockResolvedValue({ ...bookingRow, customer_email: null });
    const { sendBookingConfirmationEmail } = require('../services/customerCommunicationService');
    const r = await sendBookingConfirmationEmail(TID, BID);
    expect(r.sent).toBe(false);
    expect(r.reason).toBe('no_email');
  });

  it('sends confirmation and logs a delivered communication', async () => {
    mockQ1.mockResolvedValue(bookingRow);
    mockQ.mockResolvedValue([]);
    const { sendBookingConfirmationEmail } = require('../services/customerCommunicationService');
    const r = await sendBookingConfirmationEmail(TID, BID);
    expect(r.sent).toBe(true);
    const insert = mockQ.mock.calls.find((c) => c && c[0] && c[0].includes('INSERT INTO booking_communications'));
    expect(insert).toBeTruthy();
    expect(insert[1][3]).toBe('confirmation');
    expect(insert[1][6]).toBe('sent');
  });

  it('sends delay alerts to all booked passengers and returns counts', async () => {
    mockQ.mockResolvedValueOnce([bookingRow, { ...bookingRow, customer_email: 'second@example.com' }]);
    mockQ.mockResolvedValue([]);
    const { sendTripDelayAlerts } = require('../services/customerCommunicationService');
    const r = await sendTripDelayAlerts(TID, TRIP, 45, 'Heavy traffic');
    expect(r.sent).toBe(2);
    expect(r.total).toBe(2);
    const inserts = mockQ.mock.calls.filter((c) => c && c[0] && c[0].includes('INSERT INTO booking_communications'));
    expect(inserts).toHaveLength(2);
  });

  it('sends cancel notification and logs it', async () => {
    mockQ1.mockResolvedValue({ ...bookingRow, status: 'cancelled' });
    mockQ.mockResolvedValue([]);
    const { sendCancellationNotification } = require('../services/customerCommunicationService');
    const r = await sendCancellationNotification(TID, BID, 'Customer request');
    expect(r.sent).toBe(true);
    expect(mockQ1).toHaveBeenCalled();
  });

  it('lists communications ordered by created_at desc', async () => {
    mockQ.mockResolvedValue([
      { id: 'c2', tenant_id: TID, booking_id: BID, trip_id: TRIP, type: 'receipt', channel: 'email',
        recipient_email: 'a@example.com', subject: 'Payment receipt', status: 'sent', error_message: null,
        created_at: '2026-08-15T10:00:00Z' },
      { id: 'c1', tenant_id: TID, booking_id: BID, trip_id: TRIP, type: 'confirmation', channel: 'email',
        recipient_email: 'a@example.com', subject: 'Booking confirmed', status: 'failed', error_message: 'SMTP down',
        created_at: '2026-08-15T09:00:00Z' },
    ]);
    const { listCommunications } = require('../services/customerCommunicationService');
    const r = await listCommunications(TID, BID);
    expect(r).toHaveLength(2);
    expect(r[0].type).toBe('receipt');
    expect(r[1].status).toBe('failed');
    expect(r[1].errorMessage).toBe('SMTP down');
  });

  it('reminder sender skips inactive bookings', async () => {
    mockQ1.mockResolvedValue({ ...bookingRow, status: 'cancelled' });
    const { sendTripReminderEmail } = require('../services/customerCommunicationService');
    const r = await sendTripReminderEmail(TID, BID);
    expect(r.sent).toBe(false);
    expect(r.reason).toBe('inactive_booking');
    const inserts = mockQ.mock.calls.filter((c) => c && c[0] && c[0].includes('INSERT INTO booking_communications'));
    expect(inserts).toHaveLength(0);
  });

  it('reminder job sends to due trip bookings and dedupes via communication log', async () => {
    mockQ
      .mockResolvedValueOnce([{ id: TID }]) // tenants
      .mockResolvedValueOnce([{ id: TRIP }]) // trips departing ~24h
      .mockResolvedValueOnce([{ id: BID }, { id: 'b2' }]) // bookings without prior reminder
      .mockResolvedValue([]); // log inserts
    mockQ1.mockResolvedValue(bookingRow); // booking ctx per reminder
    const { sendEmail } = require('../services/emailService');
    const { runReminderJob } = require('../services/customerCommunicationService');
    const sent = await runReminderJob();
    expect(sent).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const inserts = mockQ.mock.calls.filter((c) => c && c[0] && c[0].includes('INSERT INTO booking_communications'));
    expect(inserts).toHaveLength(2);
    expect(inserts.every((c) => c[1][3] === 'reminder')).toBe(true);
    expect(inserts.every((c) => c[1][6] === 'sent')).toBe(true);
    const bookingsSql = mockQ.mock.calls[2][0] as string;
    expect(bookingsSql).toContain('NOT EXISTS');
  });

  it('reminder job returns 0 when no trips depart tomorrow', async () => {
    mockQ
      .mockResolvedValueOnce([{ id: TID }])
      .mockResolvedValueOnce([]);
    const { runReminderJob } = require('../services/customerCommunicationService');
    expect(await runReminderJob()).toBe(0);
    expect(mockQ1).not.toHaveBeenCalled();
  });
});