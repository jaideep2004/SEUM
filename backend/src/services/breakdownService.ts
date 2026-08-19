import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { ConflictError, NotFoundError } from '../utils/errors';
import type {
  CreateBreakdownInput, ListBreakdownsQuery,
} from '../validators/breakdowns';

interface BreakdownRow {
  id: string; tenant_id: string; bus_id: string; trip_id: string | null;
  reported_by: string | null; breakdown_type: string;
  description: string | null; location: string;
  location_lat: number | null; location_lng: number | null;
  severity: string; status: string;
  dispatched_mechanic: string | null; dispatched_at: string | null;
  dispatched_by: string | null; resolution_notes: string | null;
  cost: string | null; resolved_at: string | null; resolved_by: string | null;
  created_at: string; updated_at: string;
}

const BREAKDOWN_BUS_JOIN = `
  SELECT b.*, bd.plate_number AS bus_plate, bd.make AS bus_make, bd.model AS bus_model,
         r.name AS route_name, r.code AS route_code
  FROM breakdown_reports b
  JOIN buses bd ON bd.id = b.bus_id
  LEFT JOIN trips t ON t.id = b.trip_id
  LEFT JOIN routes r ON r.id = t.route_id
`;

function mapBreakdown(row: BreakdownRow & Record<string, any>) {
  return {
    id: row.id, tenantId: row.tenant_id, busId: row.bus_id, tripId: row.trip_id,
    reportedBy: row.reported_by, breakdownType: row.breakdown_type,
    description: row.description, location: row.location,
    locationLat: row.location_lat, locationLng: row.location_lng,
    severity: row.severity, status: row.status,
    dispatchedMechanic: row.dispatched_mechanic, dispatchedAt: row.dispatched_at,
    dispatchedBy: row.dispatched_by, resolutionNotes: row.resolution_notes,
    cost: row.cost === null ? null : parseFloat(row.cost),
    resolvedAt: row.resolved_at, resolvedBy: row.resolved_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
    bus: {
      plateNumber: row.bus_plate, make: row.bus_make, model: row.bus_model,
    },
    route: row.route_name ? { name: row.route_name, code: row.route_code } : null,
  };
}

async function requireBus(tenantId: string, busId: string) {
  const bus = await queryOne<{ id: string }>(
    'SELECT id FROM buses WHERE id = $1 AND tenant_id = $2',
    [busId, tenantId]
  );
  if (!bus) throw new NotFoundError('Bus not found');
}

async function requireTrip(tenantId: string, tripId: string) {
  const trip = await queryOne<{ id: string }>(
    'SELECT id FROM trips WHERE id = $1 AND tenant_id = $2',
    [tripId, tenantId]
  );
  if (!trip) throw new NotFoundError('Trip not found');
}

