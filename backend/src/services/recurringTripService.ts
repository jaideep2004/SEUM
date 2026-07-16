import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { CreateRecurringTripPatternInput, UpdateRecurringTripPatternInput, RecurringTripPatternQuery, GenerateTripsInput } from '../validators/operations';

interface PatternRow {
  id: string; tenant_id: string; route_id: string; bus_id: string | null;
  driver_id: string | null; trip_type: string; frequency: string;
  days_of_week: number[] | null; scheduled_start_time: string;
  scheduled_end_time: string | null; start_date: string; end_date: string | null;
  specific_dates: string[] | null; notes: string | null; is_active: boolean;
  last_generated_at: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

function mapPattern(row: PatternRow, extra?: {
  routeName?: string; busPlate?: string; driverName?: string;
  origin?: string; destination?: string;
}) {
  return {
    id: row.id, tenantId: row.tenant_id, routeId: row.route_id,
    busId: row.bus_id, driverId: row.driver_id,
    tripType: row.trip_type, frequency: row.frequency,
    daysOfWeek: row.days_of_week || [],
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    startDate: row.start_date, endDate: row.end_date,
    specificDates: row.specific_dates || [],
    notes: row.notes, isActive: row.is_active,
    lastGeneratedAt: row.last_generated_at,
    createdBy: row.created_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
    ...extra,
  };
}

export async function createPattern(tenantId: string, userId: string, input: CreateRecurringTripPatternInput) {
  const route = await queryOne('SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.routeId, tenantId]);
  if (!route) throw new NotFoundError('Route not found');

  if (input.busId) {
    const bus = await queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.busId, tenantId]);
    if (!bus) throw new NotFoundError('Bus not found');
  }

