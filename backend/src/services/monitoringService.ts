import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

interface TripRow {
  id: string; tenant_id: string; route_id: string | null; bus_id: string | null;
  driver_id: string | null; trip_type: string; scheduled_date: string;
  scheduled_start_time: string; scheduled_end_time: string | null;
  actual_start_time: string | null; actual_end_time: string | null;
  status: string; delay_minutes: number | null; delay_reason: string | null;
  notes: string | null; rejection_reason: string | null;
  driver_confirmation_status: string;
  estimated_resolution_time: string | null;
  status_override_by: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

// ─── Monitoring Dashboard ───

export async function getMonitoringDashboard(tenantId: string, date?: string) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const [activeTrips, delayedTrips, stats] = await Promise.all([
    getActiveTrips(tenantId, targetDate),
    getDelayedTripsList(tenantId, targetDate),
    getTripStats(tenantId, targetDate),
  ]);

  return { activeTrips, delayedTrips, stats };
}

async function getActiveTrips(tenantId: string, date: string) {
  const rows = await query<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.scheduled_date = $2
       AND t.status IN ('scheduled', 'en_route', 'delayed')
     ORDER BY t.scheduled_start_time`,
    [tenantId, date]
  );
  return rows.map((r: any) => ({
    id: r.id, routeId: r.route_id, busId: r.bus_id, driverId: r.driver_id,
    tripType: r.trip_type, scheduledDate: r.scheduled_date,
    scheduledStartTime: r.scheduled_start_time, scheduledEndTime: r.scheduled_end_time,
    actualStartTime: r.actual_start_time, actualEndTime: r.actual_end_time,
    status: r.status, delayMinutes: r.delay_minutes, delayReason: r.delay_reason,
    driverConfirmationStatus: r.driver_confirmation_status,
    estimatedResolutionTime: r.estimated_resolution_time,
    routeName: r.route_name, origin: r.origin, destination: r.destination,
    busPlate: r.plate_number, driverName: r.driver_name,
  }));
}

async function getDelayedTripsList(tenantId: string, date: string) {
  const rows = await query<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.scheduled_date = $2
       AND t.status = 'delayed'
     ORDER BY t.delay_minutes DESC NULLS LAST`,
    [tenantId, date]
  );
  return rows.map((r: any) => ({
    id: r.id, routeId: r.route_id, busId: r.bus_id, driverId: r.driver_id,
    tripType: r.trip_type, scheduledDate: r.scheduled_date,
    scheduledStartTime: r.scheduled_start_time, scheduledEndTime: r.scheduled_end_time,
    status: r.status, delayMinutes: r.delay_minutes, delayReason: r.delay_reason,
    estimatedResolutionTime: r.estimated_resolution_time,
    routeName: r.route_name, origin: r.origin, destination: r.destination,
    busPlate: r.plate_number, driverName: r.driver_name,
  }));
}

async function getTripStats(tenantId: string, date: string) {
  const row = await queryOne<any>(
    `SELECT
       COUNT(*)::int AS total_trips,
       COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
       COUNT(*) FILTER (WHERE status = 'en_route')::int AS en_route,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
     FROM trips
     WHERE tenant_id = $1 AND deleted_at IS NULL AND scheduled_date = $2`,
    [tenantId, date]
  );
  return row || { total_trips: 0, scheduled: 0, en_route: 0, completed: 0, delayed: 0, cancelled: 0 };
}

// ─── Delayed Trips (full list with pagination) ───

