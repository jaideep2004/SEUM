import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';

interface PayrollBatch {
  id: string; tenant_id: string; period_start: string; period_end: string;
  total_salaries: string; total_allowances: string; total_deductions: string;
  net_payable: string; employee_count: number; status: string;
  approved_by: string | null; paid_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

interface PayrollItem {
  id: string; payroll_batch_id: string; tenant_id: string;
  driver_id: string; employee_code: string | null; employee_name: string;
  base_salary: string; trip_allowance: string;
  overtime_hours: string; overtime_rate: string; overtime_pay: string;
  bonuses: string; deductions: string; net_pay: string;
}

// ─── Create batch ───

export async function createBatch(tenantId: string, periodStart: string, periodEnd: string, createdBy?: string) {
  // Validate period
  if (new Date(periodStart) >= new Date(periodEnd)) {
    throw new Error('period_start must be before period_end');
  }

  // Check for existing batch in same period
  const existing = await queryOne<PayrollBatch>(
    `SELECT id FROM payroll_batches WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3 AND deleted_at IS NULL`,
    [tenantId, periodStart, periodEnd],
  );
  if (existing) throw new Error('A payroll batch already exists for this period');

  // Get all active drivers with their base salary
  const drivers = await query<any>(
    `SELECT d.id, d.employee_code, COALESCE(u.full_name, d.employee_code, 'Unknown') AS employee_name, d.base_salary
     FROM drivers d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status IN ('active','on_leave')
     ORDER BY d.employee_code`,
    [tenantId],
  );

  if (drivers.length === 0) throw new Error('No active drivers found to include in payroll');

  // For each driver, calculate trip allowance and overtime
  const items: any[] = [];
  for (const driver of drivers) {
    const baseSalary = parseFloat(driver.base_salary || '3000');

    // Count completed trips in period
    const tripCountRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM trips
       WHERE tenant_id = $1 AND driver_id = $2 AND status = 'completed'
       AND scheduled_date >= $3 AND scheduled_date <= $4 AND deleted_at IS NULL`,
      [tenantId, driver.id, periodStart, periodEnd],
    );
    const tripCount = parseInt(tripCountRow?.count || '0', 10);
    const tripAllowance = tripCount * 25; // SAR 25 per trip

    // Overtime: trips above 30 threshold
    const overtimeHours = Math.max(0, (tripCount - 30) * 0.5);
    const overtimeRate = baseSalary / 160 * 1.5;
    const overtimePay = overtimeHours * overtimeRate;

    const bonuses = 0;
    const deductions = 0;
    const netPay = baseSalary + tripAllowance + overtimePay + bonuses - deductions;

    items.push({
      driverId: driver.id,
      employeeCode: driver.employee_code,
      employeeName: driver.employee_name,
      baseSalary,
      tripAllowance,
      overtimeHours,
      overtimeRate,
      overtimePay,
      bonuses,
      deductions,
      netPay,
    });
  }

  const totalSalaries = items.reduce((s, i) => s + i.baseSalary, 0);
  const totalAllowances = items.reduce((s, i) => s + i.tripAllowance + i.overtimePay, 0);
  const totalDeductions = items.reduce((s, i) => s + i.deductions, 0);
  const netPayable = items.reduce((s, i) => s + i.netPay, 0);
  const employeeCount = items.length;

  // Insert batch
  const batchId = uuid();
  const batch = await queryOne<PayrollBatch>(
    `INSERT INTO payroll_batches (id, tenant_id, period_start, period_end, total_salaries, total_allowances, total_deductions, net_payable, employee_count, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) RETURNING *`,
    [batchId, tenantId, periodStart, periodEnd, totalSalaries, totalAllowances, totalDeductions, netPayable, employeeCount, createdBy || null],
  );

  // Insert items
  for (const item of items) {
    await query(
      `INSERT INTO payroll_items (id, payroll_batch_id, tenant_id, driver_id, employee_code, employee_name, base_salary, trip_allowance, overtime_hours, overtime_rate, overtime_pay, bonuses, deductions, net_pay)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [uuid(), batchId, tenantId, item.driverId, item.employeeCode, item.employeeName,
       item.baseSalary, item.tripAllowance, item.overtimeHours, item.overtimeRate,
       item.overtimePay, item.bonuses, item.deductions, item.netPay],
    );
  }

  return getBatchDetail(tenantId, batchId);
}

// ─── List batches ───

export async function listBatches(tenantId: string, status?: string) {
  let sql = `SELECT * FROM payroll_batches WHERE tenant_id = $1 AND deleted_at IS NULL`;
  const params: any[] = [tenantId];
  if (status) {
    sql += ` AND status = $2`;
    params.push(status);
  }
  sql += ` ORDER BY period_start DESC`;
  return query<PayrollBatch>(sql, params);
}

