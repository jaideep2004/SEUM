import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface AttendanceRow {
  id: string;
  tenant_id: string;
  driver_id: string;
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

interface AttendanceWithDriverRow extends AttendanceRow {
  driver_employee_code: string;
  driver_name: string;
  driver_license_number: string;
  driver_photo_url: string | null;
  driver_status: string;
}

function mapAttendance(row: AttendanceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    driverId: row.driver_id,
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

function mapAttendanceWithDriver(row: AttendanceWithDriverRow) {
  return {
    ...mapAttendance(row),
    driver: {
      employeeCode: row.driver_employee_code,
      name: row.driver_name,
      licenseNumber: row.driver_license_number,
      photoUrl: row.driver_photo_url,
      status: row.driver_status,
    },
  };
}

function calcLateMinutes(checkInISO: string): number {
  const d = new Date(checkInISO);
  return Math.max(0, (d.getUTCHours() - 3) * 60 + d.getUTCMinutes());
}

export async function checkIn(tenantId: string, driverId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await queryOne<AttendanceRow>(
    'SELECT id, check_in_time, status FROM driver_attendance WHERE tenant_id = $1 AND driver_id = $2 AND date = $3 AND deleted_at IS NULL',
    [tenantId, driverId, today]
  );

  if (existing?.check_in_time) {
    throw new ConflictError('Already checked in today');
  }

  const now = new Date().toISOString();
  const late = calcLateMinutes(now);

  if (existing) {
    await query(
      'UPDATE driver_attendance SET check_in_time = $1, status = $2, late_minutes = $3, updated_at = NOW() WHERE id = $4',
      [now, late > 0 ? 'late' : 'present', late, existing.id]
    );
    return { id: existing.id, checkedIn: true, checkInTime: now, status: late > 0 ? 'late' : 'present', lateMinutes: late };
  }

  const result = await queryOne<AttendanceRow>(
    `INSERT INTO driver_attendance (tenant_id, driver_id, date, check_in_time, status, late_minutes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tenantId, driverId, today, now, late > 0 ? 'late' : 'present', late]
  );

  return mapAttendance(result!);
}

export async function checkOut(tenantId: string, driverId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const record = await queryOne<AttendanceRow>(
    'SELECT id, check_in_time, check_out_time FROM driver_attendance WHERE tenant_id = $1 AND driver_id = $2 AND date = $3 AND deleted_at IS NULL',
    [tenantId, driverId, today]
  );

  if (!record) throw new NotFoundError('No check-in record found for today');
  if (record.check_out_time) throw new ConflictError('Already checked out today');

  const now = new Date().toISOString();
  await query(
    'UPDATE driver_attendance SET check_out_time = $1, updated_at = NOW() WHERE id = $2',
    [now, record.id]
  );

  return { id: record.id, checkedOut: true, checkOutTime: now };
}

export async function listAttendance(tenantId: string, params: {
  date?: string; driverId?: string; status?: string;
  startDate?: string; endDate?: string;
  page: number; pageSize: number;
}) {
  const conditions: string[] = ['a.deleted_at IS NULL', 'd.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.date) {
    conditions.push(`a.date = $${idx}`); values.push(params.date); idx++;
  }
  if (params.driverId) {
    conditions.push(`a.driver_id = $${idx}`); values.push(params.driverId); idx++;
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
    `SELECT COUNT(*) FROM driver_attendance a JOIN drivers d ON d.id = a.driver_id WHERE ${where}`,
    values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<AttendanceWithDriverRow>(
    `SELECT a.*, d.employee_code AS driver_employee_code,
            u.name AS driver_name, d.license_number AS driver_license_number,
            d.photo_url AS driver_photo_url, d.status AS driver_status
     FROM driver_attendance a
     JOIN drivers d ON d.id = a.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE ${where}
     ORDER BY a.date DESC, d.employee_code ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map(mapAttendanceWithDriver),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function manualCorrection(tenantId: string, input: {
  driverId: string; date: string; status: string;
  checkInTime?: string; checkOutTime?: string;
  lateMinutes?: number; notes?: string;
}) {
  const existing = await queryOne<AttendanceRow>(
    'SELECT id FROM driver_attendance WHERE tenant_id = $1 AND driver_id = $2 AND date = $3 AND deleted_at IS NULL',
    [tenantId, input.driverId, input.date]
  );

  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    updates.push(`status = $${idx}`); values.push(input.status); idx++;
    if (input.checkInTime) { updates.push(`check_in_time = $${idx}`); values.push(input.checkInTime); idx++; }
    if (input.checkOutTime) { updates.push(`check_out_time = $${idx}`); values.push(input.checkOutTime); idx++; }
    if (input.lateMinutes !== undefined) { updates.push(`late_minutes = $${idx}`); values.push(input.lateMinutes); idx++; }
    if (input.notes !== undefined) { updates.push(`notes = $${idx}`); values.push(input.notes); idx++; }
    updates.push('updated_at = NOW()');

    values.push(existing.id);
    await query(
      `UPDATE driver_attendance SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    const updated = await queryOne<AttendanceRow>('SELECT * FROM driver_attendance WHERE id = $1', [existing.id]);
    return updated ? mapAttendance(updated) : null;
  }

  const result = await queryOne<AttendanceRow>(
    `INSERT INTO driver_attendance (tenant_id, driver_id, date, check_in_time, check_out_time, status, late_minutes, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [tenantId, input.driverId, input.date, input.checkInTime || null, input.checkOutTime || null,
     input.status, input.lateMinutes || 0, input.notes || null]
  );

  return mapAttendance(result!);
}

export async function getMonthlySummary(tenantId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  const totalDrivers = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM drivers WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
    [tenantId]
  );

  const rows = await query<any>(
    `SELECT a.status, COUNT(*)::int AS count
     FROM driver_attendance a
     WHERE a.tenant_id = $1 AND a.date >= $2 AND a.date < ($2::date + INTERVAL '1 month')::date AND a.deleted_at IS NULL
     GROUP BY a.status`,
    [tenantId, startDate]
  );

  const summary: Record<string, number> = {};
  rows.forEach((r: any) => { summary[r.status] = r.count; });

  return {
    year, month,
    totalDrivers: parseInt(totalDrivers?.count || '0', 10),
    present: summary.present || 0,
    absent: summary.absent || 0,
    late: summary.late || 0,
    halfDay: summary.half_day || 0,
    onLeave: summary.on_leave || 0,
    onTrip: summary.on_trip || 0,
    totalRecords: Object.values(summary).reduce((a, b) => a + b, 0),
  };
}

export async function autoDetect(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const driversOnTrip = await query<any>(
    `SELECT DISTINCT d.id, d.tenant_id
     FROM drivers d
     JOIN trips t ON t.driver_id = d.id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status = 'active'
       AND t.scheduled_date = $2 AND t.deleted_at IS NULL AND t.status IN ('scheduled', 'en_route')
       AND NOT EXISTS (
         SELECT 1 FROM driver_attendance da
         WHERE da.driver_id = d.id AND da.date = $2 AND da.deleted_at IS NULL
       )`,
    [tenantId, today]
  );

  let created = 0;
  for (const driver of driversOnTrip) {
    await query(
      `INSERT INTO driver_attendance (tenant_id, driver_id, date, status)
       VALUES ($1, $2, $3, 'on_trip')
       ON CONFLICT (tenant_id, driver_id, date) DO NOTHING`,
      [tenantId, driver.id, today]
    );
    created++;
  }

  return { autoCheckedIn: created };
}

export async function getTodayDashboard(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::int AS count
     FROM driver_attendance WHERE tenant_id = $1 AND date = $2 AND deleted_at IS NULL
     GROUP BY status`,
    [tenantId, today]
  );

  const summary: Record<string, number> = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, on_trip: 0 };
  rows.forEach(r => { summary[r.status] = parseInt(r.count, 10); });

  const totalDrivers = parseInt(
    (await queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM drivers WHERE tenant_id = $1 AND deleted_at IS NULL AND status IN ('active', 'on_leave')`,
      [tenantId]
    ))?.count || '0', 10
  );

  const recorded = Object.values(summary).reduce((a, b) => a + b, 0);

  return {
    date: today, totalDrivers,
    present: summary.present, absent: summary.absent, late: summary.late,
    halfDay: summary.half_day, onLeave: summary.on_leave, onTrip: summary.on_trip,
    notRecorded: totalDrivers - recorded,
    checkedIn: summary.present + summary.on_trip,
    absentOrLate: summary.absent + summary.late,
  };
}
