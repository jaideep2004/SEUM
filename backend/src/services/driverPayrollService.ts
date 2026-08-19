import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface PayrollRow {
  id: string;
  tenant_id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  base_salary: string;
  trip_allowance: string;
  overtime_hours: string;
  overtime_rate: string;
  overtime_pay: string;
  bonuses: string;
  deductions: string;
  total_payable: string;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapPayroll(row: PayrollRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    driverId: row.driver_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    baseSalary: parseFloat(row.base_salary),
    tripAllowance: parseFloat(row.trip_allowance),
    overtimeHours: parseFloat(row.overtime_hours),
    overtimeRate: parseFloat(row.overtime_rate),
    overtimePay: parseFloat(row.overtime_pay),
    bonuses: parseFloat(row.bonuses),
    deductions: parseFloat(row.deductions),
    totalPayable: parseFloat(row.total_payable),
    status: row.status,
    paidAt: row.paid_at,
    paymentReference: row.payment_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function generatePayroll(tenantId: string, input: {
  periodStart: string; periodEnd: string;
  driverIds?: string[]; baseSalaries?: Record<string, number>;
  tripRate: number;
}) {
  const drivers = await query<any>(
    `SELECT d.id, d.employee_code, u.name AS driver_name,
            COALESCE(d.base_salary, 3000) AS base_salary
     FROM drivers d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status IN ('active', 'on_leave')
     ${input.driverIds ? 'AND d.id = ANY($2::uuid[])' : ''}
     ORDER BY d.employee_code`,
    input.driverIds ? [tenantId, input.driverIds] : [tenantId]
  );

  const tripCounts = await query<{ driver_id: string; count: string }>(
    `SELECT driver_id, COUNT(*)::text AS count
     FROM trips
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND status = 'completed' AND scheduled_date >= $2 AND scheduled_date <= $3
       AND driver_id = ANY($4::uuid[])
     GROUP BY driver_id`,
    [tenantId, input.periodStart, input.periodEnd, drivers.map((d) => d.id)]
  );
  const tripCountByDriver = new Map(tripCounts.map((r) => [r.driver_id, parseInt(r.count, 10)]));

  const results: any[] = [];

  for (const driver of drivers) {
    const baseSalary = input.baseSalaries?.[driver.id] || parseFloat(driver.base_salary) || 3000;

    const tripCount = tripCountByDriver.get(driver.id) ?? 0;
    const tripAllowance = tripCount * input.tripRate;

    const overtimeHours = tripCount > 30 ? (tripCount - 30) * 0.5 : 0;
    const overtimeRate = baseSalary / 160 * 1.5;
    const overtimePay = overtimeHours * overtimeRate;

    const bonuses = 0;
    const deductions = 0;
    const totalPayable = baseSalary + tripAllowance + overtimePay + bonuses - deductions;

    const result = await queryOne<PayrollRow>(
      `INSERT INTO driver_payroll (tenant_id, driver_id, period_start, period_end, base_salary, trip_allowance, overtime_hours, overtime_rate, overtime_pay, bonuses, deductions, total_payable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tenant_id, driver_id, period_start, period_end) DO UPDATE SET
         base_salary = EXCLUDED.base_salary, trip_allowance = EXCLUDED.trip_allowance,
         overtime_hours = EXCLUDED.overtime_hours, overtime_rate = EXCLUDED.overtime_rate,
         overtime_pay = EXCLUDED.overtime_pay, bonuses = EXCLUDED.bonuses,
         deductions = EXCLUDED.deductions, total_payable = EXCLUDED.total_payable,
         status = 'draft', updated_at = NOW()
       RETURNING *`,
      [tenantId, driver.id, input.periodStart, input.periodEnd, baseSalary, tripAllowance,
       overtimeHours, overtimeRate, overtimePay, bonuses, deductions, totalPayable]
    );

    results.push({
      ...mapPayroll(result!),
      driverName: driver.driver_name,
      employeeCode: driver.employee_code,
      tripCount,
    });
  }

  const totals = results.reduce((acc, r) => ({
    driverCount: acc.driverCount + 1,
    totalBaseSalary: acc.totalBaseSalary + r.baseSalary,
    totalTripAllowance: acc.totalTripAllowance + r.tripAllowance,
    totalOvertimePay: acc.totalOvertimePay + r.overtimePay,
    totalBonuses: acc.totalBonuses + r.bonuses,
    totalDeductions: acc.totalDeductions + r.deductions,
    totalPayable: acc.totalPayable + r.totalPayable,
  }), { driverCount: 0, totalBaseSalary: 0, totalTripAllowance: 0, totalOvertimePay: 0, totalBonuses: 0, totalDeductions: 0, totalPayable: 0 });

  return { records: results, totals };
}

export async function listPayroll(tenantId: string, params: {
  driverId?: string; status?: string; startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['p.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.driverId) { conditions.push(`p.driver_id = $${idx}`); values.push(params.driverId); idx++; }
  if (params.status) { conditions.push(`p.status = $${idx}`); values.push(params.status); idx++; }
  if (params.startDate) { conditions.push(`p.period_start >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`p.period_end <= $${idx}`); values.push(params.endDate); idx++; }
  conditions.push(`p.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM driver_payroll p WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT p.*, d.employee_code, u.name AS driver_name, d.status AS driver_status
     FROM driver_payroll p
     JOIN drivers d ON d.id = p.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE ${where}
     ORDER BY p.period_start DESC, d.employee_code
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapPayroll(r),
      driverName: r.driver_name,
      employeeCode: r.employee_code,
      driverStatus: r.driver_status,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function approvePayroll(tenantId: string, id: string) {
  const payroll = await queryOne<PayrollRow>(
    'SELECT id, status FROM driver_payroll WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!payroll) throw new NotFoundError('Payroll record not found');
  if (payroll.status !== 'draft') throw new ConflictError('Payroll is already ' + payroll.status);

  const result = await queryOne<PayrollRow>(
    `UPDATE driver_payroll SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
  );
  return mapPayroll(result!);
}

export async function payPayroll(tenantId: string, id: string, paymentReference: string) {
  const payroll = await queryOne<PayrollRow>(
    'SELECT id, status FROM driver_payroll WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!payroll) throw new NotFoundError('Payroll record not found');
  if (payroll.status === 'paid') throw new ConflictError('Payroll is already paid');

  const result = await queryOne<PayrollRow>(
    `UPDATE driver_payroll SET status = 'paid', paid_at = NOW(), payment_reference = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [paymentReference, id]
  );
  return mapPayroll(result!);
}

export async function getPayrollDetail(tenantId: string, id: string) {
  const row = await queryOne<any>(
    `SELECT p.*, d.employee_code, u.name AS driver_name, d.status AS driver_status,
            dt.name AS driver_license_category
     FROM driver_payroll p
     JOIN drivers d ON d.id = p.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Payroll record not found');

  return {
    ...mapPayroll(row),
    driverName: row.driver_name,
    employeeCode: row.employee_code,
    driverStatus: row.driver_status,
  };
}

export async function getPayrollSummary(tenantId: string, periodStart: string, periodEnd: string) {
  const rows = await query<any>(
    `SELECT status, COUNT(*)::int AS count, SUM(total_payable)::text AS total
     FROM driver_payroll
     WHERE tenant_id = $1 AND period_start = $2 AND period_end = $3 AND deleted_at IS NULL
     GROUP BY status`,
    [tenantId, periodStart, periodEnd]
  );

  const summary: Record<string, { count: number; total: number }> = {};
  rows.forEach((r: any) => {
    summary[r.status] = { count: r.count, total: parseFloat(r.total) };
  });

  return {
    periodStart, periodEnd,
    draft: summary.draft || { count: 0, total: 0 },
    approved: summary.approved || { count: 0, total: 0 },
    paid: summary.paid || { count: 0, total: 0 },
    grandTotal: (summary.draft?.total || 0) + (summary.approved?.total || 0) + (summary.paid?.total || 0),
  };
}
