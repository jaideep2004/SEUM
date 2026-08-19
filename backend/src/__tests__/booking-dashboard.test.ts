import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1';

beforeEach(() => { jest.resetAllMocks(); });

describe('getBookingDashboard', () => {
  it('returns today summary, cancellation rate, revenue and trend', async () => {
    mockQ
      // today status rows
      .mockResolvedValueOnce([
        { status: 'pending', count: 2 },
        { status: 'confirmed', count: 5 },
      ])
      // revenue rows
      .mockResolvedValueOnce([{
        today_total: '1200.00', today_paid: '800.00',
        week_total: '5000.00', month_total: '20000.00',
      }])
      // trend rows
      .mockResolvedValueOnce([{ day: new Date().toISOString().slice(0, 10), revenue: '100.00' }])
      // upcoming trips
      .mockResolvedValueOnce([{
        id: 'trip-1', scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_start_time: '06:00', scheduled_end_time: null, status: 'scheduled',
        route_name: 'Mecca Line', origin: 'Jeddah', destination: 'Mecca',
        plate_number: 'ABC 123', capacity_seated: 45, booked_seats: 20, total_bookings: 20,
      }]);

    mockQ1
      // today total
      .mockResolvedValueOnce({ count: '7' })
      // all-time total
      .mockResolvedValueOnce({ count: '100' })
      // cancelled all-time
      .mockResolvedValueOnce({ count: '10' })
      // today passengers
      .mockResolvedValueOnce({ count: '7' });

    const { getBookingDashboard } = require('../services/bookingService');
    const r = await getBookingDashboard(TID);

    expect(r.today.total).toBe(7);
    expect(r.today.pending).toBe(2);
    expect(r.today.confirmed).toBe(5);
    expect(r.today.passengers).toBe(7);
    expect(r.cancellationRate.today).toBe(0);
    expect(r.cancellationRate.overall).toBe(10);
    expect(r.revenue.today).toBe(1200);
    expect(r.revenue.thisWeek).toBe(5000);
    expect(r.revenue.thisMonth).toBe(20000);
    expect(r.revenueTrend).toHaveLength(14);
    expect(r.upcomingTrips[0].busPlate).toBe('ABC 123');
    expect(r.upcomingTrips[0].bookedSeats).toBe(20);
  });

  it('returns zeros when no bookings exist', async () => {
    mockQ.mockResolvedValue([]);
    mockQ1.mockResolvedValue({ count: '0' });

    const { getBookingDashboard } = require('../services/bookingService');
    const r = await getBookingDashboard(TID);

    expect(r.today.total).toBe(0);
    expect(r.cancellationRate.overall).toBe(0);
    expect(r.revenue.today).toBe(0);
    expect(r.revenueTrend).toHaveLength(14);
    expect(r.upcomingTrips).toHaveLength(0);
  });
});
