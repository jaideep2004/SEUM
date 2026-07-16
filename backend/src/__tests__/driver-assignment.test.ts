import { query, queryOne } from '../db';

jest.mock('../db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { assignDriver, getAvailableDrivers, driverConfirmTrip, getDriverSchedule } from '../services/tripService';

const TID = 'tenant-1';
const TRIP_ID = 'trip-1';
const DRIVER_ID = 'driver-1';

const mockQuery = query as any;
const mockQueryOne = queryOne as any;

beforeEach(() => { jest.resetAllMocks(); });

describe('assignDriver', () => {
  it('assigns driver to a scheduled trip', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled' }) // trip exists
      .mockResolvedValueOnce({ id: DRIVER_ID }) // driver exists
      .mockResolvedValueOnce({ // getTripById result
        id: TRIP_ID, tenant_id: TID, route_id: 'r1', bus_id: 'b1',
        driver_id: DRIVER_ID, trip_type: 'regular', status: 'scheduled',
        driver_confirmation_status: 'pending',
        scheduled_date: '2026-07-20', scheduled_start_time: '08:00:00',
        route_name: 'Test Route', plate_number: 'ABC 123', driver_name: 'John',
        origin: 'A', destination: 'B',
      });
    mockQuery.mockResolvedValueOnce(undefined); // UPDATE
    mockQuery.mockResolvedValueOnce([]); // stops
    mockQuery.mockResolvedValueOnce([]); // passengers

    const result = await assignDriver(TID, TRIP_ID, DRIVER_ID);
    expect(result.driverId).toBe(DRIVER_ID);
    expect(result.driverConfirmationStatus).toBe('pending');
  });

  it('throws ConflictError for completed trip', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: TRIP_ID, status: 'completed' });
    await expect(assignDriver(TID, TRIP_ID, DRIVER_ID)).rejects.toThrow('Cannot assign');
  });

  it('throws NotFoundError when driver missing', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled' })
      .mockResolvedValueOnce(null);
    await expect(assignDriver(TID, TRIP_ID, 'bad')).rejects.toThrow('Driver not found');
  });
});

describe('getAvailableDrivers', () => {
  it('returns drivers not on another trip for the date', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: DRIVER_ID, email: 'john@test.com', name: 'John', roles: ['driver'] },
    ]);
    const result = await getAvailableDrivers(TID, '2026-07-20');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John');
  });

  it('returns empty array when no drivers', async () => {
    mockQuery.mockResolvedValueOnce([]);
    const result = await getAvailableDrivers(TID);
    expect(result).toHaveLength(0);
  });
});

describe('driverConfirmTrip', () => {
  it('accepts a pending trip', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled', driver_id: DRIVER_ID, driver_confirmation_status: 'pending' })
      .mockResolvedValueOnce({ // getTripById
        id: TRIP_ID, tenant_id: TID, route_id: 'r1', bus_id: 'b1',
        driver_id: DRIVER_ID, trip_type: 'regular', status: 'scheduled',
        driver_confirmation_status: 'accepted',
        scheduled_date: '2026-07-20', scheduled_start_time: '08:00:00',
        route_name: 'Test Route', plate_number: 'ABC 123', driver_name: 'John',
        origin: 'A', destination: 'B',
      });
    mockQuery.mockResolvedValueOnce(undefined); // UPDATE
    mockQuery.mockResolvedValueOnce([]); // stops
    mockQuery.mockResolvedValueOnce([]); // passengers

    const result = await driverConfirmTrip(TID, TRIP_ID, 'accepted');
    expect(result.driverConfirmationStatus).toBe('accepted');
  });

  it('rejects already accepted trip', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled', driver_id: DRIVER_ID, driver_confirmation_status: 'accepted' });
    await expect(driverConfirmTrip(TID, TRIP_ID, 'accepted')).rejects.toThrow('already accepted');
  });
});

describe('getDriverSchedule', () => {
  it('returns trips for a driver', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: TRIP_ID, route_id: 'r1', bus_id: 'b1', driver_id: DRIVER_ID,
        trip_type: 'regular', status: 'scheduled',
        driver_confirmation_status: 'accepted',
        scheduled_date: '2026-07-20', scheduled_start_time: '08:00:00',
        route_name: 'Test Route', plate_number: 'ABC 123',
        origin: 'A', destination: 'B',
      },
    ]);
    const result = await getDriverSchedule(TID, DRIVER_ID, '2026-07-20', '2026-07-20');
    expect(result).toHaveLength(1);
    expect(result[0].routeName).toBe('Test Route');
    expect(result[0].driverConfirmationStatus).toBe('accepted');
  });
});
