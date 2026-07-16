import { query, queryOne } from '../db';

// ─── Daily Trip Summary ───

export async function getTripSummary(tenantId: string, startDate: string, endDate: string) {
  const row = await queryOne<any>(
    `SELECT
       COUNT(*)::int AS total_trips,
       COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
       COUNT(*) FILTER (WHERE status = 'en_route')::int AS en_route,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
       ROUND(
         CASE WHEN COUNT(*) > 0
           THEN COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*)
           ELSE 0 END, 1
       )::float AS completion_rate,
       ROUND(
         CASE WHEN COUNT(*) > 0
           THEN COUNT(*) FILTER (WHERE status = 'delayed') * 100.0 / COUNT(*)
           ELSE 0 END, 1
       )::float AS delay_rate
     FROM trips
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND scheduled_date >= $2 AND scheduled_date <= $3`,
    [tenantId, startDate, endDate]
  );

  return row || { total_trips: 0, scheduled: 0, en_route: 0, completed: 0, delayed: 0, cancelled: 0, completion_rate: 0, delay_rate: 0 };
}

// ─── Driver Performance ───

export async function getDriverPerformance(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT
       u.id AS driver_id,
       CONCAT(u.first_name, ' ', u.last_name) AS driver_name,
       COUNT(*)::int AS total_trips,
       COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_trips,
       COUNT(*) FILTER (WHERE t.status = 'delayed')::int AS delayed_trips,
       COUNT(*) FILTER (WHERE t.status = 'cancelled')::int AS cancelled_trips,
       ROUND(
         CASE WHEN COUNT(*) > 0
           THEN COUNT(*) FILTER (WHERE t.status IN ('completed', 'en_route')) * 100.0 / COUNT(*)
           ELSE 0 END, 1
       )::float AS on_time_pct,
       COALESCE(SUM(t.delay_minutes), 0)::int AS total_delay_minutes,
       ROUND(
         CASE WHEN COUNT(*) > 0 AND SUM(t.delay_minutes) IS NOT NULL
           THEN SUM(t.delay_minutes)::float / COUNT(*)
           ELSE 0 END, 1
       )::float AS avg_delay_minutes,
       COALESCE(AVG(CASE WHEN t.actual_start_time IS NOT NULL AND t.scheduled_start_time IS NOT NULL
         THEN EXTRACT(EPOCH FROM (t.actual_start_time - (t.scheduled_date || ' ' || t.scheduled_start_time)::timestamp)) / 60
         ELSE NULL END), 0)::float AS avg_late_start_minutes
     FROM trips t
     JOIN users u ON u.id = t.driver_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.driver_id IS NOT NULL
       AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     GROUP BY u.id, u.first_name, u.last_name
     ORDER BY on_time_pct DESC`,
    [tenantId, startDate, endDate]
  );

  return rows.map((r: any) => ({
    driverId: r.driver_id,
    driverName: r.driver_name,
    totalTrips: r.total_trips,
    completedTrips: r.completed_trips,
    delayedTrips: r.delayed_trips,
    cancelledTrips: r.cancelled_trips,
    onTimePct: r.on_time_pct,
    totalDelayMinutes: r.total_delay_minutes,
    avgDelayMinutes: r.avg_delay_minutes,
    avgLateStartMinutes: r.avg_late_start_minutes,
  }));
}

// ─── Route Performance ───

export async function getRoutePerformance(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT
       r.id AS route_id,
       r.name AS route_name,
       r.origin,
       r.destination,
       r.distance_km,
       r.estimated_duration_minutes,
       COUNT(*)::int AS total_trips,
       COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_trips,
       COUNT(*) FILTER (WHERE t.status = 'delayed')::int AS delayed_trips,
       ROUND(
         CASE WHEN COUNT(*) > 0
           THEN COUNT(*) FILTER (WHERE t.status = 'delayed') * 100.0 / COUNT(*)
           ELSE 0 END, 1
       )::float AS delay_frequency_pct,
       COALESCE(ROUND(AVG(t.delay_minutes), 1), 0)::float AS avg_delay_minutes,
       COALESCE(MAX(t.delay_minutes), 0)::int AS max_delay_minutes,
       COALESCE(
         ROUND(AVG(CASE WHEN t.actual_start_time IS NOT NULL AND t.scheduled_start_time IS NOT NULL
           THEN EXTRACT(EPOCH FROM (t.actual_start_time - (t.scheduled_date || ' ' || t.scheduled_start_time)::timestamp)) / 60
           ELSE NULL END)), 0
       )::float AS avg_start_deviation_minutes
     FROM trips t
     JOIN routes r ON r.id = t.route_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.route_id IS NOT NULL
       AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     GROUP BY r.id, r.name, r.origin, r.destination, r.distance_km, r.estimated_duration_minutes
     ORDER BY delay_frequency_pct DESC`,
    [tenantId, startDate, endDate]
  );

  return rows.map((r: any) => ({
    routeId: r.route_id,
    routeName: r.route_name,
    origin: r.origin,
    destination: r.destination,
    distanceKm: r.distance_km ? parseFloat(r.distance_km) : null,
    estimatedDurationMinutes: r.estimated_duration_minutes,
    totalTrips: r.total_trips,
    completedTrips: r.completed_trips,
    delayedTrips: r.delayed_trips,
    delayFrequencyPct: r.delay_frequency_pct,
    avgDelayMinutes: r.avg_delay_minutes,
    maxDelayMinutes: r.max_delay_minutes,
    avgStartDeviationMinutes: r.avg_start_deviation_minutes,
  }));
}

