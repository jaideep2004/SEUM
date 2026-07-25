import { query, queryOne } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';
import { SEVERITY_POINTS, SUSPENSION_THRESHOLD } from '../validators/driverViolations';

interface ViolationRow {
  id: string;
  tenant_id: string;
  driver_id: string;
  trip_id: string | null;
  violation_type: string;
  severity: string;
  description: string | null;
  points: number;
  recorded_at: string;
  action_taken: string | null;
  action_taken_by: string | null;
  status: string;
  dispute_reason: string | null;
  dispute_evidence: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapViolation(row: ViolationRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    driverId: row.driver_id,
    tripId: row.trip_id,
    violationType: row.violation_type,
    severity: row.severity,
    description: row.description,
    points: row.points,
    recordedAt: row.recorded_at,
    actionTaken: row.action_taken,
    actionTakenBy: row.action_taken_by,
    status: row.status,
    disputeReason: row.dispute_reason,
    disputeEvidence: typeof row.dispute_evidence === 'string' ? JSON.parse(row.dispute_evidence) : row.dispute_evidence,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createViolation(tenantId: string, input: {
  driverId: string; violationType: string; severity: string;
  tripId?: string; description?: string; actionTaken?: string;
}, recordedBy?: string) {
  const driver = await queryOne<{ id: string }>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [input.driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const points = SEVERITY_POINTS[input.severity] || 0;

  const result = await queryOne<ViolationRow>(
    `INSERT INTO driver_violations (tenant_id, driver_id, trip_id, violation_type, severity, description, points, action_taken, action_taken_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [tenantId, input.driverId, input.tripId || null, input.violationType, input.severity,
     input.description || null, points, input.actionTaken || null, recordedBy || null]
  );

  const totalPoints = await getRecentPoints(tenantId, input.driverId);
  let suspended = false;
  if (totalPoints >= SUSPENSION_THRESHOLD) {
    await query(
      `UPDATE drivers SET status = 'suspended', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [input.driverId, tenantId]
    );
    suspended = true;
  }

  return { violation: mapViolation(result!), totalPoints, suspended };
}

export async function listViolations(tenantId: string, params: {
  driverId?: string; status?: string; severity?: string; violationType?: string;
  startDate?: string; endDate?: string; page: number; pageSize: number;
}) {
  const conditions: string[] = ['v.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  if (params.driverId) { conditions.push(`v.driver_id = $${idx}`); values.push(params.driverId); idx++; }
  if (params.status) { conditions.push(`v.status = $${idx}`); values.push(params.status); idx++; }
  if (params.severity) { conditions.push(`v.severity = $${idx}`); values.push(params.severity); idx++; }
  if (params.violationType) { conditions.push(`v.violation_type = $${idx}`); values.push(params.violationType); idx++; }
  if (params.startDate) { conditions.push(`v.recorded_at >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`v.recorded_at <= $${idx}`); values.push(params.endDate); idx++; }
  conditions.push(`v.tenant_id = $${idx}`); values.push(tenantId); idx++;

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM driver_violations v WHERE ${where}`, values
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT v.*, d.employee_code AS driver_employee_code, u.name AS driver_name,
            actor.name AS action_taken_by_name
     FROM driver_violations v
     JOIN drivers d ON d.id = v.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN users actor ON actor.id = v.action_taken_by
     WHERE ${where}
     ORDER BY v.recorded_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset]
  );

  return {
    data: rows.map((r: any) => ({
      ...mapViolation(r),
      driver: { employeeCode: r.driver_employee_code, name: r.driver_name },
      actionTakenByName: r.action_taken_by_name,
    })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function updateViolation(tenantId: string, id: string, input: {
  status?: string; actionTaken?: string;
}) {
  const existing = await queryOne<ViolationRow>(
    'SELECT id, status FROM driver_violations WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!existing) throw new NotFoundError('Violation not found');

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.status) { updates.push(`status = $${idx}`); values.push(input.status); idx++; }
  if (input.status === 'resolved') { updates.push(`resolved_at = NOW()`); }
  if (input.actionTaken !== undefined) { updates.push(`action_taken = $${idx}`); values.push(input.actionTaken); idx++; }
  updates.push('updated_at = NOW()');

  if (updates.length === 1) return mapViolation(existing);

  values.push(id);
  const result = await queryOne<ViolationRow>(
    `UPDATE driver_violations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values
  );
  return mapViolation(result!);
}

export async function disputeViolation(tenantId: string, id: string, input: {
  reason: string; evidence?: { name: string; url: string }[];
}) {
  const existing = await queryOne<ViolationRow>(
    'SELECT id, status FROM driver_violations WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  if (!existing) throw new NotFoundError('Violation not found');
  if (existing.status === 'resolved') throw new ConflictError('Cannot dispute a resolved violation');

  const result = await queryOne<ViolationRow>(
    `UPDATE driver_violations
     SET status = 'disputed', dispute_reason = $1, dispute_evidence = $2::jsonb, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [input.reason, JSON.stringify(input.evidence || []), id]
  );
  return mapViolation(result!);
}

async function getRecentPoints(tenantId: string, driverId: string): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(points), 0)::text AS total
     FROM driver_violations
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL AND status != 'disputed'
       AND recorded_at >= NOW() - INTERVAL '90 days'`,
    [tenantId, driverId]
  );
  return parseInt(rows[0]?.total || '0', 10);
}

export async function getSafetyScore(tenantId: string, driverId: string) {
  const driver = await queryOne<{ id: string; employee_code: string; status: string }>(
    `SELECT d.id, d.employee_code, d.status, u.name AS driver_name
     FROM drivers d LEFT JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const totalPoints = await getRecentPoints(tenantId, driverId);
  const score = Math.max(0, 100 - totalPoints);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : 'D';

  const breakdown = await query<any>(
    `SELECT violation_type, COUNT(*)::int AS count, SUM(points)::int AS points
     FROM driver_violations
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL AND status != 'disputed'
       AND recorded_at >= NOW() - INTERVAL '90 days'
     GROUP BY violation_type ORDER BY points DESC`,
    [tenantId, driverId]
  );

  return {
    driverId,
    score,
    grade,
    totalPoints,
    maxPoints: SUSPENSION_THRESHOLD,
    nearSuspension: totalPoints >= SUSPENSION_THRESHOLD * 0.8,
    suspended: driver.status === 'suspended',
    breakdown,
  };
}

export async function getSafetyLeaderboard(tenantId: string, limit = 20) {
  const drivers = await query<any>(
    `SELECT d.id, d.employee_code, d.status, u.name AS driver_name,
            COALESCE(v.total_points, 0)::int AS total_points,
            GREATEST(0, 100 - COALESCE(v.total_points, 0)) AS score
     FROM drivers d
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN (
       SELECT driver_id, SUM(points) AS total_points
       FROM driver_violations
       WHERE tenant_id = $1 AND deleted_at IS NULL AND status != 'disputed'
         AND recorded_at >= NOW() - INTERVAL '90 days'
       GROUP BY driver_id
     ) v ON v.driver_id = d.id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL AND d.status != 'terminated'
     ORDER BY score DESC
     LIMIT $2`,
    [tenantId, limit]
  );

  return drivers.map((r: any, i: number) => ({
    rank: i + 1,
    driverId: r.id,
    driverName: r.driver_name,
    employeeCode: r.employee_code,
    status: r.status,
    score: r.score,
    totalPoints: r.total_points,
  }));
}
