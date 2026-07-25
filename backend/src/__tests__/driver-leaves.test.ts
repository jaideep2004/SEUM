import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', DID = 'd1', LID = 'l1', UID = 'u1';

beforeEach(() => { jest.resetAllMocks(); });

describe('applyLeave', () => {
  it('creates a leave request', async () => {
    mockQ1.mockResolvedValueOnce({ id: DID, status: 'active' }).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: LID, tenant_id: TID, driver_id: DID, leave_type: 'annual', start_date: '2025-02-01', end_date: '2025-02-05', status: 'pending', reason: 'Vacation', created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    mockQ.mockResolvedValue([]);
    const { applyLeave } = require('../services/driverLeaveService');
    const l = await applyLeave(TID, { driverId: DID, leaveType: 'annual', startDate: '2025-02-01', endDate: '2025-02-05', reason: 'Vacation' });
    expect(l.status).toBe('pending');
  });
});

describe('listLeaves', () => {
  it('returns paginated leaves', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ id: LID, driver_id: DID, leave_type: 'annual', start_date: '2025-02-01', end_date: '2025-02-05', status: 'pending', reason: 'Vacation', driver_employee_code: 'D001', driver_name: 'John', created_at: '2025-01-15' }]);
    const { listLeaves } = require('../services/driverLeaveService');
    const r = await listLeaves(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
  });
});

describe('approveLeave', () => {
  it('approves pending leave', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending' }).mockResolvedValueOnce({ id: LID, driver_id: DID, leave_type: 'annual', start_date: '2025-02-01', end_date: '2025-02-05', status: 'approved', reason: 'Vacation', approved_by: UID, created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    const { approveLeave } = require('../services/driverLeaveService');
    const l = await approveLeave(TID, LID, UID);
    expect(l.status).toBe('approved');
  });
});

describe('rejectLeave', () => {
  it('rejects pending leave', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending' }).mockResolvedValueOnce({ id: LID, driver_id: DID, leave_type: 'annual', start_date: '2025-02-01', end_date: '2025-02-05', status: 'rejected', reason: 'Vacation', created_at: '2025-01-15', updated_at: '2025-01-15', deleted_at: null });
    const { rejectLeave } = require('../services/driverLeaveService');
    const l = await rejectLeave(TID, LID, 'Understaffed');
    expect(l.status).toBe('rejected');
  });
});

describe('getLeaveBalance', () => {
  it('returns leave balance', async () => {
    mockQ.mockResolvedValue([{ leave_type: 'annual', days_used: '10' }, { leave_type: 'sick', days_used: '3' }]);
    const { getLeaveBalance } = require('../services/driverLeaveService');
    const b = await getLeaveBalance(TID, DID);
    expect(b.allowances.annual.used).toBe(10);
  });
});
