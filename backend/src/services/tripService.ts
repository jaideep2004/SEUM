import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { CreateTripInput, UpdateTripInput, DelayTripInput, CancelTripInput, TripQuery, AddPassengerInput } from '../validators/operations';

interface TripRow {
  id: string; tenant_id: string; route_id: string | null; bus_id: string | null;
  driver_id: string | null; trip_type: string; scheduled_date: string;
  scheduled_start_time: string; scheduled_end_time: string | null;
  actual_start_time: string | null; actual_end_time: string | null;
  status: string; delay_minutes: number | null; delay_reason: string | null;
  notes: string | null; rejection_reason: string | null;
  driver_confirmation_status: string;
  created_by: string | null; approved_by: string | null;
  created_at: string; updated_at: string; deleted_at: string | null;
}

interface PassengerRow {
  id: string; trip_id: string; passenger_name: string;
  passenger_id_number: string | null; contact_number: string | null;
  seat_number: string | null; booking_reference: string | null;
  created_at: string;
}

function mapTrip(row: TripRow, extra?: { routeName?: string; busPlate?: string; driverName?: string; stops?: any[]; passengers?: any[] }) {
  return {
    id: row.id, tenantId: row.tenant_id, routeId: row.route_id, busId: row.bus_id,
    driverId: row.driver_id, tripType: row.trip_type,
    scheduledDate: row.scheduled_date, scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time, actualStartTime: row.actual_start_time,
    actualEndTime: row.actual_end_time, status: row.status,
    delayMinutes: row.delay_minutes, delayReason: row.delay_reason,
    notes: row.notes, rejectionReason: row.rejection_reason,
    driverConfirmationStatus: row.driver_confirmation_status,
    createdBy: row.created_by, approvedBy: row.approved_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
    ...extra,
  };
}

function mapPassenger(row: PassengerRow) {
  return {
    id: row.id, tripId: row.trip_id, passengerName: row.passenger_name,
    passengerIdNumber: row.passenger_id_number, contactNumber: row.contact_number,
    seatNumber: row.seat_number, bookingReference: row.booking_reference,
    createdAt: row.created_at,
  };
}

async function getTripExtras(tenantId: string, tripId: string): Promise<{ stops: any[]; passengers: any[]; routeName: string | null; busPlate: string | null; driverName: string | null }> {
  const [routeRes, stops, passengers] = await Promise.all([
    queryOne<any>('SELECT r.name FROM routes r JOIN trips t ON t.route_id = r.id WHERE t.id = $1 AND t.tenant_id = $2', [tripId, tenantId]),
    query<any>('SELECT * FROM route_stops WHERE route_id = (SELECT route_id FROM trips WHERE id = $1) ORDER BY stop_order', [tripId]),
    query<PassengerRow>('SELECT * FROM trip_passengers WHERE trip_id = $1 ORDER BY seat_number NULLS LAST, passenger_name', [tripId]),
  ]);
  const busRes = await queryOne<any>('SELECT b.plate_number FROM buses b JOIN trips t ON t.bus_id = b.id WHERE t.id = $1', [tripId]);
  const driverRes = await queryOne<any>("SELECT CONCAT(u.first_name, ' ', u.last_name) AS name FROM users u JOIN trips t ON t.driver_id = u.id WHERE t.id = $1", [tripId]);
  return {
    stops: stops.map(mapPassenger), // caller doesn't use stops from here
    passengers: passengers.map(mapPassenger),
    routeName: routeRes?.name || null,
    busPlate: busRes?.plate_number || null,
    driverName: driverRes?.name || null,
  };
}

// ─── CRUD ───

