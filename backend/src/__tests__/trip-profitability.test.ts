const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import { listTripProfitability, getProfitAnalytics, createProfitJournalEntry } from '../services/tripProfitabilityService';

const TID = 'tenant-1';

function makeTripRow(overrides: Record<string, any> = {}) {
  return {
    id: 'trip-1', tenant_id: TID, route_id: 'r1', bus_id: 'b1',
    scheduled_date: '2026-07-20', status: 'completed', estimated_revenue: '500.00',
    route_name: 'Makkah-Madinah', plate_number: 'ABC 123', driver_name: 'Ahmed',
    fuel_cost: '100.00', maintenance_cost: '50.00', toll_cost: '25.00',
    total_expenses: '175.00', passenger_count: 15,
    ...overrides,
  };
}

beforeEach(() => { jest.resetAllMocks(); });

describe('listTripProfitability', () => {
  it('returns paginated trip profit data', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([makeTripRow()]);

    const result = await listTripProfitability(TID, { page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].estimatedRevenue).toBe(500);
    expect(result.data[0].fuelCost).toBe(100);
    expect(result.data[0].totalExpenses).toBe(175);
    expect(result.data[0].profit).toBe(325);
    expect(result.data[0].marginPercent).toBe(65);
  });

  it('filters by status and date range', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listTripProfitability(TID, {
      page: 1, pageSize: 20, status: 'completed', startDate: '2026-07-01', endDate: '2026-07-31',
    });
    expect(result.data).toEqual([]);
  });

  it('returns empty array when no trips', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listTripProfitability(TID, { page: 1, pageSize: 20 });
    expect(result.data).toEqual([]);
  });

  it('handles zero revenue trips', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([makeTripRow({ estimated_revenue: '0' })]);

    const result = await listTripProfitability(TID, { page: 1, pageSize: 20 });
    expect(result.data[0].estimatedRevenue).toBe(0);
    expect(result.data[0].profit).toBe(-175);
    expect(result.data[0].marginPercent).toBe(0);
  });
});

describe('getProfitAnalytics', () => {
  it('returns KPIs and breakdown by route', async () => {
    mockQueryOne.mockResolvedValueOnce({ trip_count: 10, avg_revenue: '500.00', avg_profit: '300.00' });
    mockQuery.mockResolvedValueOnce([
      { label: 'Route A', trip_count: 5, total_revenue: '2500.00', total_profit: '1500.00' },
      { label: 'Route B', trip_count: 5, total_revenue: '2500.00', total_profit: '1500.00' },
    ]);

    const result = await getProfitAnalytics(TID, { groupBy: 'route' });
    expect(result.kpis.tripCount).toBe(10);
    expect(result.kpis.avgRevenue).toBe(500);
    expect(result.kpis.avgProfit).toBe(300);
    expect(result.kpis.avgMargin).toBe(60);
    expect(result.breakdown).toHaveLength(2);
  });

  it('returns breakdown by bus', async () => {
    mockQueryOne.mockResolvedValueOnce({ trip_count: 3, avg_revenue: '400.00', avg_profit: '200.00' });
    mockQuery.mockResolvedValueOnce([
      { label: 'BUS-001', trip_count: 3, total_revenue: '1200.00', total_profit: '600.00' },
    ]);

    const result = await getProfitAnalytics(TID, { groupBy: 'bus' });
    expect(result.kpis.tripCount).toBe(3);
    expect(result.breakdown[0].label).toBe('BUS-001');
    expect(result.breakdown[0].marginPercent).toBe(50);
  });

  it('returns empty breakdown when no data', async () => {
    mockQueryOne.mockResolvedValueOnce({ trip_count: 0, avg_revenue: '0', avg_profit: '0' });
    mockQuery.mockResolvedValueOnce([]);

    const result = await getProfitAnalytics(TID, {});
    expect(result.kpis.tripCount).toBe(0);
    expect(result.breakdown).toEqual([]);
  });
});

describe('createProfitJournalEntry', () => {
  it('creates journal entries for a trip with revenue', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: 'trip-1', estimated_revenue: '500.00', scheduled_date: '2026-07-20', route_name: 'Makkah-Madinah', plate_number: 'ABC 123' })
      .mockResolvedValueOnce({ id: 'rev-acc' })
      .mockResolvedValueOnce({ id: 'ar-acc' })
      .mockResolvedValueOnce({ id: 'je-1' });
    mockQuery.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce(undefined);

    const result = await createProfitJournalEntry(TID, 'trip-1');
    expect(result).toBe('je-1');
  });

  it('returns null when revenue is zero', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 'trip-1', estimated_revenue: '0', scheduled_date: '2026-07-20', route_name: 'Test', plate_number: 'X' });

    const result = await createProfitJournalEntry(TID, 'trip-1');
    expect(result).toBeNull();
  });

  it('returns null when accounts not found', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: 'trip-1', estimated_revenue: '500.00', scheduled_date: '2026-07-20', route_name: 'Test', plate_number: 'X' })
      .mockResolvedValueOnce(null);

    const result = await createProfitJournalEntry(TID, 'trip-1');
    expect(result).toBeNull();
  });
});
