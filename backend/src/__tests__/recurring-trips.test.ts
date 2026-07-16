import { query, queryOne } from '../db';

jest.mock('../db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { createPattern, listPatterns, getPatternById, updatePattern, deletePattern, generateTrips, getPatternCalendar } from '../services/recurringTripService';

const TID = 'tenant-1';
const UID = 'user-1';
const PATTERN_ID = 'pattern-1';
const ROUTE_ID = 'route-1';
const BUS_ID = 'bus-1';

const mockQuery = query as any;
const mockQueryOne = queryOne as any;

beforeEach(() => { jest.resetAllMocks(); });

describe('createPattern', () => {
  it('creates a recurring pattern', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID }) // route exists
      .mockResolvedValueOnce({ id: BUS_ID }) // bus exists
      .mockResolvedValueOnce({
        id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, bus_id: BUS_ID,
        driver_id: null, trip_type: 'regular', frequency: 'daily',
        days_of_week: null, scheduled_start_time: '08:00:00',
        scheduled_end_time: null, start_date: '2026-08-01', end_date: null,
        specific_dates: null, notes: null, is_active: true,
        last_generated_at: null, created_by: UID, created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z',
      });

    const result = await createPattern(TID, UID, {
      routeId: ROUTE_ID, busId: BUS_ID, frequency: 'daily',
      tripType: 'regular', isActive: true,
      scheduledStartTime: '08:00:00', startDate: '2026-08-01',
    });
    expect(result.routeId).toBe(ROUTE_ID);
    expect(result.frequency).toBe('daily');
  });

  it('throws NotFoundError when route missing', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(createPattern(TID, UID, {
      routeId: 'bad', frequency: 'daily', tripType: 'regular', isActive: true,
      scheduledStartTime: '08:00:00', startDate: '2026-08-01',
    })).rejects.toThrow('Route not found');
  });

  it('throws NotFoundError when bus missing', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: ROUTE_ID })
      .mockResolvedValueOnce(null);
    await expect(createPattern(TID, UID, {
      routeId: ROUTE_ID, busId: 'bad', frequency: 'daily', tripType: 'regular', isActive: true,
      scheduledStartTime: '08:00:00', startDate: '2026-08-01',
    })).rejects.toThrow('Bus not found');
  });
});

describe('listPatterns', () => {
  it('returns paginated patterns with joins', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([{
      id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, bus_id: BUS_ID,
      driver_id: null, trip_type: 'regular', frequency: 'daily',
      days_of_week: null, scheduled_start_time: '08:00:00',
      scheduled_end_time: null, start_date: '2026-08-01', end_date: null,
      specific_dates: null, notes: null, is_active: true,
      last_generated_at: null, created_by: UID,
      created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z',
      route_name: 'Test Route', origin: 'A', destination: 'B',
      plate_number: 'ABC 123', driver_name: null,
    }]);

    const result = await listPatterns(TID, { page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].routeName).toBe('Test Route');
    expect(result.meta.total).toBe(1);
  });
});

describe('getPatternById', () => {
  it('returns pattern with joins', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, bus_id: BUS_ID,
      driver_id: null, trip_type: 'regular', frequency: 'weekdays',
      days_of_week: [1, 2, 3, 4, 5],
      scheduled_start_time: '08:00:00', scheduled_end_time: null,
      start_date: '2026-08-01', end_date: '2026-12-31',
      specific_dates: ['2026-09-01'], notes: 'Test', is_active: true,
      last_generated_at: null, created_by: UID,
      created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z',
      route_name: 'Test Route', origin: 'A', destination: 'B',
      plate_number: 'ABC 123', driver_name: 'John Doe',
    });

    const result = await getPatternById(TID, PATTERN_ID);
    expect(result.frequency).toBe('weekdays');
    expect(result.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(result.routeName).toBe('Test Route');
  });

  it('throws NotFoundError when missing', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(getPatternById(TID, 'bad')).rejects.toThrow('not found');
  });
});

describe('updatePattern', () => {
  it('updates pattern fields', async () => {
    mockQueryOne.mockImplementationOnce(() => Promise.resolve({ id: PATTERN_ID })); // exists
    // update query - no return needed
    mockQuery.mockImplementationOnce(() => Promise.resolve(undefined));
    // getPatternById query
    mockQueryOne.mockImplementationOnce(() => Promise.resolve({
      id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, bus_id: null,
      driver_id: null, trip_type: 'regular', frequency: 'weekends',
      days_of_week: null, scheduled_start_time: '08:00:00',
      scheduled_end_time: null, start_date: '2026-08-01', end_date: null,
      specific_dates: null, notes: 'Updated', is_active: true,
      last_generated_at: null, created_by: UID,
      created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z',
      route_name: null, origin: null, destination: null,
      plate_number: null, driver_name: null,
    }));

    const result = await updatePattern(TID, PATTERN_ID, { notes: 'Updated' });
    expect(result.notes).toBe('Updated');
  });
});

describe('deletePattern', () => {
  it('deletes a pattern', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: PATTERN_ID });
    mockQuery.mockResolvedValueOnce(undefined);
    const result = await deletePattern(TID, PATTERN_ID);
    expect(result.deleted).toBe(true);
  });
});

describe('generateTrips', () => {
  it('generates trips from a daily pattern', async () => {
    mockQueryOne
      .mockResolvedValueOnce({  // pattern lookup
        id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, bus_id: BUS_ID,
        driver_id: null, trip_type: 'regular', frequency: 'daily',
        days_of_week: null, scheduled_start_time: '08:00:00',
        scheduled_end_time: null, start_date: '2026-08-01', end_date: '2026-08-05',
        specific_dates: null, notes: null, is_active: true,
        last_generated_at: null, created_by: UID,
      })
      // Trip existence checks - each returns null (no existing trip)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    // INSERT trips + UPDATE pattern
    mockQuery.mockResolvedValue(undefined);

    const result = await generateTrips(TID, UID, PATTERN_ID, { startDate: '2026-08-01', endDate: '2026-08-03' });
    expect(result.generatedCount).toBe(3);
    expect(result.tripIds).toHaveLength(3);
  });

  it('throws when pattern is inactive', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: PATTERN_ID, tenant_id: TID, route_id: ROUTE_ID, is_active: false,
    });
    await expect(generateTrips(TID, UID, PATTERN_ID, { startDate: '2026-08-01', endDate: '2026-08-03' })).rejects.toThrow('inactive');
  });
});

describe('getPatternCalendar', () => {
  it('returns projected dates for daily pattern', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: PATTERN_ID, tenant_id: TID, frequency: 'daily',
      days_of_week: null, specific_dates: null,
    });
    const result = await getPatternCalendar(TID, PATTERN_ID, '2026-08-01', '2026-08-03');
    expect(result).toHaveLength(3);
  });

  it('returns projected dates for weekdays pattern', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: PATTERN_ID, tenant_id: TID, frequency: 'weekdays',
      days_of_week: null, specific_dates: null,
    });
    // 2026-08-01 is Saturday, 2026-08-03 is Monday
    const result = await getPatternCalendar(TID, PATTERN_ID, '2026-08-01', '2026-08-03');
    expect(result).toHaveLength(1); // Only Monday (Aug 3)
  });
});
