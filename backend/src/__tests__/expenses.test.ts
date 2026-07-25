import { NotFoundError, ConflictError } from '../utils/errors';

const mockQuery = jest.fn();
const mockQueryOne = jest.fn();

jest.mock('../db', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
}));

import {
  createExpense, listExpenses, getExpenseDetail,
  approveExpense, reimburseExpense, attachReceipt,
} from '../services/expenseService';

const TID = 'tenant-1';
const EXPENSE_ID = 'expense-1';

function makeExpenseRow(overrides: Record<string, any> = {}) {
  return {
    id: EXPENSE_ID, tenant_id: TID, expense_category: 'fuel',
    amount: '150.00', description: 'Fuel for bus 101', date: '2026-07-15',
    bus_id: null, driver_id: null, trip_id: null,
    receipt_url: null, paid_by: 'user-1',
    status: 'pending', approved_by: null, approved_at: null,
    paid_by_name: null, approved_by_name: null,
    bus_plate: null, driver_name: null,
    created_at: '2026-07-15T00:00:00Z', updated_at: '2026-07-15T00:00:00Z', deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => { jest.resetAllMocks(); });

describe('createExpense', () => {
  it('creates an expense', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeExpenseRow()) // INSERT
      .mockResolvedValueOnce(makeExpenseRow()); // getExpenseDetail SELECT

    const result = await createExpense(TID, {
      expense_category: 'fuel', amount: 150, date: '2026-07-15',
      description: 'Fuel for bus 101',
    }, 'user-1');

    expect(result.expenseCategory).toBe('fuel');
    expect(result.amount).toBe(150);
    expect(result.status).toBe('pending');
  });

  it('creates expense with all optional fields', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeExpenseRow({ bus_id: 'bus-1', driver_id: 'driver-1', expense_category: 'tolls' }))
      .mockResolvedValueOnce(makeExpenseRow({ bus_id: 'bus-1', driver_id: 'driver-1', expense_category: 'tolls' }));

    const result = await createExpense(TID, {
      expense_category: 'tolls', amount: 50, date: '2026-07-15',
      bus_id: 'bus-1', driver_id: 'driver-1',
    });
    expect(result.busId).toBe('bus-1');
  });
});

describe('listExpenses', () => {
  it('returns paginated expenses', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 1 });
    mockQuery.mockResolvedValueOnce([makeExpenseRow()]);

    const result = await listExpenses(TID, { page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('filters by category and status', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listExpenses(TID, { page: 1, pageSize: 20, expense_category: 'fuel', status: 'pending' });
    expect(result.data).toEqual([]);
  });

  it('filters by date range', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });
    mockQuery.mockResolvedValueOnce([]);

    const result = await listExpenses(TID, { page: 1, pageSize: 20, startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(result.data).toEqual([]);
  });
});

describe('getExpenseDetail', () => {
  it('returns expense detail', async () => {
    mockQueryOne.mockResolvedValueOnce(makeExpenseRow());

    const result = await getExpenseDetail(TID, EXPENSE_ID);
    expect(result.expenseCategory).toBe('fuel');
    expect(result.amount).toBe(150);
  });

  it('throws NotFoundError when missing', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(getExpenseDetail(TID, EXPENSE_ID)).rejects.toThrow(NotFoundError);
  });
});

describe('approveExpense', () => {
  it('approves a pending expense', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeExpenseRow()); // check

    mockQuery.mockResolvedValueOnce(undefined); // UPDATE

    mockQueryOne.mockResolvedValueOnce(makeExpenseRow({ status: 'approved', approved_by: 'user-2' })); // detail
    const result = await approveExpense(TID, EXPENSE_ID, 'user-2');
    expect(result.status).toBe('approved');
  });

  it('rejects approving already-approved expense', async () => {
    mockQueryOne.mockResolvedValueOnce(makeExpenseRow({ status: 'approved' }));
    await expect(approveExpense(TID, EXPENSE_ID, 'user-2')).rejects.toThrow(ConflictError);
  });

  it('rejects approving reimbursed expense', async () => {
    mockQueryOne.mockResolvedValueOnce(makeExpenseRow({ status: 'reimbursed' }));
    await expect(approveExpense(TID, EXPENSE_ID, 'user-2')).rejects.toThrow(ConflictError);
  });
});

describe('reimburseExpense', () => {
  it('reimburses an approved expense', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeExpenseRow({ status: 'approved' })); // check

    mockQuery.mockResolvedValueOnce(undefined); // UPDATE

    mockQueryOne.mockResolvedValueOnce(makeExpenseRow({ status: 'reimbursed' })); // detail

    const result = await reimburseExpense(TID, EXPENSE_ID);
    expect(result.status).toBe('reimbursed');
  });

  it('rejects reimbursing pending expense', async () => {
    mockQueryOne.mockResolvedValueOnce(makeExpenseRow());
    await expect(reimburseExpense(TID, EXPENSE_ID)).rejects.toThrow(ConflictError);
  });
});

describe('attachReceipt', () => {
  it('attaches a receipt URL', async () => {
    mockQueryOne
      .mockResolvedValueOnce(makeExpenseRow()); // check

    mockQuery.mockResolvedValueOnce(undefined); // UPDATE

    mockQueryOne.mockResolvedValueOnce(makeExpenseRow({ receipt_url: '/uploads/receipt.jpg' })); // detail

    const result = await attachReceipt(TID, EXPENSE_ID, '/uploads/receipt.jpg');
    expect(result.receiptUrl).toBe('/uploads/receipt.jpg');
  });

  it('throws NotFoundError on missing expense', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    await expect(attachReceipt(TID, 'bad-id', '/uploads/receipt.jpg')).rejects.toThrow(NotFoundError);
  });
});

