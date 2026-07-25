import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', DID = 'd1', SID = 's1';

beforeEach(() => { jest.resetAllMocks(); });

describe('computeScore', () => {
  it('computes and stores score', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID });
    mockQ1.mockResolvedValueOnce({ total_points: '20', violation_count: '5' });
    mockQ1.mockResolvedValueOnce({ late_days: '2', total_days: '22' });
    mockQ1.mockResolvedValueOnce({ complaint_count: '0' });
    mockQ1.mockResolvedValueOnce(null);
    mockQ1.mockResolvedValueOnce({ id: SID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', safety_score: '80', punctuality_score: '90', customer_score: '85', fuel_efficiency_score: '70', overall_score: '81', computed_by: null, computed_at: '2025-02-01', created_at: '2025-02-01', updated_at: '2025-02-01', deleted_at: null });
    const { computeScore } = require('../services/driverScoreService');
    const r = await computeScore(TID, DID, '2025-01-01', '2025-01-31');
    expect(r.score.overallScore).toBe(81);
  });
});

describe('getScoreHistory', () => {
  it('returns paginated history', async () => {
    mockQ1.mockResolvedValue({ count: '3' });
    mockQ.mockResolvedValue([{ id: SID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', overall_score: 85, safety_score: 80, punctuality_score: 90, customer_score: 85, fuel_efficiency_score: 70, computed_at: '2025-02-01', created_at: '2025-02-01' }]);
    const { getScoreHistory } = require('../services/driverScoreService');
    const r = await getScoreHistory(TID, DID, 1, 20);
    expect(r.data).toHaveLength(1);
  });
});

describe('getLeaderboard', () => {
  it('returns leaderboard', async () => {
    mockQ1.mockResolvedValue({ count: 2 });
    mockQ.mockResolvedValue([{ id: DID, driver_name: 'John', overall_score: 92, rank: 1, employee_code: 'D001' }]);
    const { getLeaderboard } = require('../services/driverScoreService');
    const lb = await getLeaderboard(TID, 'month', 1, 20);
    expect(lb.data).toHaveLength(1);
  });
});

describe('getLatestScore', () => {
  it('returns latest score', async () => {
    mockQ1.mockResolvedValue({ id: SID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', overall_score: 88, safety_score: 85, punctuality_score: 90, customer_score: 85, fuel_efficiency_score: 75, computed_at: '2025-02-01', created_at: '2025-02-01' });
    const { getLatestScore } = require('../services/driverScoreService');
    const s = await getLatestScore(TID, DID);
    expect(s.overallScore).toBe(88);
  });
});
