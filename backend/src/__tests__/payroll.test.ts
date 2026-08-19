import { query, queryOne } from '../db';

jest.mock('../db', () => {
  const mocker = (rows: any) => jest.fn().mockResolvedValue(rows);
  return {
    query: jest.fn(),
    queryOne: jest.fn(),
  };
});

const mockQuery = query as jest.Mock;
const mockQueryOne = queryOne as jest.Mock;

const TID = 'test-tenant-payroll';
const UID = 'test-user-payroll';
const BID = 'batch-1';
const DRIVER_ID = 'driver-1';

beforeEach(() => { jest.clearAllMocks(); });

// ─── createBatch ───

describe('createBatch', () => {
  it('creates a batch with items from active drivers', async () => {
    mockQueryOne
      .mockResolvedValueOnce(null)                                                           // existing check
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, period_start: '2025-01-01', period_end: '2025-01-31', total_salaries: '3000', total_allowances: '0', total_deductions: '0', net_payable: '3000', employee_count: 1, status: 'draft', approved_by: null, paid_at: null, created_by: UID, created_at: '2025-01-01', updated_at: '2025-01-01' })  // RETURNING *
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, period_start: '2025-01-01', period_end: '2025-01-31', total_salaries: '3000', total_allowances: '0', total_deductions: '0', net_payable: '3000', employee_count: 1, status: 'draft', approved_by: null, paid_at: null, created_by: UID, created_at: '2025-01-01', updated_at: '2025-01-01' });  // getBatchDetail SELECT
    mockQuery
      .mockResolvedValueOnce([{ id: DRIVER_ID, employee_code: 'D001', employee_name: 'John Driver', base_salary: '3000' }]) // drivers
      .mockResolvedValueOnce([])                                                             // batched trip count (no completed trips)
      .mockResolvedValueOnce([])                                                             // INSERT items (no return)
      .mockResolvedValueOnce([{ id: 'item-1', payroll_batch_id: BID, driver_id: DRIVER_ID, employee_name: 'John Driver', net_pay: '3000' }]); // getBatchDetail items

    const { createBatch } = require('../services/payrollService');
    const result = await createBatch(TID, '2025-01-01', '2025-01-31', UID);

    expect(result.period_start).toBe('2025-01-01');
    expect(result.employee_count).toBe(1);
    expect(result.net_payable).toBe('3000');
  });

  it('throws if batch already exists for period', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 'existing' });
    const { createBatch } = require('../services/payrollService');
    await expect(createBatch(TID, '2025-01-01', '2025-01-31')).rejects.toThrow('already exists');
  });

  it('throws if no active drivers', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    mockQuery.mockResolvedValueOnce([]);
    const { createBatch } = require('../services/payrollService');
    await expect(createBatch(TID, '2025-01-01', '2025-01-31')).rejects.toThrow('No active drivers');
  });
});

// ─── listBatches ───

describe('listBatches', () => {
  it('returns all batches for tenant', async () => {
    mockQuery.mockResolvedValue([{ id: BID, status: 'draft' }]);
    const { listBatches } = require('../services/payrollService');
    const rows = await listBatches(TID);
    expect(rows).toHaveLength(1);
  });

  it('filters by status', async () => {
    mockQuery.mockResolvedValue([]);
    const { listBatches } = require('../services/payrollService');
    await listBatches(TID, 'approved');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('status = $2'), [TID, 'approved']);
  });
});

// ─── getBatchDetail ───

describe('getBatchDetail', () => {
  it('returns batch with items', async () => {
    mockQueryOne.mockResolvedValue({ id: BID, tenant_id: TID });
    mockQuery.mockResolvedValue([{ id: 'item-1', payroll_batch_id: BID, driver_id: DRIVER_ID, employee_name: 'John', net_pay: '3000' }]);
    const { getBatchDetail } = require('../services/payrollService');
    const result = await getBatchDetail(TID, BID);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].employee_name).toBe('John');
  });

  it('throws if batch not found', async () => {
    mockQueryOne.mockResolvedValue(null);
    const { getBatchDetail } = require('../services/payrollService');
    await expect(getBatchDetail(TID, BID)).rejects.toThrow('not found');
  });
});

// ─── approveBatch ───

describe('approveBatch', () => {
  it('approves a draft batch and creates journal entry', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, status: 'draft', net_payable: '5000', period_end: '2025-01-31' })
      .mockResolvedValueOnce({ id: 'sal-exp-acct' })  // salary expense account
      .mockResolvedValueOnce({ id: 'ap-acct' })        // AP account
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, status: 'approved' }); // after update
    mockQuery.mockResolvedValue([]);

    const { approveBatch } = require('../services/payrollService');
    const result = await approveBatch(TID, BID, UID);
    expect(result.status).toBe('approved');
  });

  it('throws for non-draft batch', async () => {
    mockQueryOne.mockResolvedValue({ id: BID, status: 'paid' });
    const { approveBatch } = require('../services/payrollService');
    await expect(approveBatch(TID, BID, UID)).rejects.toThrow('Cannot approve');
  });
});

// ─── payBatch ───

describe('payBatch', () => {
  it('pays an approved batch and creates payment journal entry', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, status: 'approved', net_payable: '5000', period_end: '2025-01-31' })
      .mockResolvedValueOnce({ id: 'ap-acct' })
      .mockResolvedValueOnce({ id: 'cash-acct' })
      .mockResolvedValueOnce({ id: BID, tenant_id: TID, status: 'paid' });
    mockQuery.mockResolvedValue([]);

    const { payBatch } = require('../services/payrollService');
    const result = await payBatch(TID, BID, UID);
    expect(result.status).toBe('paid');
  });

  it('throws for non-approved batch', async () => {
    mockQueryOne.mockResolvedValue({ id: BID, status: 'draft' });
    const { payBatch } = require('../services/payrollService');
    await expect(payBatch(TID, BID, UID)).rejects.toThrow('Cannot pay');
  });
});

// ─── deleteBatch ───

describe('deleteBatch', () => {
  it('deletes a draft batch', async () => {
    mockQueryOne.mockResolvedValue({ status: 'draft' });
    mockQuery.mockResolvedValue([]);
    const { deleteBatch } = require('../services/payrollService');
    const result = await deleteBatch(TID, BID);
    expect(result.success).toBe(true);
  });

  it('throws for non-draft batch', async () => {
    mockQueryOne.mockResolvedValue({ status: 'approved' });
    const { deleteBatch } = require('../services/payrollService');
    await expect(deleteBatch(TID, BID)).rejects.toThrow('Only draft');
  });
});
