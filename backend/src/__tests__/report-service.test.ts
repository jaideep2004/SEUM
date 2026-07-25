import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1';

beforeEach(() => { jest.resetAllMocks(); });

describe('getTripSummary', () => {
  it('returns trip summary stats', async () => {
    mockQ1.mockResolvedValue({ total_trips: 10, scheduled: 2, en_route: 1, completed: 6, delayed: 1, cancelled: 0, completion_rate: 60, delay_rate: 10 });
    const { getTripSummary } = require('../services/reportService');
    const r = await getTripSummary(TID, '2025-01-01', '2025-01-31');
    expect(r.total_trips).toBe(10);
  });
});

describe('getDriverPerformance', () => {
  it('returns driver perf data', async () => {
    mockQ.mockResolvedValue([{ driver_name: 'John', total_trips: 15, completed_trips: 14, on_time_percentage: 93 }]);
    const { getDriverPerformance } = require('../services/reportService');
    const r = await getDriverPerformance(TID, '2025-01-01', '2025-01-31');
    expect(r).toHaveLength(1);
  });
});

describe('getRoutePerformance', () => {
  it('returns route perf data', async () => {
    mockQ.mockResolvedValue([{ route_name: 'R1', total_trips: 20, avg_delay_minutes: 5 }]);
    const { getRoutePerformance } = require('../services/reportService');
    const r = await getRoutePerformance(TID, '2025-01-01', '2025-01-31');
    expect(r).toHaveLength(1);
  });
});

describe('getBusUtilization', () => {
  it('returns bus utilization data', async () => {
    mockQ.mockResolvedValue([{ plate_number: 'BUS1', total_trips: 25, utilization_rate: 80 }]);
    const { getBusUtilization } = require('../services/reportService');
    const r = await getBusUtilization(TID, '2025-01-01', '2025-01-31');
    expect(r).toHaveLength(1);
  });
});