// ─── Batch detail ───

export async function getBatchDetail(tenantId: string, batchId: string) {
  const batch = await queryOne<PayrollBatch>(
    `SELECT * FROM payroll_batches WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [batchId, tenantId],
  );
  if (!batch) throw new Error('Payroll batch not found');

  const items = await query<PayrollItem>(
    `SELECT * FROM payroll_items WHERE payroll_batch_id = $1 ORDER BY employee_name`,
    [batchId],
  );

  return { ...batch, items };
}

// ─── Approve batch ───

export async function approveBatch(tenantId: string, batchId: string, userId: string) {
  const batch = await queryOne<PayrollBatch>(
    `SELECT * FROM payroll_batches WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [batchId, tenantId],
  );
  if (!batch) throw new Error('Payroll batch not found');
  if (batch.status !== 'draft') throw new Error(`Cannot approve batch with status "${batch.status}"`);

  const netPayable = parseFloat(batch.net_payable);

  // Create journal entry: Debit Salary Expense, Credit Accounts Payable
  const salaryExpenseAcct = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '5200' AND deleted_at IS NULL`,
    [tenantId],
  );
  const apAcct = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '2100' AND deleted_at IS NULL`,
    [tenantId],
  );

  if (salaryExpenseAcct && apAcct && netPayable > 0) {
    const entryId = uuid();
    const entryNumber = `PR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    await query(
      `INSERT INTO journal_entries (id, tenant_id, entry_number, date, description, reference_type, reference_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [entryId, tenantId, entryNumber, batch.period_end,
       `Payroll batch approval: ${batch.period_start} to ${batch.period_end}`,
       'payroll', batchId, 'posted', userId],
    );
    await query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES ($1,$2,$3,$4,0,'Salary expense - payroll batch'),
              ($5,$2,$6,0,$7,'Accounts payable - payroll batch')`,
      [uuid(), entryId, salaryExpenseAcct.id, netPayable,
       uuid(), apAcct.id, netPayable],
    );
  }

  await query(
    `UPDATE payroll_batches SET status = 'approved', approved_by = $1, updated_at = NOW() WHERE id = $2`,
    [userId, batchId],
  );

  return getBatchDetail(tenantId, batchId);
}

// ─── Pay batch ───

export async function payBatch(tenantId: string, batchId: string, userId: string) {
  const batch = await queryOne<PayrollBatch>(
    `SELECT * FROM payroll_batches WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [batchId, tenantId],
  );
  if (!batch) throw new Error('Payroll batch not found');
  if (batch.status !== 'approved') throw new Error(`Cannot pay batch with status "${batch.status}"`);

  const netPayable = parseFloat(batch.net_payable);

  // Create journal entry: Debit AP, Credit Cash
  const apAcct = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '2100' AND deleted_at IS NULL`,
    [tenantId],
  );
  const cashAcct = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '1100' AND deleted_at IS NULL`,
    [tenantId],
  );

  if (apAcct && cashAcct && netPayable > 0) {
    const entryId = uuid();
    const entryNumber = `PY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    await query(
      `INSERT INTO journal_entries (id, tenant_id, entry_number, date, description, reference_type, reference_id, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [entryId, tenantId, entryNumber, new Date().toISOString().split('T')[0],
       `Payroll payment: ${batch.period_start} to ${batch.period_end}`,
       'payroll', batchId, 'posted', userId],
    );
    await query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES ($1,$2,$3,$4,0,'Accounts payable payment - payroll'),
              ($5,$2,$6,0,$7,'Cash disbursement - payroll')`,
      [uuid(), entryId, apAcct.id, netPayable,
       uuid(), cashAcct.id, netPayable],
    );
  }

  await query(
    `UPDATE payroll_batches SET status = 'paid', paid_at = NOW(), approved_by = $1, updated_at = NOW() WHERE id = $2`,
    [userId, batchId],
  );

  return getBatchDetail(tenantId, batchId);
}

// ─── Delete batch (draft only) ───

export async function deleteBatch(tenantId: string, batchId: string) {
  const batch = await queryOne<PayrollBatch>(
    `SELECT status FROM payroll_batches WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [batchId, tenantId],
  );
  if (!batch) throw new Error('Payroll batch not found');
  if (batch.status !== 'draft') throw new Error('Only draft batches can be deleted');

  await query(
    `UPDATE payroll_batches SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    [batchId, tenantId],
  );
  return { success: true };
}
