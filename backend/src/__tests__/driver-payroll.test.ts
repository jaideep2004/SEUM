import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', DID = 'd1', PID = 'p1';

beforeEach(() => { jest.resetAllMocks(); });

describe('generatePayroll', () => {
  it('generates payroll records', async () => {
    mockQ.mockResolvedValueOnce([{ id: DID, driver_name: 'John', employee_code: 'D001', base_salary: '3000' }]);
    mockQ.mockResolvedValueOnce([{ count: '5' }]);
    mockQ1.mockResolvedValueOnce({ id: PID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', base_salary: '3000', trip_allowance: '125', overtime_hours: '0', overtime_rate: '28.125', overtime_pay: '0', bonuses: '0', deductions: '0', total_payable: '3125', status: 'draft', paid_at: null, payment_reference: null, created_at: '2025-02-01', updated_at: '2025-02-01', deleted_at: null });
    const { generatePayroll } = require('../services/driverPayrollService');
    const p = await generatePayroll(TID, { driverIds: [DID], periodStart: '2025-01-01', periodEnd: '2025-01-31', tripRate: 25 });
    expect(p.records).toHaveLength(1);
    expect(p.records[0].totalPayable).toBeGreaterThan(3000);
  });
});

describe('listPayroll', () => {
  it('returns paginated', async () => {
    mockQ1.mockResolvedValue({ count: 2 });
    mockQ.mockResolvedValue([{ id: PID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', base_salary: '3000', total_payable: '3125', status: 'draft', driver_name: 'John', driver_employee_code: 'D001', created_at: '2025-02-01' }]);
    const { listPayroll } = require('../services/driverPayrollService');
    const r = await listPayroll(TID, { page: 1, pageSize: 20 });
    expect(r.data).toHaveLength(1);
  });
});

describe('approvePayroll', () => {
  it('approves draft', async () => {
    mockQ1.mockResolvedValueOnce({ id: PID, status: 'draft' }).mockResolvedValueOnce({ id: PID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', base_salary: '3000', trip_allowance: '125', overtime_hours: '0', overtime_rate: '0', overtime_pay: '0', bonuses: '0', deductions: '0', total_payable: '3125', status: 'approved', paid_at: null, payment_reference: null, created_at: '2025-02-01', updated_at: '2025-02-01', deleted_at: null });
    mockQ.mockResolvedValue([]);
    const { approvePayroll } = require('../services/driverPayrollService');
    const p = await approvePayroll(TID, PID);
    expect(p.status).toBe('approved');
  });

  it('throws for non-draft', async () => {
    mockQ1.mockResolvedValue({ id: PID, status: 'paid' });
    const { approvePayroll } = require('../services/driverPayrollService');
    await expect(approvePayroll(TID, PID)).rejects.toThrow();
  });
});

describe('payPayroll', () => {
  it('pays approved', async () => {
    mockQ1.mockResolvedValueOnce({ id: PID, status: 'approved' }).mockResolvedValueOnce({ id: PID, tenant_id: TID, driver_id: DID, period_start: '2025-01-01', period_end: '2025-01-31', base_salary: '3000', trip_allowance: '125', overtime_hours: '0', overtime_rate: '0', overtime_pay: '0', bonuses: '0', deductions: '0', total_payable: '3125', status: 'paid', paid_at: '2025-02-01T00:00:00Z', payment_reference: 'REF001', created_at: '2025-02-01', updated_at: '2025-02-01', deleted_at: null });
    const { payPayroll } = require('../services/driverPayrollService');
    const p = await payPayroll(TID, PID, 'REF001');
    expect(p.status).toBe('paid');
  });
});

describe('getPayrollSummary', () => {
  it('returns summary', async () => {
    mockQ.mockResolvedValue([{ status: 'draft', total: '5000', count: '2' }]);
    const { getPayrollSummary } = require('../services/driverPayrollService');
    const s = await getPayrollSummary(TID, '2025-01-01', '2025-01-31');
    expect(s.draft.total).toBe(5000);
  });
});
