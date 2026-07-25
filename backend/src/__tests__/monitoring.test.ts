import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', TRIP_ID = 'tr-1', UID = 'u1';

beforeEach(() => { jest.resetAllMocks(); });

describe('getMonitoringDashboard', () => {
  it('returns dashboard with active/delayed trips and stats', async () => {
    mockQ.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockQ1.mockResolvedValueOnce({ total_trips: 5, scheduled: 2, en_route: 1, completed: 1, delayed: 1, cancelled: 0 });
    const { getMonitoringDashboard } = require('../services/monitoringService');
    const d = await getMonitoringDashboard(TID, '2025-01-15');
    expect(d.stats.total_trips).toBe(5);
    expect(d.activeTrips).toEqual([]);
    expect(d.delayedTrips).toEqual([]);
  });
});

describe('getDelayedTrips', () => {
  it('returns paginated delayed trips', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ id: TRIP_ID, route_name: 'R1', plate_number: 'BUS1', driver_name: 'John', delay_minutes: 30, delay_reason: 'Traffic', status: 'delayed', scheduled_date: '2025-01-15' }]);
    const { getDelayedTrips } = require('../services/monitoringService');
    const r = await getDelayedTrips(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.meta.total).toBe(1);
  });
});

describe('manualStatusOverride', () => {
  it('overrides trip status', async () => {
    mockQ1.mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled' });
    mockQ1.mockResolvedValueOnce({ id: TRIP_ID, status: 'en_route', route_name: 'R1', plate_number: 'BUS1', driver_name: 'John' });
    mockQ.mockResolvedValue([]);
    const { manualStatusOverride } = require('../services/monitoringService');
    const r = await manualStatusOverride(TID, TRIP_ID, UID, { status: 'en_route' });
    expect(r.status).toBe('en_route');
  });
});

describe('logExternalUpdate', () => {
  it('logs sms/call update', async () => {
    mockQ1.mockResolvedValueOnce({ id: TRIP_ID, status: 'scheduled' });
    mockQ.mockResolvedValue([]);
    const { logExternalUpdate } = require('../services/monitoringService');
    const r = await logExternalUpdate(TID, TRIP_ID, { method: 'sms', status: 'delayed', delayMinutes: 15, delayReason: 'Accident' });
    expect(r.newStatus).toBe('delayed');
  });
});

describe('getTimelineComparison', () => {
  it('returns timeline data', async () => {
    mockQ1.mockResolvedValue({ id: TRIP_ID, status: 'completed', route_name: 'R1', plate_number: 'BUS1', estimated_duration_minutes: 60, scheduled_date: '2025-01-15', scheduled_start_time: '08:00', scheduled_end_time: '09:00', actual_start_time: '08:10', actual_end_time: '09:20', delay_minutes: 20, delay_reason: 'Late start' });
    mockQ.mockResolvedValue([]);
    const { getTimelineComparison } = require('../services/monitoringService');
    const r = await getTimelineComparison(TID, TRIP_ID);
    expect(r.timeline).toHaveLength(2);
  });
});