export async function createTrip(tenantId: string, userId: string, input: CreateTripInput) {
  const [route, bus] = await Promise.all([
    queryOne('SELECT id FROM routes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.routeId, tenantId]),
    queryOne('SELECT id FROM buses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [input.busId, tenantId]),
  ]);
  if (!route) throw new NotFoundError('Route not found');
  if (!bus) throw new NotFoundError('Bus not found');

  const id = uuid();
  const row = await queryOne<TripRow>(
    `INSERT INTO trips (id, tenant_id, route_id, bus_id, driver_id, trip_type, scheduled_date, scheduled_start_time, scheduled_end_time, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, tenantId, input.routeId, input.busId, input.driverId || null, input.tripType,
     input.scheduledDate, input.scheduledStartTime, input.scheduledEndTime || null,
     input.notes || null, userId]
  );
  if (!row) throw new Error('Failed to create trip');
  return mapTrip(row);
}

export async function listTrips(tenantId: string, queryParams: TripQuery) {
  const conditions = ['t.tenant_id = $1', 't.deleted_at IS NULL'];
  const params: any[] = [tenantId];
  let idx = 2;

  const mapFilter = (field: string) => (val: string | undefined) => {
    if (val) { conditions.push(`t.${field} = $${idx++}`); params.push(val); }
  };
  mapFilter('status')(queryParams.status);
  mapFilter('trip_type')(queryParams.tripType);
  mapFilter('bus_id')(queryParams.busId);
  mapFilter('route_id')(queryParams.routeId);
  mapFilter('driver_id')(queryParams.driverId);
  if (queryParams.startDate) { conditions.push(`t.scheduled_date >= $${idx++}`); params.push(queryParams.startDate); }
  if (queryParams.endDate) { conditions.push(`t.scheduled_date <= $${idx++}`); params.push(queryParams.endDate); }
  if (queryParams.search) {
    conditions.push(`(t.notes ILIKE $${idx} OR t.trip_type ILIKE $${idx})`);
    params.push(`%${queryParams.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM trips t WHERE ${where}`, params);
  const total = countResult?.count ?? 0;

  const offset = (queryParams.page - 1) * queryParams.pageSize;
  params.push(queryParams.pageSize, offset);
  const rows = await query<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination, b.plate_number,
            CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE ${where} ORDER BY t.scheduled_date DESC, t.scheduled_start_time ASC
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
      notes: r.notes, rejectionReason: r.rejection_reason,
      createdAt: r.created_at, updatedAt: r.updated_at,
      routeName: r.route_name, origin: r.origin, destination: r.destination,
      busPlate: r.plate_number, driverName: r.driver_name,
    })),
    meta: { total, page: queryParams.page, pageSize: queryParams.pageSize },
  };
}

export async function getTripById(tenantId: string, tripId: string) {
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

  const stops = await query<any>('SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order', [row.route_id]);
  const passengers = await query<PassengerRow>('SELECT * FROM trip_passengers WHERE trip_id = $1 ORDER BY seat_number NULLS LAST, passenger_name', [tripId]);

  return {
    id: row.id, tenantId: row.tenant_id, routeId: row.route_id, busId: row.bus_id,
    driverId: row.driver_id, tripType: row.trip_type,
    scheduledDate: row.scheduled_date, scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time, actualStartTime: row.actual_start_time,
    actualEndTime: row.actual_end_time, status: row.status,
    delayMinutes: row.delay_minutes, delayReason: row.delay_reason,
    notes: row.notes, rejectionReason: row.rejection_reason,
    driverConfirmationStatus: row.driver_confirmation_status,
    createdBy: row.created_by, approvedBy: row.approved_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
    routeName: row.route_name, origin: row.origin, destination: row.destination,
    busPlate: row.plate_number, driverName: row.driver_name,
    stops: stops.map((s: any) => ({
      id: s.id, stopName: s.stop_name, stopOrder: s.stop_order,
      latitude: s.latitude ? parseFloat(s.latitude) : null,
      longitude: s.longitude ? parseFloat(s.longitude) : null,
      estimatedArrivalMinutes: s.estimated_arrival_minutes,
    })),
    passengers: passengers.map(mapPassenger),
  };
}

export async function updateTrip(tenantId: string, tripId: string, input: UpdateTripInput) {
  const existing = await queryOne<TripRow>(
    'SELECT id FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!existing) throw new NotFoundError('Trip not found');

  const fieldMap: Record<string, string> = {
    tripType: 'trip_type', scheduledDate: 'scheduled_date',
    scheduledStartTime: 'scheduled_start_time', scheduledEndTime: 'scheduled_end_time',
    notes: 'notes', driverId: 'driver_id',
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
  if (fields.length === 0) return getTripById(tenantId, tripId);

  fields.push('updated_at = NOW()');
  params.push(tripId, tenantId);
  await query(`UPDATE trips SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL`, params);
  return getTripById(tenantId, tripId);
}

export async function cancelTrip(tenantId: string, tripId: string, input: CancelTripInput) {
  const existing = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!existing) throw new NotFoundError('Trip not found');
  if (existing.status === 'completed') throw new ConflictError('Cannot cancel a completed trip');

  await query(
    `UPDATE trips SET status = 'cancelled', rejection_reason = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
    [input.rejectionReason, tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

// ─── Status Transitions ───

export async function startTrip(tenantId: string, tripId: string) {
  const existing = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!existing) throw new NotFoundError('Trip not found');
  if (existing.status !== 'scheduled') throw new ConflictError(`Cannot start trip with status "${existing.status}"`);

  await query(
    `UPDATE trips SET status = 'en_route', actual_start_time = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    [tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

export async function completeTrip(tenantId: string, tripId: string) {
  const existing = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!existing) throw new NotFoundError('Trip not found');
  if (existing.status !== 'en_route') throw new ConflictError(`Cannot complete trip with status "${existing.status}"`);

  await query(
    `UPDATE trips SET status = 'completed', actual_end_time = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    [tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

export async function delayTrip(tenantId: string, tripId: string, input: DelayTripInput) {
  const existing = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!existing) throw new NotFoundError('Trip not found');
  if (!['scheduled', 'en_route'].includes(existing.status)) {
    throw new ConflictError(`Cannot delay trip with status "${existing.status}"`);
  }

  await query(
    `UPDATE trips SET status = 'delayed', delay_minutes = $1, delay_reason = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`,
    [input.delayMinutes, input.delayReason, tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

// ─── Passengers ───

export async function addPassenger(tenantId: string, tripId: string, input: AddPassengerInput) {
  const trip = await queryOne<TripRow>(
    'SELECT id FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const id = uuid();
  const row = await queryOne<PassengerRow>(
    `INSERT INTO trip_passengers (id, trip_id, passenger_name, passenger_id_number, contact_number, seat_number, booking_reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, tripId, input.passengerName, input.passengerIdNumber || null,
     input.contactNumber || null, input.seatNumber || null, input.bookingReference || null]
  );
  if (!row) throw new Error('Failed to add passenger');
  return mapPassenger(row);
}

export async function removePassenger(tenantId: string, tripId: string, passengerId: string) {
  const trip = await queryOne<TripRow>(
    'SELECT id FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');

  const passenger = await queryOne<PassengerRow>(
    'SELECT id FROM trip_passengers WHERE id = $1 AND trip_id = $2', [passengerId, tripId]
  );
  if (!passenger) throw new NotFoundError('Passenger not found');

  await query('DELETE FROM trip_passengers WHERE id = $1', [passengerId]);
  return { id: passengerId, deleted: true };
}

// ─── Calendar ───

export async function getTripCalendar(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT t.id, t.scheduled_date, t.scheduled_start_time, t.scheduled_end_time,
            t.status, t.trip_type, t.bus_id, t.route_id, t.driver_id,
            r.name AS route_name, r.origin, r.destination,
            b.plate_number, CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     ORDER BY t.scheduled_date, t.scheduled_start_time`,
    [tenantId, startDate, endDate]
  );
  return rows.map((r: any) => ({
    id: r.id, scheduledDate: r.scheduled_date, scheduledStartTime: r.scheduled_start_time,
    scheduledEndTime: r.scheduled_end_time, status: r.status, tripType: r.trip_type,
    busId: r.bus_id, routeId: r.route_id, driverId: r.driver_id,
    routeName: r.route_name, origin: r.origin, destination: r.destination,
    busPlate: r.plate_number, driverName: r.driver_name,
  }));
}

// ─── Driver Assignment ───

export async function assignDriver(tenantId: string, tripId: string, driverId: string) {
  const trip = await queryOne<TripRow>(
    'SELECT id, status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
  if (['completed', 'cancelled'].includes(trip.status)) throw new ConflictError('Cannot assign driver to a completed/cancelled trip');

  const driver = await queryOne<any>(
    'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = true', [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  await query(
    `UPDATE trips SET driver_id = $1, driver_confirmation_status = 'pending', updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
    [driverId, tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

export async function getAvailableDrivers(tenantId: string, date?: string) {
  const dateFilter = date || new Date().toISOString().slice(0, 10);
  const rows = await query<any>(
    `SELECT DISTINCT u.id, u.email, u.name,
            COALESCE(
              (SELECT array_agg(r.name ORDER BY r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id),
              '{}'
            ) as roles
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE u.tenant_id = $1 AND u.is_active = true
       AND r.name = 'driver'
       AND u.id NOT IN (
         SELECT t.driver_id FROM trips t
         WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
           AND t.scheduled_date = $2 AND t.status NOT IN ('completed', 'cancelled')
           AND t.driver_id IS NOT NULL
       )
     ORDER BY u.name`,
    [tenantId, dateFilter]
  );
  return rows.map((r: any) => ({
    id: r.id, email: r.email, name: r.name, roles: r.roles,
  }));
}

export async function driverConfirmTrip(tenantId: string, tripId: string, status: 'accepted' | 'rejected', rejectionReason?: string) {
  const trip = await queryOne<TripRow>(
    'SELECT id, status, driver_id, driver_confirmation_status FROM trips WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL', [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
  if (trip.driver_confirmation_status === 'accepted') throw new ConflictError('Trip already accepted');
  if (trip.driver_confirmation_status === 'rejected') throw new ConflictError('Trip already rejected');

  await query(
    `UPDATE trips SET driver_confirmation_status = $1, rejection_reason = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`,
    [status, rejectionReason || null, tripId, tenantId]
  );
  return getTripById(tenantId, tripId);
}

export async function getDriverSchedule(tenantId: string, driverId: string, startDate?: string, endDate?: string) {
  const conditions = ['t.tenant_id = $1', 't.deleted_at IS NULL', 't.driver_id = $2'];
  const params: any[] = [tenantId, driverId];
  let idx = 3;

  if (startDate) { conditions.push(`t.scheduled_date >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`t.scheduled_date <= $${idx++}`); params.push(endDate); }

  const where = conditions.join(' AND ');
  const rows = await query<any>(
    `SELECT t.*, r.name AS route_name, r.origin, r.destination,
            b.plate_number
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     WHERE ${where} ORDER BY t.scheduled_date, t.scheduled_start_time`,
    params
  );
  return rows.map((r: any) => ({
    id: r.id, routeId: r.route_id, busId: r.bus_id, driverId: r.driver_id,
    tripType: r.trip_type, scheduledDate: r.scheduled_date,
    scheduledStartTime: r.scheduled_start_time, scheduledEndTime: r.scheduled_end_time,
    actualStartTime: r.actual_start_time, actualEndTime: r.actual_end_time,
    status: r.status, driverConfirmationStatus: r.driver_confirmation_status,
    delayMinutes: r.delay_minutes, delayReason: r.delay_reason,
    notes: r.notes, rejectionReason: r.rejection_reason,
    routeName: r.route_name, origin: r.origin, destination: r.destination,
    busPlate: r.plate_number,
  }));
}
