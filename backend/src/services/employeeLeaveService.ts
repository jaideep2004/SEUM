import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface EmployeeLeaveRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  documents: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapLeave(row: EmployeeLeaveRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    managerApprovedBy: row.manager_approved_by,
    managerApprovedAt: row.manager_approved_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectionReason: row.rejection_reason,
    documents: typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function applyLeave(tenantId: string, userId: string, input: {
  employeeId: string; leaveType: string; startDate: string; endDate: string;
  reason?: string; documents?: { name: string; url: string }[];
}) {
  const employee = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM employees WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.employeeId, tenantId]
  );
  if (!employee) throw new NotFoundError('Employee not found');

  const overlapping = await queryOne<{ id: string }>(
    `SELECT id FROM employee_leaves
     WHERE tenant_id = $1 AND employee_id = $2 AND status IN ('pending_manager', 'pending_hr', 'approved')
       AND deleted_at IS NULL
       AND start_date <= $3 AND end_date >= $4
     LIMIT 1`,
    [tenantId, input.employeeId, input.endDate, input.startDate]
  );
  if (overlapping) throw new ConflictError('Leave already exists for this period');

  const result = await queryOne<EmployeeLeaveRow>(
    `INSERT INTO employee_leaves (tenant_id, employee_id, leave_type, start_date, end_date, reason, documents, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING *`,
    [tenantId, input.employeeId, input.leaveType, input.startDate, input.endDate,
     input.reason || null, JSON.stringify(input.documents || []), userId]
  );

  return mapLeave(result!);
}