export async function reportBreakdown(tenantId: string, userId: string, input: CreateBreakdownInput) {
  await requireBus(tenantId, input.bus_id);
  if (input.trip_id) await requireTrip(tenantId, input.trip_id);

  const id = uuid();
  const row = await queryOne<BreakdownRow>(
    `INSERT INTO breakdown_reports
       (id, tenant_id, bus_id, trip_id, reported_by, breakdown_type, description,
        location, location_lat, location_lng, severity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, tenantId, input.bus_id, input.trip_id || null, userId,
     input.breakdown_type, input.description || null, input.location,
     input.location_lat ?? null, input.location_lng ?? null, input.severity]
  );
  const withBus = await queryOne<any>(`${BREAKDOWN_BUS_JOIN} WHERE b.id = $1`, [id]);
  return mapBreakdown(withBus || row as any);
}

export async function listBreakdowns(tenantId: string, params: ListBreakdownsQuery) {
  const conditions: string[] = ['b.tenant_id = $1', 'b.deleted_at IS NULL'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.bus_id) { conditions.push(`b.bus_id = $${idx}`); values.push(params.bus_id); idx++; }
  if (params.status) { conditions.push(`b.status = $${idx}`); values.push(params.status); idx++; }
  if (params.severity) { conditions.push(`b.severity = $${idx}`); values.push(params.severity); idx++; }
  if (params.breakdown_type) { conditions.push(`b.breakdown_type = $${idx}`); values.push(params.breakdown_type); idx++; }
  if (params.search) {
    conditions.push(`(bd.plate_number ILIKE $${idx} OR b.location ILIKE $${idx})`);
    values.push(`%${params.search}%`); idx++;
  }

  const where = conditions.join(' AND ');
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM breakdown_reports b JOIN buses bd ON bd.id = b.bus_id WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `${BREAKDOWN_BUS_JOIN} WHERE ${where}
     ORDER BY
       CASE b.status WHEN 'reported' THEN 0 WHEN 'dispatched' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
       CASE b.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       b.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { data: rows.map(mapBreakdown), meta: { total, page: params.page, pageSize: params.pageSize } };
}

export async function getBreakdownById(tenantId: string, breakdownId: string) {
  const row = await queryOne<any>(
    `${BREAKDOWN_BUS_JOIN} WHERE b.id = $1 AND b.tenant_id = $2 AND b.deleted_at IS NULL`,
    [breakdownId, tenantId]
  );
  if (!row) throw new NotFoundError('Breakdown report not found');
  return mapBreakdown(row);
}

export async function dispatchBreakdown(tenantId: string, breakdownId: string, userId: string, mechanic: string) {
  const existing = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM breakdown_reports WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [breakdownId, tenantId]
  );
  if (!existing) throw new NotFoundError('Breakdown report not found');
  if (existing.status !== 'reported' && existing.status !== 'dispatched') {
    throw new ConflictError('Only reported breakdowns can be dispatched');
  }

  const row = await queryOne<BreakdownRow>(
    `UPDATE breakdown_reports
     SET status = 'dispatched', dispatched_mechanic = $1, dispatched_at = NOW(), dispatched_by = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4 RETURNING *`,
    [mechanic, userId, breakdownId, tenantId]
  );
  const withBus = await queryOne<any>(`${BREAKDOWN_BUS_JOIN} WHERE b.id = $1`, [breakdownId]);
  return mapBreakdown(withBus || row as any);
}

export async function startBreakdown(tenantId: string, breakdownId: string, userId: string) {
  const existing = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM breakdown_reports WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [breakdownId, tenantId]
  );
  if (!existing) throw new NotFoundError('Breakdown report not found');
  if (existing.status !== 'dispatched') throw new ConflictError('Only dispatched breakdowns can be started');

  const row = await queryOne<BreakdownRow>(
    `UPDATE breakdown_reports SET status = 'in_progress', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [breakdownId, tenantId]
  );
  const withBus = await queryOne<any>(`${BREAKDOWN_BUS_JOIN} WHERE b.id = $1`, [breakdownId]);
  return mapBreakdown(withBus || row as any);
}

export async function resolveBreakdown(tenantId: string, breakdownId: string, userId: string, notes?: string, cost?: number) {
  const existing = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM breakdown_reports WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [breakdownId, tenantId]
  );
  if (!existing) throw new NotFoundError('Breakdown report not found');
  if (existing.status === 'resolved') throw new ConflictError('Breakdown is already resolved');

  const row = await queryOne<BreakdownRow>(
    `UPDATE breakdown_reports
     SET status = 'resolved', resolution_notes = $1, cost = $2, resolved_at = NOW(), resolved_by = $3, updated_at = NOW()
     WHERE id = $4 AND tenant_id = $5 RETURNING *`,
    [notes || null, cost ?? null, userId, breakdownId, tenantId]
  );
  const withBus = await queryOne<any>(`${BREAKDOWN_BUS_JOIN} WHERE b.id = $1`, [breakdownId]);
  return mapBreakdown(withBus || row as any);
}

export async function getHeatmap(tenantId: string) {
  const rows = await query<any>(
    `SELECT location,
            location_lat, location_lng,
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE status NOT IN ('resolved'))::int AS open_count,
            ROUND(AVG(NULLIF(cost, 0))::numeric, 2) AS avg_cost,
            MAX(created_at) AS last_reported_at
     FROM breakdown_reports
     WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY location, location_lat, location_lng
     ORDER BY count DESC`,
    [tenantId]
  );
  return {
    total: rows.reduce((acc: number, r: any) => acc + Number(r.count), 0),
    open: rows.reduce((acc: number, r: any) => acc + Number(r.open_count), 0),
    locations: rows.map((r: any) => ({
      location: r.location,
      lat: r.location_lat, lng: r.location_lng,
      count: Number(r.count),
      openCount: Number(r.open_count),
      avgCost: r.avg_cost === null ? null : parseFloat(r.avg_cost),
      lastReportedAt: r.last_reported_at,
    })),
  };
}