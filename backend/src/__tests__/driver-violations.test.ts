import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', DID = 'd1', VID = 'v1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createViolation', () => {
  it('creates violation', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID }).mockResolvedValueOnce({ id: VID, tenant_id: TID, driver_id: DID, trip_id: null, violation_type: 'speeding', severity: 'medium', description: 'test', points: 3, recorded_at: '2025-01-01T00:00:00Z', action_taken: null, action_taken_by: null, status: 'open', dispute_reason: null, dispute_evidence: '[]', resolved_at: null, created_at: '2025-01-01', updated_at: '2025-01-01', deleted_at: null });
    mockQ.mockResolvedValueOnce([{ total: '3' }]);
    const { createViolation } = require('../services/driverViolationService');
    const v = await createViolation(TID, { driverId: DID, violationType: 'speeding', severity: 'medium', description: 'test' });
    expect(v.violation.violationType).toBe('speeding');
    expect(v.totalPoints).toBe(3);
  });
});

describe('listViolations', () => {
  it('returns paginated', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ id: VID, driver_id: DID, violation_type: 'speeding', severity: 'medium', points: 3, status: 'open', recorded_at: '2025-01-01', driver_name: 'John', driver_employee_code: 'D001', created_at: '2025-01-01', updated_at: '2025-01-01' }]);
    const { listViolations } = require('../services/driverViolationService');
    const r = await listViolations(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
  });
});

describe('updateViolation', () => {
  it('updates status', async () => {
    mockQ1.mockResolvedValueOnce({ id: VID, status: 'open' }).mockResolvedValueOnce({ id: VID, tenant_id: TID, driver_id: DID, trip_id: null, violation_type: 'speeding', severity: 'medium', description: null, points: 3, recorded_at: '2025-01-01T00:00:00Z', action_taken: 'warning', action_taken_by: null, status: 'resolved', dispute_reason: null, dispute_evidence: '[]', resolved_at: '2025-01-02T00:00:00Z', created_at: '2025-01-01', updated_at: '2025-01-02', deleted_at: null });
    const { updateViolation } = require('../services/driverViolationService');
    const v = await updateViolation(TID, VID, { status: 'resolved', actionTaken: 'warning' });
    expect(v.status).toBe('resolved');
  });
});

describe('getSafetyScore', () => {
  it('returns score', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID, employee_code: 'D001', status: 'active' });
    mockQ.mockResolvedValueOnce([{ total: '10' }]).mockResolvedValueOnce([{ violation_type: 'speeding', count: 2, points: 10 }]);
    const { getSafetyScore } = require('../services/driverViolationService');
    const s = await getSafetyScore(TID, DID);
    expect(s.score).toBe(90);
    expect(s.totalPoints).toBe(10);
  });
});

describe('getSafetyLeaderboard', () => {
  it('returns leaderboard', async () => {
    mockQ.mockResolvedValue([{ id: DID, driver_name: 'John', total_points: 5, score: 95, employee_code: 'D001', status: 'active' }]);
    const { getSafetyLeaderboard } = require('../services/driverViolationService');
    const lb = await getSafetyLeaderboard(TID);
    expect(lb).toHaveLength(1);
  });
});