export async function listLeaves(tenantId: string, params: {
  employeeId?: string; status?: string; leaveType?: string; department?: string;
  startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['l.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.employeeId) { conditions.push(`l.employee_id = $${idx}`); values.push(params.employeeId); idx++; }
  if (params.status) { conditions.push(`l.status = $${idx}`); values.push(params.status); idx++; }
  if (params.leaveType) { conditions.push(`l.leave_type = $${idx}`); values.push(params.leaveType); idx++; }
  if (params.department) { conditions.push(`e.department = $${idx}`); values.push(params.department); idx++; }
  if (params.startDate) { conditions.push(`l.start_date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`l.end_date <= $${idx}`); values.push(params.endDate); idx++; }
  conditions.push(`l.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_leaves l JOIN employees e ON e.id = l.employee_id WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT l.*, e.employee_code, e.department AS employee_department,
            u.name AS employee_name, e.status AS employee_status,
            manager.name AS manager_approver_name,
            hr.name AS hr_approver_name,
            rejector.name AS rejector_name
     FROM employee_leaves l
     JOIN employees e ON e.id = l.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN users manager ON manager.id = l.manager_approved_by
     LEFT JOIN users hr ON hr.id = l.approved_by
     LEFT JOIN users rejector ON rejector.id = l.rejected_by
     WHERE ${where}
     ORDER BY l.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapLeave(r),
      employee: {
        employeeCode: r.employee_code,
        name: r.employee_name,
        department: r.employee_department,
        status: r.employee_status,
      },
      managerApproverName: r.manager_approver_name,
      hrApproverName: r.hr_approver_name,
      rejectorName: r.rejector_name,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getLeaveById(tenantId: string, leaveId: string) {
  const row = await queryOne<any>(
    `SELECT l.*, e.employee_code, e.department AS employee_department,
            u.name AS employee_name, e.status AS employee_status,
            manager.name AS manager_approver_name,
            hr.name AS hr_approver_name,
            rejector.name AS rejector_name
     FROM employee_leaves l
     JOIN employees e ON e.id = l.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN users manager ON manager.id = l.manager_approved_by
     LEFT JOIN users hr ON hr.id = l.approved_by
     LEFT JOIN users rejector ON rejector.id = l.rejected_by
     WHERE l.id = $1 AND l.tenant_id = $2 AND l.deleted_at IS NULL`,
    [leaveId, tenantId]
  );
  if (!row) throw new NotFoundError('Leave not found');

  return {
    ...mapLeave(row),
    employee: {
      employeeCode: row.employee_code,
      name: row.employee_name,
      department: row.employee_department,
      status: row.employee_status,
    },
    managerApproverName: row.manager_approver_name,
    hrApproverName: row.hr_approver_name,
    rejectorName: row.rejector_name,
  };
}

export async function managerApproveLeave(tenantId: string, leaveId: string, approvedBy: string) {
  const leave = await queryOne<EmployeeLeaveRow>(
    'SELECT id, status FROM employee_leaves WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [leaveId, tenantId]
  );
  if (!leave) throw new NotFoundError('Leave not found');
  if (leave.status !== 'pending_manager') throw new ConflictError('Manager approval only applies to pending leave');

  const result = await queryOne<EmployeeLeaveRow>(
    `UPDATE employee_leaves
     SET status = 'pending_hr', manager_approved_by = $1, manager_approved_at = NOW(), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [approvedBy, leaveId]
  );

  return mapLeave(result!);
}

export async function approveLeave(tenantId: string, leaveId: string, approvedBy: string) {
  const leave = await queryOne<EmployeeLeaveRow>(
    'SELECT id, status FROM employee_leaves WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [leaveId, tenantId]
  );
  if (!leave) throw new NotFoundError('Leave not found');
  if (leave.status !== 'pending_hr') throw new ConflictError('HR approval only applies to manager-approved leave');

  const result = await queryOne<EmployeeLeaveRow>(
    `UPDATE employee_leaves
     SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [approvedBy, leaveId]
  );

  return mapLeave(result!);
}

export async function rejectLeave(tenantId: string, leaveId: string, rejectedBy: string, reason: string) {
  const leave = await queryOne<EmployeeLeaveRow>(
    'SELECT id, status FROM employee_leaves WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [leaveId, tenantId]
  );
  if (!leave) throw new NotFoundError('Leave not found');
  if (leave.status === 'approved' || leave.status === 'rejected') throw new ConflictError('Leave is already ' + leave.status);

  const result = await queryOne<EmployeeLeaveRow>(
    `UPDATE employee_leaves
     SET status = 'rejected', rejected_by = $1, rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [rejectedBy, reason, leaveId]
  );

  return mapLeave(result!);
}

export async function getLeaveBalance(tenantId: string, employeeId: string) {
  const allowances: Record<string, number> = {
    annual: 30, sick: 14, emergency: 10, maternity: 90, paternity: 10, unpaid: 0,
  };

  const used = await query<any>(
    `SELECT leave_type,
            COALESCE(SUM((end_date - start_date + 1)::int), 0) AS days_used
     FROM employee_leaves
     WHERE tenant_id = $1 AND employee_id = $2 AND status = 'approved'
       AND deleted_at IS NULL AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
     GROUP BY leave_type`,
    [tenantId, employeeId]
  );

  const usage: Record<string, number> = {};
  used.forEach((r: any) => { usage[r.leave_type] = parseInt(r.days_used, 10); });

  const result: Record<string, { total: number; used: number; remaining: number }> = {};
  for (const [type, total] of Object.entries(allowances)) {
    const usedDays = usage[type] || 0;
    result[type] = {
      total,
      used: usedDays,
      remaining: total === 0 ? usedDays : Math.max(0, total - usedDays),
    };
  }

  return { employeeId, year: new Date().getFullYear(), allowances: result };
}

export async function getCalendar(tenantId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const leaves = await query<any>(
    `SELECT l.*, e.employee_code, u.name AS employee_name
     FROM employee_leaves l
     JOIN employees e ON e.id = l.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE l.tenant_id = $1 AND l.deleted_at IS NULL
       AND l.status IN ('approved', 'pending_hr', 'pending_manager')
       AND l.start_date <= $2 AND l.end_date >= $3
     ORDER BY e.employee_code, l.start_date`,
    [tenantId, endDate, startDate]
  );

  const activeEmployees = await query<any>(
    `SELECT e.id, e.employee_code, u.name AS employee_name
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.status = 'active'
     ORDER BY e.employee_code`,
    [tenantId]
  );

  return {
    year, month,
    employees: activeEmployees.map((e: any) => ({
      id: e.id, employeeCode: e.employee_code, name: e.employee_name,
    })),
    leaves: leaves.map((l: any) => ({
      id: l.id,
      employeeId: l.employee_id,
      employeeName: l.employee_name,
      employeeCode: l.employee_code,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
      reason: l.reason,
    })),
  };
}

export async function getActiveLeavesForEmployee(tenantId: string, employeeId: string, date: string) {
  return query<EmployeeLeaveRow>(
    `SELECT id FROM employee_leaves
     WHERE tenant_id = $1 AND employee_id = $2 AND status = 'approved'
       AND deleted_at IS NULL AND start_date <= $3 AND end_date >= $3
     LIMIT 1`,
    [tenantId, employeeId, date]
  );
}
