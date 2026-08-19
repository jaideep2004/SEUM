import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface AttendanceRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  late_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AttendanceWithEmployeeRow extends AttendanceRow {
  employee_code: string | null;
  employee_name: string | null;
  employee_department: string;
  employee_designation: string | null;
  employee_status: string;
}

function mapAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    employeeId: row.employee_id,
    date: row.date,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    status: row.status,
    lateMinutes: row.late_minutes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttendanceWithEmployee(row: AttendanceWithEmployeeRow) {
  return {
    ...mapAttendance(row),
    employee: {
      employeeCode: row.employee_code,
      name: row.employee_name,
      department: row.employee_department,
      designation: row.employee_designation,
      status: row.employee_status,
    },
  };
}

function calcLateMinutes(checkInISO: string): number {
  const d = new Date(checkInISO);
  return Math.max(0, (d.getUTCHours() - 3) * 60 + d.getUTCMinutes());
}

export async function checkIn(tenantId: string, employeeId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await queryOne<AttendanceRow>(
    'SELECT id, check_in_time, status FROM employee_attendance WHERE tenant_id = $1 AND employee_id = $2 AND date = $3 AND deleted_at IS NULL',
    [tenantId, employeeId, today]
  );

  if (existing?.check_in_time) {
    throw new ConflictError('Already checked in today');
  }

  const now = new Date().toISOString();
  const late = calcLateMinutes(now);

  if (existing) {
    await query(
      'UPDATE employee_attendance SET check_in_time = $1, status = $2, late_minutes = $3, updated_at = NOW() WHERE id = $4',
      [now, late > 0 ? 'late' : 'present', late, existing.id]
    );
    return { id: existing.id, checkedIn: true, checkInTime: now, status: late > 0 ? 'late' : 'present', lateMinutes: late };
  }

  const result = await queryOne<AttendanceRow>(
    `INSERT INTO employee_attendance (tenant_id, employee_id, date, check_in_time, status, late_minutes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tenantId, employeeId, today, now, late > 0 ? 'late' : 'present', late]
  );

  return mapAttendance(result!);
}

export async function checkOut(tenantId: string, employeeId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const record = await queryOne<AttendanceRow>(
    'SELECT id, check_in_time, check_out_time FROM employee_attendance WHERE tenant_id = $1 AND employee_id = $2 AND date = $3 AND deleted_at IS NULL',
    [tenantId, employeeId, today]
  );

  if (!record) throw new NotFoundError('No check-in record found for today');
  if (record.check_out_time) throw new ConflictError('Already checked out today');

  const now = new Date().toISOString();
  await query(
    'UPDATE employee_attendance SET check_out_time = $1, updated_at = NOW() WHERE id = $2',
    [now, record.id]
  );

  return { id: record.id, checkedOut: true, checkOutTime: now };
}

export async function listAttendance(tenantId: string, params: {
  date?: string; employeeId?: string; status?: string;
  startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['a.deleted_at IS NULL', 'e.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.date) {
    conditions.push(`a.date = $${idx}`); values.push(params.date); idx++;
  }
  if (params.employeeId) {
    conditions.push(`a.employee_id = $${idx}`); values.push(params.employeeId); idx++;
  }
  if (params.status) {
    conditions.push(`a.status = $${idx}`); values.push(params.status); idx++;
  }
  if (params.startDate) {
    conditions.push(`a.date >= $${idx}`); values.push(params.startDate); idx++;
  }
  if (params.endDate) {
    conditions.push(`a.date <= $${idx}`); values.push(params.endDate); idx++;
  }

  conditions.push(`a.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employee_attendance a JOIN employees e ON e.id = a.employee_id WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<AttendanceWithEmployeeRow>(
    `SELECT a.*, e.employee_code, u.name AS employee_name,
            e.department AS employee_department, e.designation AS employee_designation,
            e.status AS employee_status
     FROM employee_attendance a
     JOIN employees e ON e.id = a.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE ${where}
     ORDER BY a.date DESC, e.employee_code ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map(mapAttendanceWithEmployee),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getMonthlySummary(tenantId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  const totalEmployees = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [tenantId]
  );

  const rows = await query<any>(
    `SELECT a.status, COUNT(*)::int AS count
     FROM employee_attendance a
     WHERE a.tenant_id = $1 AND a.date >= $2 AND a.date < ($2::date + INTERVAL '1 month')::date AND a.deleted_at IS NULL
     GROUP BY a.status`,
    [tenantId, startDate]
  );

  const summary: Record<string, number> = {};
  rows.forEach((r: any) => { summary[r.status] = r.count; });

  return {
    year, month,
    totalEmployees: parseInt(totalEmployees?.count || '0', 10),
    present: summary.present || 0,
    absent: summary.absent || 0,
    late: summary.late || 0,
    halfDay: summary.half_day || 0,
    onLeave: summary.on_leave || 0,
    totalRecords: Object.values(summary).reduce((a, b) => a + b, 0),
  };
}
