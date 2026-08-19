import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', BID = 'b1', BRID = 'br1', UID = 'u1';

const ROW = {
  id: BRID, tenant_id: TID, bus_id: BID, trip_id: null,
  reported_by: UID, breakdown_type: 'engine_failure',
  description: 'Engine stalled on highway', location: 'Route 40 - KM 210',
  location_lat: 24.7, location_lng: 46.7,
  severity: 'high', status: 'reported',
  dispatched_mechanic: null, dispatched_at: null, dispatched_by: null,
  resolution_notes: null, cost: null, resolved_at: null, resolved_by: null,
  created_at: '2026-08-12', updated_at: '2026-08-12',
  bus_plate: 'BUS-001', bus_make: 'MAN', bus_model: '2024',
  route_name: null, route_code: null,
};

beforeEach(() => { jest.resetAllMocks(); });

describe('reportBreakdown', () => {
  it('creates a breakdown and joins bus info', async () => {
    mockQ1.mockResolvedValueOnce({ id: BID }).mockResolvedValueOnce({ ...ROW }).mockResolvedValueOnce({ ...ROW });
    const { reportBreakdown } = require('../services/breakdownService');
    const b = await reportBreakdown(TID, UID, { bus_id: BID, breakdown_type: 'engine_failure', location: 'Route 40 - KM 210', severity: 'high' });
    expect(b.status).toBe('reported');
    expect(b.bus.plateNumber).toBe('BUS-001');
    expect(b.severity).toBe('high');
  });

  it('throws when bus not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { reportBreakdown } = require('../services/breakdownService');
    await expect(reportBreakdown(TID, UID, { bus_id: BID, location: 'X' })).rejects.toThrow('Bus not found');
  });

  it('validates trip when provided', async () => {
    mockQ1.mockResolvedValueOnce({ id: BID }).mockResolvedValueOnce(null);
    const { reportBreakdown } = require('../services/breakdownService');
    await expect(reportBreakdown(TID, UID, { bus_id: BID, trip_id: 'trip1', location: 'X' })).rejects.toThrow('Trip not found');
  });
});

describe('listBreakdowns', () => {
  it('returns paginated breakdowns with filters', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...ROW, status: 'dispatched', dispatched_mechanic: 'Ali' }]);
    const { listBreakdowns } = require('../services/breakdownService');
    const r = await listBreakdowns(TID, { page: 1, pageSize: 20, status: 'reported', severity: 'high', bus_id: BID, search: 'BUS' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].bus.plateNumber).toBe('BUS-001');
    const sql = mockQ1.mock.calls[0][0] as string;
    expect(sql).toContain('b.status');
    expect(sql).toContain('b.severity');
    expect(sql).toContain('bd.plate_number ILIKE');
  });
});

describe('state machine', () => {
  it('dispatch only from reported/dispatched', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'reported' })
      .mockResolvedValueOnce({ ...ROW, status: 'dispatched', dispatched_mechanic: 'Ali', dispatched_at: '2026-08-12' })
      .mockResolvedValueOnce({ ...ROW, status: 'dispatched', dispatched_mechanic: 'Ali', dispatched_at: '2026-08-12' });
    const { dispatchBreakdown } = require('../services/breakdownService');
    const b = await dispatchBreakdown(TID, BRID, UID, 'Ali');
    expect(b.status).toBe('dispatched');
    expect(b.dispatchedMechanic).toBe('Ali');
  });

  it('dispatch rejects resolved', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'resolved' });
    const { dispatchBreakdown } = require('../services/breakdownService');
    await expect(dispatchBreakdown(TID, BRID, UID, 'Ali')).rejects.toThrow('Only reported breakdowns can be dispatched');
  });

  it('start only from dispatched', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'dispatched' })
      .mockResolvedValueOnce({ ...ROW, status: 'in_progress' })
      .mockResolvedValueOnce({ ...ROW, status: 'in_progress' });
    const { startBreakdown } = require('../services/breakdownService');
    const b = await startBreakdown(TID, BRID, UID);
    expect(b.status).toBe('in_progress');
  });

  it('start rejects wrong state', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'reported' });
    const { startBreakdown } = require('../services/breakdownService');
    await expect(startBreakdown(TID, BRID, UID)).rejects.toThrow('Only dispatched breakdowns can be started');
  });

  it('resolve sets notes, cost and timestamp', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'in_progress' })
      .mockResolvedValueOnce({ ...ROW, status: 'resolved', resolution_notes: 'Replaced fuel pump', cost: '450.00', resolved_at: '2026-08-12' })
      .mockResolvedValueOnce({ ...ROW, status: 'resolved', resolution_notes: 'Replaced fuel pump', cost: '450.00' });
    const { resolveBreakdown } = require('../services/breakdownService');
    const b = await resolveBreakdown(TID, BRID, UID, 'Replaced fuel pump', 450);
    expect(b.status).toBe('resolved');
    expect(b.cost).toBe(450);
    expect(b.resolutionNotes).toBe('Replaced fuel pump');
  });

  it('resolve rejects already resolved', async () => {
    mockQ1.mockResolvedValueOnce({ id: BRID, status: 'resolved' });
    const { resolveBreakdown } = require('../services/breakdownService');
    await expect(resolveBreakdown(TID, BRID, UID)).rejects.toThrow('Breakdown is already resolved');
  });

  it('getBreakdownById throws when not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { getBreakdownById } = require('../services/breakdownService');
    await expect(getBreakdownById(TID, 'nope')).rejects.toThrow('Breakdown report not found');
  });
});

describe('getHeatmap', () => {
  it('groups breakdowns by location with counts', async () => {
    mockQ.mockResolvedValue([
      { location: 'Route 40 - KM 210', location_lat: 24.7, location_lng: 46.7, count: 5, open_count: 2, avg_cost: '120.50', last_reported_at: '2026-08-12' },
      { location: 'Kudai', location_lat: null, location_lng: null, count: 2, open_count: 1, avg_cost: null, last_reported_at: '2026-08-11' },
    ]);
    const { getHeatmap } = require('../services/breakdownService');
    const r = await getHeatmap(TID);
    expect(r.total).toBe(7);
    expect(r.open).toBe(3);
    expect(r.locations[0].location).toBe('Route 40 - KM 210');
    expect(r.locations[0].avgCost).toBe(120.5);
    const sql = mockQ.mock.calls[0][0] as string;
    expect(sql).toContain('GROUP BY location');
  });
});