// ─── Bus Utilization ───

export async function getBusUtilization(tenantId: string, startDate: string, endDate: string) {
  const rows = await query<any>(
    `SELECT
       b.id AS bus_id,
       b.plate_number,
       b.make,
       b.model,
       b.year,
       COUNT(*)::int AS total_trips,
       COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_trips,
       COUNT(*) FILTER (WHERE t.status = 'delayed')::int AS delayed_trips,
       COUNT(*) FILTER (WHERE t.status = 'cancelled')::int AS cancelled_trips,
       COALESCE(ROUND(AVG(t.delay_minutes), 1), 0)::float AS avg_delay_minutes,
       COALESCE(SUM(t.delay_minutes), 0)::int AS total_delay_minutes
     FROM trips t
     JOIN buses b ON b.id = t.bus_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.bus_id IS NOT NULL
       AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     GROUP BY b.id, b.plate_number, b.make, b.model, b.year
     ORDER BY total_trips DESC`,
    [tenantId, startDate, endDate]
  );

  return rows.map((r: any) => ({
    busId: r.bus_id,
    plateNumber: r.plate_number,
    make: r.make,
    model: r.model,
    year: r.year,
    totalTrips: r.total_trips,
    completedTrips: r.completed_trips,
    delayedTrips: r.delayed_trips,
    cancelledTrips: r.cancelled_trips,
    avgDelayMinutes: r.avg_delay_minutes,
    totalDelayMinutes: r.total_delay_minutes,
  }));
}

// ─── CSV Export ───

export async function exportTripReportCSV(tenantId: string, startDate: string, endDate: string): Promise<string> {
  const trips = await query<any>(
    `SELECT t.id, t.scheduled_date, t.scheduled_start_time, t.scheduled_end_time,
            t.status, t.delay_minutes, t.delay_reason, t.trip_type,
            r.name AS route_name, r.origin, r.destination,
            b.plate_number,
            CONCAT(u.first_name, ' ', u.last_name) AS driver_name
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
       AND t.scheduled_date >= $2 AND t.scheduled_date <= $3
     ORDER BY t.scheduled_date, t.scheduled_start_time`,
    [tenantId, startDate, endDate]
  );

  const header = 'Trip ID,Date,Start Time,End Time,Route,Origin,Destination,Bus,Driver,Type,Status,Delay Minutes,Delay Reason';
  const rows = trips.map((t: any) =>
    `"${t.id}","${t.scheduled_date}","${t.scheduled_start_time?.slice(0, 5) || ''}","${t.scheduled_end_time?.slice(0, 5) || ''}","${t.route_name || ''}","${t.origin || ''}","${t.destination || ''}","${t.plate_number || ''}","${t.driver_name || ''}","${t.trip_type}","${t.status}",${t.delay_minutes ?? ''},"${t.delay_reason || ''}"`
  );

  return [header, ...rows].join('\n');
}

export async function exportDriverPerformanceCSV(tenantId: string, startDate: string, endDate: string): Promise<string> {
  const data = await getDriverPerformance(tenantId, startDate, endDate);
  const header = 'Driver ID,Driver Name,Total Trips,Completed,Delayed,Cancelled,On-Time %,Total Delay Min,Avg Delay Min,Avg Late Start Min';
  const rows = data.map((d: any) =>
    `"${d.driverId}","${d.driverName}",${d.totalTrips},${d.completedTrips},${d.delayedTrips},${d.cancelledTrips},${d.onTimePct},${d.totalDelayMinutes},${d.avgDelayMinutes},${d.avgLateStartMinutes}`
  );
  return [header, ...rows].join('\n');
}

export async function exportRoutePerformanceCSV(tenantId: string, startDate: string, endDate: string): Promise<string> {
  const data = await getRoutePerformance(tenantId, startDate, endDate);
  const header = 'Route ID,Route Name,Origin,Destination,Distance Km,Est Duration,Trips,Completed,Delayed,Delay %,Avg Delay,Max Delay';
  const rows = data.map((r: any) =>
    `"${r.routeId}","${r.routeName}","${r.origin}","${r.destination}",${r.distanceKm ?? ''},${r.estimatedDurationMinutes ?? ''},${r.totalTrips},${r.completedTrips},${r.delayedTrips},${r.delayFrequencyPct},${r.avgDelayMinutes},${r.maxDelayMinutes}`
  );
  return [header, ...rows].join('\n');
}
