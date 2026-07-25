import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface LeaveRow {
  id: string;
  tenant_id: string;
  driver_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  documents: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapLeave(row: LeaveRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    driverId: row.driver_id,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    approvedBy: row.approved_by,
    documents: typeof row.documents === 'string' ? JSON.parse(row.documents) : row.documents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function applyLeave(tenantId: string, input: {
  driverId: string; leaveType: string; startDate: string; endDate: string;
  reason?: string; documents?: { name: string; url: string }[];
}) {
  const driver = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const overlapping = await queryOne<{ id: string }>(
    `SELECT id FROM driver_leaves
     WHERE tenant_id = $1 AND driver_id = $2 AND status IN ('pending', 'approved')
       AND deleted_at IS NULL
       AND start_date <= $3 AND end_date >= $4
     LIMIT 1`,
    [tenantId, input.driverId, input.endDate, input.startDate]
  );
  if (overlapping) throw new ConflictError('Leave already exists for this period');

  const result = await queryOne<LeaveRow>(
    `INSERT INTO driver_leaves (tenant_id, driver_id, leave_type, start_date, end_date, reason, documents)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
    [tenantId, input.driverId, input.leaveType, input.startDate, input.endDate,
     input.reason || null, JSON.stringify(input.documents || [])]
  );

  return mapLeave(result!);
}

export async function listLeaves(tenantId: string, params: {
  driverId?: string; status?: string; leaveType?: string;
  startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['l.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.driverId) { conditions.push(`l.driver_id = $${idx}`); values.push(params.driverId); idx++; }
  if (params.status) { conditions.push(`l.status = $${idx}`); values.push(params.status); idx++; }
  if (params.leaveType) { conditions.push(`l.leave_type = $${idx}`); values.push(params.leaveType); idx++; }
  if (params.startDate) { conditions.push(`l.start_date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`l.end_date <= $${idx}`); values.push(params.endDate); idx++; }
  conditions.push(`l.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM driver_leaves l WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT l.*, d.employee_code AS driver_employee_code,
            u.name AS driver_name, d.status AS driver_status,
            approver.name AS approver_name
     FROM driver_leaves l
     JOIN drivers d ON d.id = l.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN users approver ON approver.id = l.approved_by
     WHERE ${where}
     ORDER BY l.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapLeave(r),
      driver: { employeeCode: r.driver_employee_code, name: r.driver_name, status: r.driver_status },
      approverName: r.approver_name,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function approveLeave(tenantId: string, leaveId: string, approvedBy: string) {
  const leave = await queryOne<LeaveRow>(
    'SELECT id, status FROM driver_leaves WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [leaveId, tenantId]
  );
  if (!leave) throw new NotFoundError('Leave not found');
  if (leave.status !== 'pending') throw new ConflictError('Leave is already ' + leave.status);

  const result = await queryOne<LeaveRow>(
    `UPDATE driver_leaves SET status = 'approved', approved_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [approvedBy, leaveId]
  );

  return mapLeave(result!);
}

export async function rejectLeave(tenantId: string, leaveId: string, reason: string) {
  const leave = await queryOne<LeaveRow>(
    'SELECT id, status FROM driver_leaves WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [leaveId, tenantId]
  );
  if (!leave) throw new NotFoundError('Leave not found');
  if (leave.status !== 'pending') throw new ConflictError('Leave is already ' + leave.status);

  const result = await queryOne<LeaveRow>(
    `UPDATE driver_leaves SET status = 'rejected', reason = CASE WHEN reason IS NULL THEN $1 ELSE reason || E'\\nRejection: ' || $1 END, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [reason, leaveId]
  );

  return mapLeave(result!);
}

export async function getLeaveBalance(tenantId: string, driverId: string) {
  const totalAnnual = 30;
  const totalSick = 14;
  const totalEmergency = 10;
  const totalUnpaid = 0;

  const used = await query<any>(
    `SELECT leave_type,
            COALESCE(SUM((end_date - start_date + 1)::int), 0) AS days_used
     FROM driver_leaves
     WHERE tenant_id = $1 AND driver_id = $2 AND status = 'approved'
       AND deleted_at IS NULL AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
     GROUP BY leave_type`,
    [tenantId, driverId]
  );

  const usage: Record<string, number> = {};
  used.forEach((r: any) => { usage[r.leave_type] = parseInt(r.days_used, 10); });

  const allowances: Record<string, { total: number; used: number; remaining: number }> = {
    annual: { total: totalAnnual, used: usage.annual || 0, remaining: Math.max(0, totalAnnual - (usage.annual || 0)) },
    sick: { total: totalSick, used: usage.sick || 0, remaining: Math.max(0, totalSick - (usage.sick || 0)) },
    emergency: { total: totalEmergency, used: usage.emergency || 0, remaining: Math.max(0, totalEmergency - (usage.emergency || 0)) },
    unpaid: { total: Infinity, used: usage.unpaid || 0, remaining: Infinity },
  };

  return { driverId, year: new Date().getFullYear(), allowances };
}

export async function getCalendar(tenantId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const leaves = await query<any>(
    `SELECT l.*, d.employee_code AS driver_employee_code, u.name AS driver_name
     FROM driver_leaves l
     JOIN drivers d ON d.id = l.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE l.tenant_id = $1 AND l.deleted_at IS NULL
       AND l.status IN ('approved', 'pending')
       AND l.start_date <= $2 AND l.end_date >= $3
     ORDER BY d.employee_code, l.start_date`,
    [tenantId, endDate, startDate]
  );

  const activeDrivers = await query<any>(
    `SELECT d.id, d.employee_code, u.name AS driver_name
     FROM drivers d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
     ORDER BY d.employee_code`,
    [tenantId]
  );

  return {
    year, month,
    drivers: activeDrivers.map((d: any) => ({
      id: d.id, employeeCode: d.employee_code, name: d.driver_name,
    })),
    leaves: leaves.map((l: any) => ({
      id: l.id,
      driverId: l.driver_id,
      driverName: l.driver_name,
      driverEmployeeCode: l.driver_employee_code,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
      reason: l.reason,
    })),
  };
}

export async function getActiveLeavesForDriver(tenantId: string, driverId: string, date: string) {
  return query<LeaveRow>(
    `SELECT id FROM driver_leaves
     WHERE tenant_id = $1 AND driver_id = $2 AND status = 'approved'
       AND deleted_at IS NULL AND start_date <= $3 AND end_date >= $3
     LIMIT 1`,
    [tenantId, driverId, date]
  );
}
