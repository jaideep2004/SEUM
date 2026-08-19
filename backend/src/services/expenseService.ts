import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface ExpenseRow {
  id: string; tenant_id: string; expense_category: string;
  amount: string; description: string | null; date: string;
  bus_id: string | null; driver_id: string | null; trip_id: string | null;
  receipt_url: string | null; paid_by: string | null;
  status: string; approved_by: string | null; approved_at: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

function mapExpense(r: ExpenseRow) {
  return {
    id: r.id, tenantId: r.tenant_id, expenseCategory: r.expense_category,
    amount: parseFloat(r.amount), description: r.description, date: r.date,
    busId: r.bus_id, driverId: r.driver_id, tripId: r.trip_id,
    receiptUrl: r.receipt_url, paidBy: r.paid_by,
    status: r.status, approvedBy: r.approved_by, approvedAt: r.approved_at,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function createExpense(tenantId: string, input: {
  expense_category: string; amount: number; description?: string; date: string;
  bus_id?: string; driver_id?: string; trip_id?: string; paid_by?: string;
}, createdBy?: string) {
  const expense = await queryOne<ExpenseRow>(
    `INSERT INTO expenses (tenant_id, expense_category, amount, description, date, bus_id, driver_id, trip_id, paid_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tenantId, input.expense_category, input.amount, input.description || null,
     input.date, input.bus_id || null, input.driver_id || null,
     input.trip_id || null, input.paid_by || null],
  );
  return getExpenseDetail(tenantId, expense!.id);
}

export async function listExpenses(tenantId: string, params: {
  expense_category?: string; status?: string; bus_id?: string; driver_id?: string;
  startDate?: string; endDate?: string; page: number; pageSize: number;
}) {
  const conditions: string[] = ['e.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  conditions.push(`e.tenant_id = $${idx}`); values.push(tenantId); idx++;
  if (params.expense_category) { conditions.push(`e.expense_category = $${idx}`); values.push(params.expense_category); idx++; }
  if (params.status) { conditions.push(`e.status = $${idx}`); values.push(params.status); idx++; }
  if (params.bus_id) { conditions.push(`e.bus_id = $${idx}`); values.push(params.bus_id); idx++; }
  if (params.driver_id) { conditions.push(`e.driver_id = $${idx}`); values.push(params.driver_id); idx++; }
  if (params.startDate) { conditions.push(`e.date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`e.date <= $${idx}`); values.push(params.endDate); idx++; }

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM expenses e WHERE ${where}`, values,
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT e.*,
            u.name AS paid_by_name,
            approver.name AS approved_by_name,
            b.plate_number AS bus_plate,
            duser.name AS duser_name
     FROM expenses e
     LEFT JOIN users u ON u.id = e.paid_by
     LEFT JOIN users approver ON approver.id = e.approved_by
     LEFT JOIN buses b ON b.id = e.bus_id
     LEFT JOIN drivers d ON d.id = e.driver_id
     LEFT JOIN users duser ON duser.id = d.user_id
     WHERE ${where}
     ORDER BY e.date DESC, e.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset],
  );

  return {
    data: rows.map((r: any) => ({
      ...mapExpense(r),
      paidByName: r.paid_by_name,
      approvedByName: r.approved_by_name,
      busPlate: r.bus_plate,
      driverName: r.duser_name,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getExpenseDetail(tenantId: string, id: string) {
  const row = await queryOne<any>(
    `SELECT e.*,
            u.name AS paid_by_name,
            approver.name AS approved_by_name,
            b.plate_number AS bus_plate,
            duser.name AS duser_name
     FROM expenses e
     LEFT JOIN users u ON u.id = e.paid_by
     LEFT JOIN users approver ON approver.id = e.approved_by
     LEFT JOIN buses b ON b.id = e.bus_id
     LEFT JOIN drivers d ON d.id = e.driver_id
     LEFT JOIN users duser ON duser.id = d.user_id
     WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`,
    [id, tenantId],
  );
  if (!row) throw new NotFoundError('Expense not found');
  return {
    ...mapExpense(row),
    paidByName: row.paid_by_name,
    approvedByName: row.approved_by_name,
    busPlate: row.bus_plate,
    driverName: row.duser_name,
  };
}

export async function approveExpense(tenantId: string, id: string, approvedBy: string) {
  const expense = await queryOne<ExpenseRow>(
    'SELECT id, status FROM expenses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!expense) throw new NotFoundError('Expense not found');
  if (expense.status !== 'pending') throw new ConflictError('Only pending expenses can be approved');

  await query(
    `UPDATE expenses SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [approvedBy, id],
  );
  return getExpenseDetail(tenantId, id);
}

export async function reimburseExpense(tenantId: string, id: string) {
  const expense = await queryOne<ExpenseRow>(
    'SELECT id, status FROM expenses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!expense) throw new NotFoundError('Expense not found');
  if (expense.status !== 'approved') throw new ConflictError('Only approved expenses can be reimbursed');

  await query(
    `UPDATE expenses SET status = 'reimbursed', updated_at = NOW() WHERE id = $1`,
    [id],
  );
  return getExpenseDetail(tenantId, id);
}

export async function attachReceipt(tenantId: string, id: string, receiptUrl: string) {
  const expense = await queryOne<ExpenseRow>(
    'SELECT id FROM expenses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId],
  );
  if (!expense) throw new NotFoundError('Expense not found');

  await query(
    `UPDATE expenses SET receipt_url = $1, updated_at = NOW() WHERE id = $2`,
    [receiptUrl, id],
  );
  return getExpenseDetail(tenantId, id);
}
