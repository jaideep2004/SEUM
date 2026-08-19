import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { UpsertSalaryStructureInput, UpdateSalaryStructureInput } from '../validators/employeePayroll';

interface SalaryStructureRow {
  id: string; tenant_id: string; employee_id: string;
  basic_salary: string; housing_allowance: string; transport_allowance: string; other_allowances: string;
  insurance_deduction: string; loan_deduction: string; penalty_deductions: string;
  effective_from: string | null; created_at: string; updated_at: string; deleted_at: string | null;
}

interface PayrollRow {
  id: string; tenant_id: string; employee_id: string;
  period_start: string; period_end: string;
  basic_salary: string; housing_allowance: string; transport_allowance: string; other_allowances: string;
  total_allowances: string; insurance_deduction: string; loan_deduction: string; penalty_deductions: string;
  total_deductions: string; total_payable: string;
  status: string; paid_at: string | null; payment_reference: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

function mapStructure(row: any) {
  return {
    id: row.id, tenantId: row.tenant_id, employeeId: row.employee_id,
    basicSalary: parseFloat(row.basic_salary),
    housingAllowance: parseFloat(row.housing_allowance),
    transportAllowance: parseFloat(row.transport_allowance),
    otherAllowances: parseFloat(row.other_allowances),
    totalAllowances: parseFloat(row.housing_allowance) + parseFloat(row.transport_allowance) + parseFloat(row.other_allowances),
    insuranceDeduction: parseFloat(row.insurance_deduction),
    loanDeduction: parseFloat(row.loan_deduction),
    penaltyDeductions: parseFloat(row.penalty_deductions),
    totalDeductions: parseFloat(row.insurance_deduction) + parseFloat(row.loan_deduction) + parseFloat(row.penalty_deductions),
    effectiveFrom: row.effective_from,
    name: row.employee_name || null,
    employeeCode: row.employee_code || null,
    department: row.employee_department || null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapPayroll(row: PayrollRow) {
  return {
    id: row.id, tenantId: row.tenant_id, employeeId: row.employee_id,
    periodStart: row.period_start, periodEnd: row.period_end,
    basicSalary: parseFloat(row.basic_salary),
    housingAllowance: parseFloat(row.housing_allowance),
    transportAllowance: parseFloat(row.transport_allowance),
    otherAllowances: parseFloat(row.other_allowances),
    totalAllowances: parseFloat(row.total_allowances),
    insuranceDeduction: parseFloat(row.insurance_deduction),
    loanDeduction: parseFloat(row.loan_deduction),
    penaltyDeductions: parseFloat(row.penalty_deductions),
    totalDeductions: parseFloat(row.total_deductions),
    totalPayable: parseFloat(row.total_payable),
    status: row.status, paidAt: row.paid_at, paymentReference: row.payment_reference,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// ─── Salary Structures ───

export async function upsertSalaryStructure(tenantId: string, input: UpsertSalaryStructureInput) {
  const employee = await queryOne<{ id: string }>(
    'SELECT id FROM employees WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.employee_id, tenantId]
  );
  if (!employee) throw new NotFoundError('Employee not found');

  const row = await queryOne<any>(
    `INSERT INTO employee_salary_structures
       (tenant_id, employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances,
        insurance_deduction, loan_deduction, penalty_deductions, effective_from)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (tenant_id, employee_id) DO UPDATE SET
       basic_salary = EXCLUDED.basic_salary, housing_allowance = EXCLUDED.housing_allowance,
       transport_allowance = EXCLUDED.transport_allowance, other_allowances = EXCLUDED.other_allowances,
       insurance_deduction = EXCLUDED.insurance_deduction, loan_deduction = EXCLUDED.loan_deduction,
       penalty_deductions = EXCLUDED.penalty_deductions, effective_from = EXCLUDED.effective_from,
       updated_at = NOW()
     RETURNING *`,
    [tenantId, input.employee_id, input.basic_salary, input.housing_allowance, input.transport_allowance,
     input.other_allowances, input.insurance_deduction, input.loan_deduction, input.penalty_deductions,
     input.effective_from || null]
  );

  return mapStructure(row!);
}

export async function listSalaryStructures(tenantId: string, params: { employeeId?: string; page: number; pageSize: number }) {
  const conditions: string[] = ['s.deleted_at IS NULL', 'e.deleted_at IS NULL', 's.tenant_id = $1'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.employeeId) {
    conditions.push(`s.employee_id = $${idx}`); values.push(params.employeeId); idx++;
  }

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_salary_structures s JOIN employees e ON e.id = s.employee_id WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT s.*, u.name AS employee_name, e.employee_code, e.department AS employee_department
     FROM employee_salary_structures s
     JOIN employees e ON e.id = s.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${where}
     ORDER BY e.employee_code
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return { data: rows.map(mapStructure), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getSalaryStructure(tenantId: string, id: string) {
  const row = await queryOne<any>(
    `SELECT s.*, u.name AS employee_name, e.employee_code, e.department AS employee_department
     FROM employee_salary_structures s
     JOIN employees e ON e.id = s.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Salary structure not found');
  return mapStructure(row);
}

export async function updateSalaryStructure(tenantId: string, id: string, input: UpdateSalaryStructureInput) {
  await getSalaryStructure(tenantId, id);

  const setClauses: string[] = [];
  const setValues: any[] = [];
  let idx = 1;

  const updateMap: Record<string, number | string | undefined> = {
    basic_salary: input.basic_salary, housing_allowance: input.housing_allowance,
    transport_allowance: input.transport_allowance, other_allowances: input.other_allowances,
    insurance_deduction: input.insurance_deduction, loan_deduction: input.loan_deduction,
    penalty_deductions: input.penalty_deductions, effective_from: input.effective_from,
  };

  for (const [col, val] of Object.entries(updateMap)) {
    if (val !== undefined) {
      setClauses.push(`${col} = $${idx}`);
      setValues.push(val);
      idx++;
    }
  }

  if (setClauses.length === 0) return getSalaryStructure(tenantId, id);

  setValues.push(id, tenantId);
  await query(
    `UPDATE employee_salary_structures SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL`,
    setValues
  );

  return getSalaryStructure(tenantId, id);
}

// ─── Payroll ───

export async function generatePayroll(tenantId: string, input: { periodStart: string; periodEnd: string; employeeIds?: string[] }) {
  const employees = await query<any>(
    `SELECT e.id, e.employee_code, e.department, u.name AS employee_name,
            s.basic_salary, s.housing_allowance, s.transport_allowance, s.other_allowances,
            s.insurance_deduction, s.loan_deduction, s.penalty_deductions
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN employee_salary_structures s ON s.employee_id = e.id AND s.deleted_at IS NULL
     WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.status IN ('active', 'on_leave')
     ${input.employeeIds ? 'AND e.id = ANY($2::uuid[])' : ''}
     ORDER BY e.employee_code`,
    input.employeeIds ? [tenantId, input.employeeIds] : [tenantId]
  );

  const records: any[] = [];
  const skipped: any[] = [];

  for (const emp of employees) {
    if (!emp.basic_salary) {
      skipped.push({ id: emp.id, name: emp.employee_name, employeeCode: emp.employee_code });
      continue;
    }

    const basicSalary = parseFloat(emp.basic_salary);
    const housing = parseFloat(emp.housing_allowance || 0);
    const transport = parseFloat(emp.transport_allowance || 0);
    const other = parseFloat(emp.other_allowances || 0);
    const totalAllowances = housing + transport + other;
    const insurance = parseFloat(emp.insurance_deduction || 0);
    const loan = parseFloat(emp.loan_deduction || 0);
    const penalties = parseFloat(emp.penalty_deductions || 0);
    const totalDeductions = insurance + loan + penalties;
    const totalPayable = basicSalary + totalAllowances - totalDeductions;

    const result = await queryOne<PayrollRow>(
      `INSERT INTO employee_payroll (tenant_id, employee_id, period_start, period_end,
        basic_salary, housing_allowance, transport_allowance, other_allowances, total_allowances,
        insurance_deduction, loan_deduction, penalty_deductions, total_deductions, total_payable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (tenant_id, employee_id, period_start, period_end) DO UPDATE SET
         basic_salary = EXCLUDED.basic_salary, housing_allowance = EXCLUDED.housing_allowance,
         transport_allowance = EXCLUDED.transport_allowance, other_allowances = EXCLUDED.other_allowances,
         total_allowances = EXCLUDED.total_allowances, insurance_deduction = EXCLUDED.insurance_deduction,
         loan_deduction = EXCLUDED.loan_deduction, penalty_deductions = EXCLUDED.penalty_deductions,
         total_deductions = EXCLUDED.total_deductions, total_payable = EXCLUDED.total_payable,
         status = 'draft', updated_at = NOW()
       RETURNING *`,
      [tenantId, emp.id, input.periodStart, input.periodEnd, basicSalary, housing, transport, other,
       totalAllowances, insurance, loan, penalties, totalDeductions, totalPayable]
    );

    records.push({
      ...mapPayroll(result!),
      name: emp.employee_name,
      employeeCode: emp.employee_code,
      department: emp.department,
    });
  }

  const totals = records.reduce((acc, r) => ({
    employeeCount: acc.employeeCount + 1,
    totalBasicSalary: acc.totalBasicSalary + r.basicSalary,
    totalAllowances: acc.totalAllowances + r.totalAllowances,
    totalDeductions: acc.totalDeductions + r.totalDeductions,
    totalPayable: acc.totalPayable + r.totalPayable,
  }), { employeeCount: 0, totalBasicSalary: 0, totalAllowances: 0, totalDeductions: 0, totalPayable: 0 });

  return { records, skipped, totals };
}

export async function listPayroll(tenantId: string, params: {
  employeeId?: string; status?: string; periodStart?: string; periodEnd?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['p.deleted_at IS NULL', 'p.tenant_id = $1'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.employeeId) { conditions.push(`p.employee_id = $${idx}`); values.push(params.employeeId); idx++; }
  if (params.status) { conditions.push(`p.status = $${idx}`); values.push(params.status); idx++; }
  if (params.periodStart) { conditions.push(`p.period_start >= $${idx}`); values.push(params.periodStart); idx++; }
  if (params.periodEnd) { conditions.push(`p.period_end <= $${idx}`); values.push(params.periodEnd); idx++; }

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_payroll p WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT p.*, u.name AS employee_name, e.employee_code, e.department AS employee_department, e.status AS employee_status
     FROM employee_payroll p
     JOIN employees e ON e.id = p.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${where}
     ORDER BY p.period_start DESC, e.employee_code
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({ ...mapPayroll(r), name: r.employee_name, employeeCode: r.employee_code, department: r.employee_department, employeeStatus: r.employee_status })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getPayrollDetail(tenantId: string, id: string) {
  const row = await queryOne<any>(
    `SELECT p.*, u.name AS employee_name, e.employee_code, e.department AS employee_department, e.status AS employee_status
     FROM employee_payroll p
     JOIN employees e ON e.id = p.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Payroll record not found');

  return { ...mapPayroll(row), name: row.employee_name, employeeCode: row.employee_code, department: row.employee_department, employeeStatus: row.employee_status };
}

export async function approvePayroll(tenantId: string, id: string) {
  const payroll = await queryOne<PayrollRow>(
    'SELECT id, status FROM employee_payroll WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!payroll) throw new NotFoundError('Payroll record not found');
  if (payroll.status !== 'draft') throw new ConflictError('Payroll is already ' + payroll.status);

  const result = await queryOne<PayrollRow>(
    `UPDATE employee_payroll SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
  );
  return mapPayroll(result!);
}

export async function payPayroll(tenantId: string, id: string, paymentReference: string) {
  const payroll = await queryOne<PayrollRow>(
    'SELECT id, status FROM employee_payroll WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!payroll) throw new NotFoundError('Payroll record not found');
  if (payroll.status === 'paid') throw new ConflictError('Payroll is already paid');

  const result = await queryOne<PayrollRow>(
    `UPDATE employee_payroll SET status = 'paid', paid_at = NOW(), payment_reference = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [paymentReference, id]
  );
  return mapPayroll(result!);
}

export async function getPayrollSummary(tenantId: string, periodStart: string, periodEnd: string) {
  const rows = await query<any>(
    `SELECT status, COUNT(*)::int AS count, SUM(total_payable)::text AS total
     FROM employee_payroll
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