  const id = uuid();
  const row = await queryOne<PatternRow>(
    `INSERT INTO recurring_trip_patterns
     (id, tenant_id, route_id, bus_id, driver_id, trip_type, frequency,
      days_of_week, scheduled_start_time, scheduled_end_time,
      start_date, end_date, specific_dates, notes, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [id, tenantId, input.routeId, input.busId || null, input.driverId || null,
     input.tripType, input.frequency, input.daysOfWeek || null,
     input.scheduledStartTime, input.scheduledEndTime || null,
     input.startDate, input.endDate || null, input.specificDates || null,
     input.notes || null, input.isActive, userId]
  );
  if (!row) throw new Error('Failed to create pattern');
  return mapPattern(row);
}

export async function listPatterns(tenantId: string, queryParams: RecurringTripPatternQuery) {
  const conditions = ['p.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (queryParams.isActive !== undefined) {
    conditions.push(`p.is_active = $${idx++}`);
    params.push(queryParams.isActive);
  }
  if (queryParams.frequency) {
    conditions.push(`p.frequency = $${idx++}`);
    params.push(queryParams.frequency);
  }
  if (queryParams.search) {
    conditions.push(`(r.name ILIKE $${idx} OR r.code ILIKE $${idx} OR p.trip_type ILIKE $${idx})`);
    params.push(`%${queryParams.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM recurring_trip_patterns p
     LEFT JOIN routes r ON r.id = p.route_id WHERE ${where}`, params
  );
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  params.push(queryParams.pageSize, offset);
  const rows = await query<any>(
    `SELECT p.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM recurring_trip_patterns p
     LEFT JOIN routes r ON r.id = p.route_id
     LEFT JOIN buses b ON b.id = p.bus_id
     LEFT JOIN users u ON u.id = p.driver_id
     WHERE ${where} ORDER BY p.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: rows.map((r: any) => ({
      id: r.id, routeId: r.route_id, busId: r.bus_id, driverId: r.driver_id,
      tripType: r.trip_type, frequency: r.frequency,
      daysOfWeek: r.days_of_week || [],
      scheduledStartTime: r.scheduled_start_time,
      scheduledEndTime: r.scheduled_end_time,
      startDate: r.start_date, endDate: r.end_date,
      specificDates: r.specific_dates || [],
      notes: r.notes, isActive: r.is_active,
      lastGeneratedAt: r.last_generated_at,
      createdAt: r.created_at, updatedAt: r.updated_at,
      routeName: r.route_name, origin: r.origin, destination: r.destination,
      busPlate: r.plate_number, driverName: r.driver_name,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function getPatternById(tenantId: string, patternId: string) {
  const row = await queryOne<any>(
    `SELECT p.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM recurring_trip_patterns p
     LEFT JOIN routes r ON r.id = p.route_id
     LEFT JOIN buses b ON b.id = p.bus_id
     LEFT JOIN users u ON u.id = p.driver_id
     WHERE p.id = $1 AND p.tenant_id = $2`,
    [patternId, tenantId]
  );
  if (!row) throw new NotFoundError('Recurring trip pattern not found');
  return {
    id: row.id, tenantId: row.tenant_id, routeId: row.route_id,
    busId: row.bus_id, driverId: row.driver_id,
    tripType: row.trip_type, frequency: row.frequency,
    daysOfWeek: row.days_of_week || [],
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    startDate: row.start_date, endDate: row.end_date,
    specificDates: row.specific_dates || [],
    notes: row.notes, isActive: row.is_active,
    lastGeneratedAt: row.last_generated_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
    routeName: row.route_name, origin: row.origin, destination: row.destination,
    busPlate: row.plate_number, driverName: row.driver_name,
  };
}

export async function updatePattern(tenantId: string, patternId: string, input: UpdateRecurringTripPatternInput) {
  const existing = await queryOne<PatternRow>(
    'SELECT id FROM recurring_trip_patterns WHERE id = $1 AND tenant_id = $2', [patternId, tenantId]
  );
  if (!existing) throw new NotFoundError('Recurring trip pattern not found');

  if (input.routeId) {
    const route = await queryOne('SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.routeId, tenantId]);
    if (!route) throw new NotFoundError('Route not found');
  }

  const fieldMap: Record<string, string> = {
    routeId: 'route_id', busId: 'bus_id', driverId: 'driver_id',
    tripType: 'trip_type', frequency: 'frequency',
    daysOfWeek: 'days_of_week', scheduledStartTime: 'scheduled_start_time',
    scheduledEndTime: 'scheduled_end_time', startDate: 'start_date',
    endDate: 'end_date', specificDates: 'specific_dates',
    notes: 'notes', isActive: 'is_active',
  };
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;
  for (const [key, col] of Object.entries(fieldMap)) {
    if ((input as any)[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push((input as any)[key]);
    }
  }
  if (fields.length === 0) return getPatternById(tenantId, patternId);

  fields.push('updated_at = NOW()');
  params.push(patternId, tenantId);
  await query(`UPDATE recurring_trip_patterns SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1}`, params);
  return getPatternById(tenantId, patternId);
}

export async function deletePattern(tenantId: string, patternId: string) {
  const existing = await queryOne<PatternRow>(
    'SELECT id FROM recurring_trip_patterns WHERE id = $1 AND tenant_id = $2', [patternId, tenantId]
  );
  if (!existing) throw new NotFoundError('Recurring trip pattern not found');
  await query('DELETE FROM recurring_trip_patterns WHERE id = $1 AND tenant_id = $2', [patternId, tenantId]);
  return { id: patternId, deleted: true };
}

function getDaysForFrequency(frequency: string, daysOfWeek: number[]): number[] {
  if (frequency === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  if (frequency === 'weekdays') return [1, 2, 3, 4, 5];
  if (frequency === 'weekends') return [0, 6];
  return daysOfWeek;
}

export async function generateTrips(tenantId: string, userId: string, patternId: string, input: GenerateTripsInput) {
  const pattern = await queryOne<any>(
    `SELECT p.*, r.name AS route_name, b.plate_number,
            CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM recurring_trip_patterns p
     LEFT JOIN routes r ON r.id = p.route_id
     LEFT JOIN buses b ON b.id = p.bus_id
     LEFT JOIN users u ON u.id = p.driver_id
     WHERE p.id = $1 AND p.tenant_id = $2`,
    [patternId, tenantId]
  );
  if (!pattern) throw new NotFoundError('Recurring trip pattern not found');
  if (!pattern.is_active) throw new ConflictError('Cannot generate trips from an inactive pattern');

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // Clamp to pattern's date range
  const patternStart = new Date(pattern.start_date);
  const patternEnd = pattern.end_date ? new Date(pattern.end_date) : null;
  const actualStart = startDate < patternStart ? patternStart : startDate;
  const actualEnd = patternEnd && endDate > patternEnd ? patternEnd : endDate;

  if (actualStart > actualEnd) throw new ConflictError('Date range does not overlap with pattern period');

  const daysOfWeek = getDaysForFrequency(pattern.frequency, pattern.days_of_week || []);
  const specificDates = pattern.specific_dates || [];
  const specificDateSet = new Set(specificDates.map((d: string) => d));

  const createdIds: string[] = [];
  const current = new Date(actualStart);

  while (current <= actualEnd) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayOfWeek = current.getDay();

    const matchesPattern = specificDateSet.has(dateStr) || daysOfWeek.includes(dayOfWeek);
    if (!matchesPattern) { current.setDate(current.getDate() + 1); continue; }

    // Check trip doesn't already exist
    const existing = await queryOne(
      `SELECT id FROM trips WHERE tenant_id = $1 AND route_id = $2
       AND scheduled_date = $3 AND scheduled_start_time = $4 AND deleted_at IS NULL`,
      [tenantId, pattern.route_id, dateStr, pattern.scheduled_start_time]
    );
    if (existing) { current.setDate(current.getDate() + 1); continue; }

    const tripId = uuid();
    await query(
      `INSERT INTO trips (id, tenant_id, route_id, bus_id, driver_id, trip_type,
        scheduled_date, scheduled_start_time, scheduled_end_time, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [tripId, tenantId, pattern.route_id, pattern.bus_id, pattern.driver_id,
       pattern.trip_type, dateStr, pattern.scheduled_start_time,
       pattern.scheduled_end_time, `Auto-generated from pattern ${patternId}`, userId]
    );
    createdIds.push(tripId);
    current.setDate(current.getDate() + 1);
  }

  // Update last_generated_at
  await query(
    `UPDATE recurring_trip_patterns SET last_generated_at = NOW() WHERE id = $1`,
    [patternId]
  );

  return { generatedCount: createdIds.length, tripIds: createdIds };
}

export async function getPatternCalendar(tenantId: string, patternId: string, startDate: string, endDate: string) {
  const pattern = await queryOne<PatternRow>(
    'SELECT * FROM recurring_trip_patterns WHERE id = $1 AND tenant_id = $2', [patternId, tenantId]
  );
  if (!pattern) throw new NotFoundError('Recurring trip pattern not found');

  const daysOfWeek = getDaysForFrequency(pattern.frequency, pattern.days_of_week || []);
  const specificDates = pattern.specific_dates || [];
  const specificDateSet = new Set(specificDates);

  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    if (specificDateSet.has(dateStr) || daysOfWeek.includes(current.getDay())) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