export async function getDelayedTrips(tenantId: string, queryParams: { page: number; pageSize: number; search?: string }) {
  const conditions = ['t.tenant_id = $1', 't.deleted_at IS NULL', "t.status = 'delayed'"];
  const params: any[] = [tenantId];
  let idx = 2;

  if (queryParams.search) {
    conditions.push(`(r.name ILIKE $${idx} OR b.plate_number ILIKE $${idx} OR t.delay_reason ILIKE $${idx})`);
    params.push(`%${queryParams.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     WHERE ${where}`, params
  );
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  params.push(queryParams.pageSize, offset);
  const rows = await query<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE ${where}
     ORDER BY t.scheduled_date DESC, t.delay_minutes DESC NULLS LAST
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: rows.map((r: any) => ({
      id: r.id, routeId: r.route_id, busId: r.bus_id, driverId: r.driver_id,
      tripType: r.trip_type, scheduledDate: r.scheduled_date,
      scheduledStartTime: r.scheduled_start_time, scheduledEndTime: r.scheduled_end_time,
      actualStartTime: r.actual_start_time, actualEndTime: r.actual_end_time,
      status: r.status, delayMinutes: r.delay_minutes, delayReason: r.delay_reason,
      estimatedResolutionTime: r.estimated_resolution_time,
      routeName: r.route_name, origin: r.origin, destination: r.destination,
      busPlate: r.plate_number, driverName: r.driver_name,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

// ─── Manual Status Override ───

export async function manualStatusOverride(
  tenantId: string, tripId: string, userId: string,
  input: { status: string; delayMinutes?: number; delayReason?: string; rejectionReason?: string; estimatedResolutionTime?: string; notes?: string }
) {
  const trip = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
  if (trip.status === input.status) throw new ConflictError(`Trip is already "${input.status}"`);

  const previousStatus = trip.status;

  const updateFields: string[] = ['status = $1', 'status_override_by = $2', 'updated_at = NOW()'];
  const updateParams: any[] = [input.status, userId];
  let idx = 3;

  if (input.delayMinutes !== undefined) {
    updateFields.push(`delay_minutes = $${idx++}`);
    updateParams.push(input.delayMinutes);
  }
  if (input.delayReason !== undefined) {
    updateFields.push(`delay_reason = $${idx++}`);
    updateParams.push(input.delayReason);
  }
  if (input.rejectionReason !== undefined) {
    updateFields.push(`rejection_reason = $${idx++}`);
    updateParams.push(input.rejectionReason);
  }
  if (input.estimatedResolutionTime !== undefined) {
    updateFields.push(`estimated_resolution_time = $${idx++}`);
    updateParams.push(input.estimatedResolutionTime);
  }

  updateParams.push(tripId, tenantId);
  await query(
    `UPDATE trips SET ${updateFields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL`,
    updateParams
  );

  const logId = uuid();
  await query(
    `INSERT INTO trip_status_logs (id, trip_id, previous_status, new_status, changed_by, change_method, notes)
     VALUES ($1, $2, $3, $4, $5, 'manual', $6)`,
    [logId, tripId, previousStatus, input.status, userId, input.notes || null]
  );

  return getTripAfterOverride(tenantId, tripId);
}

async function getTripAfterOverride(tenantId: string, tripId: string) {
  const row = await queryOne<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [tripId, tenantId]
  );
  if (!row) throw new NotFoundError('Trip not found');
  return {
    id: row.id, routeId: row.route_id, busId: row.bus_id, driverId: row.driver_id,
    tripType: row.trip_type, scheduledDate: row.scheduled_date,
    scheduledStartTime: row.scheduled_start_time, scheduledEndTime: row.scheduled_end_time,
    actualStartTime: row.actual_start_time, actualEndTime: row.actual_end_time,
    status: row.status, delayMinutes: row.delay_minutes, delayReason: row.delay_reason,
    driverConfirmationStatus: row.driver_confirmation_status,
    estimatedResolutionTime: row.estimated_resolution_time,
    statusOverrideBy: row.status_override_by,
    routeName: row.route_name, origin: row.origin, destination: row.destination,
    busPlate: row.plate_number, driverName: row.driver_name,
  };
}

// ─── External Update (SMS/Call) ───

export async function logExternalUpdate(
  tenantId: string, tripId: string,
  input: { method: 'sms' | 'call' | 'app'; status: string; delayMinutes?: number; delayReason?: string; notes?: string; updatedBy?: string }
) {
  const trip = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const previousStatus = trip.status;

  const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
  const updateParams: any[] = [input.status];
  let idx = 2;

  if (input.delayMinutes !== undefined) {
    updateFields.push(`delay_minutes = $${idx++}`);
    updateParams.push(input.delayMinutes);
  }
  if (input.delayReason !== undefined) {
    updateFields.push(`delay_reason = $${idx++}`);
    updateParams.push(input.delayReason);
  }

  updateParams.push(tripId, tenantId);
  await query(
    `UPDATE trips SET ${updateFields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL`,
    updateParams
  );

  const logId = uuid();
  await query(
    `INSERT INTO trip_status_logs (id, trip_id, previous_status, new_status, change_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [logId, tripId, previousStatus, input.status, input.method, input.notes || null]
  );

  return { id: logId, tripId, previousStatus, newStatus: input.status, method: input.method };
}

// ─── Timeline Comparison ───

export async function getTimelineComparison(tenantId: string, tripId: string) {
  const trip = await queryOne<any>(
    `SELECT t.*, r.name AS route_name, r.estimated_duration_minutes,
            b.plate_number
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const statusLogs = await query<any>(
    `SELECT * FROM trip_status_logs
     WHERE trip_id = $1
     ORDER BY created_at ASC`,
    [tripId]
  );

  const expectedDurationMinutes = trip.estimated_duration_minutes;
  let actualDurationMinutes: number | null = null;
  if (trip.actual_start_time && trip.actual_end_time) {
    actualDurationMinutes = Math.round(
      (new Date(trip.actual_end_time).getTime() - new Date(trip.actual_start_time).getTime()) / 60000
    );
  }

  const now = new Date().toISOString();
  const scheduledStart = `${trip.scheduled_date}T${trip.scheduled_start_time}`;
  const scheduledEnd = trip.scheduled_end_time
    ? `${trip.scheduled_date}T${trip.scheduled_end_time}`
    : null;

  return {
    tripId: trip.id,
    routeName: trip.route_name,
    busPlate: trip.plate_number,
    status: trip.status,
    expected: {
      startTime: scheduledStart,
      endTime: scheduledEnd,
      durationMinutes: expectedDurationMinutes || null,
    },
    actual: {
      startTime: trip.actual_start_time,
      endTime: trip.actual_end_time,
      durationMinutes: actualDurationMinutes,
    },
    delayMinutes: trip.delay_minutes,
    delayReason: trip.delay_reason,
    statusLogs: statusLogs.map((l: any) => ({
      id: l.id, previousStatus: l.previous_status, newStatus: l.new_status,
      changeMethod: l.change_method, notes: l.notes, createdAt: l.created_at,
    })),
    timeline: buildTimeline(trip, scheduledStart, scheduledEnd),
  };
}

function buildTimeline(trip: any, scheduledStart: string, scheduledEnd: string | null) {
  const events: { label: string; expectedTime: string | null; actualTime: string | null; status: 'on_time' | 'delayed' | 'pending' | 'missed' }[] = [
    {
      label: 'Scheduled Start',
      expectedTime: scheduledStart,
      actualTime: trip.actual_start_time,
      status: getEventStatus(trip.actual_start_time, scheduledStart, trip.delay_minutes),
    },
  ];

  if (scheduledEnd) {
    events.push({
      label: 'Scheduled End',
      expectedTime: scheduledEnd,
      actualTime: trip.actual_end_time,
      status: getEventStatus(trip.actual_end_time, scheduledEnd, trip.delay_minutes),
    });
  }

  return events;
}

function getEventStatus(actualTime: string | null, _expectedTime: string, delayMinutes: number | null): 'on_time' | 'delayed' | 'pending' | 'missed' {
  if (!actualTime) return 'pending';
  if (delayMinutes && delayMinutes > 15) return 'delayed';
  return 'on_time';
}

// ─── Status Log History ───

export async function getTripStatusLogs(tenantId: string, tripId: string) {
  const trip = await queryOne<TripRow>(
    'SELECT id FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const rows = await query<any>(
    `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) AS changed_by_name
     FROM trip_status_logs l
     LEFT JOIN users u ON u.id = l.changed_by
     WHERE l.trip_id = $1
     ORDER BY l.created_at DESC`,
    [tripId]
  );

  return rows.map((r: any) => ({
    id: r.id, previousStatus: r.previous_status, newStatus: r.new_status,
    changeMethod: r.change_method, changedByName: r.changed_by_name,
    notes: r.notes, createdAt: r.created_at,
  }));
}
