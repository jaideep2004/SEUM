import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', EID = 'e1', LID = 'l1', UID = 'u1';

const ROW = {
  id: LID, tenant_id: TID, employee_id: EID, leave_type: 'annual',
  start_date: '2026-02-01', end_date: '2026-02-05', reason: 'Vacation',
  status: 'pending_manager', manager_approved_by: null, manager_approved_at: null,
  approved_by: null, approved_at: null, rejected_by: null, rejection_reason: null,
  documents: '[]', created_by: UID, created_at: '2026-01-15', updated_at: '2026-01-15',
  deleted_at: null,
};

beforeEach(() => { jest.resetAllMocks(); });

describe('applyLeave', () => {
  it('creates a leave request in pending_manager', async () => {
    mockQ1.mockResolvedValueOnce({ id: EID, status: 'active' }).mockResolvedValueOnce(null).mockResolvedValueOnce({ ...ROW });
    mockQ.mockResolvedValue([]);
    const { applyLeave } = require('../services/employeeLeaveService');
    const l = await applyLeave(TID, UID, { employeeId: EID, leaveType: 'annual', startDate: '2026-02-01', endDate: '2026-02-05', reason: 'Vacation' });
    expect(l.status).toBe('pending_manager');
  });

  it('throws when employee not found', async () => {
    mockQ1.mockResolvedValueOnce(null);
    const { applyLeave } = require('../services/employeeLeaveService');
    await expect(applyLeave(TID, UID, { employeeId: EID, leaveType: 'annual', startDate: '2026-02-01', endDate: '2026-02-05' }))
      .rejects.toThrow('Employee not found');
  });

  it('throws on overlapping leave', async () => {
    mockQ1.mockResolvedValueOnce({ id: EID, status: 'active' }).mockResolvedValueOnce({ id: 'other' });
    const { applyLeave } = require('../services/employeeLeaveService');
    await expect(applyLeave(TID, UID, { employeeId: EID, leaveType: 'annual', startDate: '2026-02-01', endDate: '2026-02-05' }))
      .rejects.toThrow('Leave already exists for this period');
  });
});

describe('listLeaves', () => {
  it('returns paginated leaves with employee info', async () => {
    mockQ1.mockResolvedValue({ count: 1 });
    mockQ.mockResolvedValue([{ ...ROW, employee_code: 'E001', employee_department: 'operations', employee_name: 'John', employee_status: 'active' }]);
    const { listLeaves } = require('../services/employeeLeaveService');
    const r = await listLeaves(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].employee.employeeCode).toBe('E001');
  });

  it('filters by department and status', async () => {
    mockQ1.mockResolvedValue({ count: 0 });
    mockQ.mockResolvedValue([]);
    const { listLeaves } = require('../services/employeeLeaveService');
    const r = await listLeaves(TID, { department: 'finance', status: 'pending_hr', page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(0);
    expect(mockQ1.mock.calls[0][0]).toContain('e.department');
    expect(mockQ1.mock.calls[0][0]).toContain('l.status');
  });
});

describe('getLeaveById', () => {
  it('returns leave with approver names', async () => {
    mockQ1.mockResolvedValue({ ...ROW, status: 'approved', approved_by: UID, hr_approver_name: 'HR Boss' });
    const { getLeaveById } = require('../services/employeeLeaveService');
    const l = await getLeaveById(TID, LID);
    expect(l.status).toBe('approved');
    expect(l.hrApproverName).toBe('HR Boss');
  });

  it('throws when not found', async () => {
    mockQ1.mockResolvedValue(null);
    const { getLeaveById } = require('../services/employeeLeaveService');
    await expect(getLeaveById(TID, LID)).rejects.toThrow('Leave not found');
  });
});

describe('approval workflow', () => {
  it('managerApprove moves pending_manager -> pending_hr', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending_manager' }).mockResolvedValueOnce({ ...ROW, status: 'pending_hr', manager_approved_by: UID });
    const { managerApproveLeave } = require('../services/employeeLeaveService');
    const l = await managerApproveLeave(TID, LID, UID);
    expect(l.status).toBe('pending_hr');
  });

  it('managerApprove rejects wrong stage', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'approved' });
    const { managerApproveLeave } = require('../services/employeeLeaveService');
    await expect(managerApproveLeave(TID, LID, UID)).rejects.toThrow('Manager approval only applies to pending leave');
  });

  it('approve moves pending_hr -> approved', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending_hr' }).mockResolvedValueOnce({ ...ROW, status: 'approved', approved_by: UID });
    const { approveLeave } = require('../services/employeeLeaveService');
    const l = await approveLeave(TID, LID, UID);
    expect(l.status).toBe('approved');
  });

  it('approve rejects wrong stage', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending_manager' });
    const { approveLeave } = require('../services/employeeLeaveService');
    await expect(approveLeave(TID, LID, UID)).rejects.toThrow('HR approval only applies to manager-approved leave');
  });

  it('reject works from either pending stage', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'pending_hr' }).mockResolvedValueOnce({ ...ROW, status: 'rejected', rejected_by: UID, rejection_reason: 'Understaffed' });
    const { rejectLeave } = require('../services/employeeLeaveService');
    const l = await rejectLeave(TID, LID, UID, 'Understaffed');
    expect(l.status).toBe('rejected');
  });

  it('reject rejects already-final leave', async () => {
    mockQ1.mockResolvedValueOnce({ id: LID, status: 'approved' });
    const { rejectLeave } = require('../services/employeeLeaveService');
    await expect(rejectLeave(TID, LID, UID, 'Nope')).rejects.toThrow('Leave is already approved');
  });
});

describe('getLeaveBalance', () => {
  it('computes remaining per leave type', async () => {
    mockQ.mockResolvedValue([{ leave_type: 'annual', days_used: '10' }, { leave_type: 'sick', days_used: '3' }]);
    const { getLeaveBalance } = require('../services/employeeLeaveService');
    const b = await getLeaveBalance(TID, EID);
    expect(b.allowances.annual.used).toBe(10);
    expect(b.allowances.annual.remaining).toBe(20);
    expect(b.allowances.maternity.total).toBe(90);
    expect(b.allowances.paternity.total).toBe(10);
  });
});

describe('getCalendar', () => {
  it('returns employees and leaves for month', async () => {
    mockQ.mockResolvedValueOnce([{ id: LID, employee_id: EID, employee_code: 'E001', employee_name: 'John', leave_type: 'annual', start_date: '2026-02-01', end_date: '2026-02-05', status: 'approved', reason: null }]);
    mockQ.mockResolvedValueOnce([{ id: EID, employee_code: 'E001', employee_name: 'John' }]);
    const { getCalendar } = require('../services/employeeLeaveService');
    const c = await getCalendar(TID, 2026, 2);
    expect(c.employees).toHaveLength(1);
    expect(c.leaves).toHaveLength(1);
  });
});
