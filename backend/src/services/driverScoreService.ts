import { query, queryOne } from '../db';
import { NotFoundError } from '../utils/errors';

interface ScoreRow {
  id: string;
  tenant_id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  safety_score: string;
  punctuality_score: string;
  customer_score: string;
  fuel_efficiency_score: string;
  overall_score: string;
  computed_by: string | null;
  computed_at: string;
  created_at: string;
  deleted_at: string | null;
}

function mapScore(row: ScoreRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    driverId: row.driver_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    safetyScore: parseFloat(row.safety_score),
    punctualityScore: parseFloat(row.punctuality_score),
    customerScore: parseFloat(row.customer_score),
    fuelEfficiencyScore: parseFloat(row.fuel_efficiency_score),
    overallScore: parseFloat(row.overall_score),
    computedBy: row.computed_by,
    computedAt: row.computed_at,
    createdAt: row.created_at,
  };
}

export async function computeScore(tenantId: string, driverId: string, periodStart: string, periodEnd: string, computedBy?: string) {
  const driver = await queryOne<{ id: string }>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  // Safety score from violations (90-day window)
  const safety = await queryOne<{ total_points: string; violation_count: string }>(
    `SELECT COALESCE(SUM(points), 0)::text AS total_points, COUNT(*)::text AS violation_count
     FROM driver_violations
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL AND status != 'disputed'
       AND recorded_at >= $3::date AND recorded_at <= ($4::date + INTERVAL '1 day')`,
    [tenantId, driverId, periodStart, periodEnd]
  );
  const totalPoints = parseInt(safety?.total_points || '0', 10);
  const safetyScore = Math.max(0, 100 - totalPoints);

  // Punctuality from attendance (late arrivals)
  const punctuality = await queryOne<{ late_days: string; total_days: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN ('late', 'absent') THEN 1 ELSE 0 END), 0)::text AS late_days,
       COUNT(*)::text AS total_days
     FROM driver_attendance
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL
       AND date >= $3 AND date <= $4`,
    [tenantId, driverId, periodStart, periodEnd]
  );
  const lateDays = parseInt(punctuality?.late_days || '0', 10);
  const totalDays = parseInt(punctuality?.total_days || '0', 10);
  const punctualityScore = totalDays > 0 ? Math.max(0, 100 - (lateDays / totalDays) * 100) : 85;

  // Customer score from customer_complaint violations
  const customer = await queryOne<{ complaint_count: string }>(
    `SELECT COUNT(*)::text AS complaint_count
     FROM driver_violations
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL
       AND violation_type = 'customer_complaint' AND status != 'disputed'
       AND recorded_at >= $3::date AND recorded_at <= ($4::date + INTERVAL '1 day')`,
    [tenantId, driverId, periodStart, periodEnd]
  );
  const complaintCount = parseInt(customer?.complaint_count || '0', 10);
  const customerScore = Math.max(0, 100 - complaintCount * 20);

  // Fuel efficiency (placeholder - from fuel_logs when integrated)
  const fuel = await queryOne<{ avg_km_per_liter: string }>(
    `SELECT
       CASE WHEN SUM(fl.liters) > 0 THEN (SUM(fl.odometer_reading - prev.odometer) / SUM(fl.liters))::text ELSE '0' END AS avg_km_per_liter
     FROM fuel_logs fl
     LEFT JOIN LATERAL (
       SELECT COALESCE(MAX(f2.odometer_reading), fl.odometer_reading - 1) AS odometer
       FROM fuel_logs f2
       WHERE f2.bus_id = fl.bus_id AND f2.date < fl.date AND f2.tenant_id = fl.tenant_id
     ) prev ON true
     WHERE fl.driver_id = $1 AND fl.tenant_id = $2 AND fl.date >= $3 AND fl.date <= $4`,
    [driverId, tenantId, periodStart, periodEnd]
  );

  let fuelScore = 70;
  if (fuel) {
    const kmpl = parseFloat(fuel.avg_km_per_liter);
    if (kmpl > 0) fuelScore = Math.min(100, (kmpl / 5) * 100);
  }

  const overallScore = Math.round(safetyScore * 0.4 + punctualityScore * 0.2 + customerScore * 0.2 + fuelScore * 0.2);

  const result = await queryOne<ScoreRow>(
    `INSERT INTO driver_scores (tenant_id, driver_id, period_start, period_end, safety_score, punctuality_score, customer_score, fuel_efficiency_score, overall_score, computed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, driver_id, period_start, period_end) DO UPDATE SET
       safety_score = EXCLUDED.safety_score, punctuality_score = EXCLUDED.punctuality_score,
       customer_score = EXCLUDED.customer_score, fuel_efficiency_score = EXCLUDED.fuel_efficiency_score,
       overall_score = EXCLUDED.overall_score, computed_by = EXCLUDED.computed_by, computed_at = NOW()
     RETURNING *`,
    [tenantId, driverId, periodStart, periodEnd, safetyScore, punctualityScore, customerScore, fuelScore, overallScore, computedBy || null]
  );

  const recommendation = getRecommendation(overallScore);

  return { score: mapScore(result!), recommendation };
}

function getRecommendation(score: number): { eligible: boolean; tier: string; bonus?: string } | null {
  if (score >= 90) return { eligible: true, tier: 'platinum', bonus: '20% monthly bonus' };
  if (score >= 80) return { eligible: true, tier: 'gold', bonus: '10% monthly bonus' };
  if (score >= 70) return { eligible: true, tier: 'silver', bonus: '5% monthly bonus' };
  return null;
}

export async function getScoreHistory(tenantId: string, driverId: string, page: number, pageSize: number) {
  const driver = await queryOne<{ id: string }>(
    'SELECT id FROM drivers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
    [driverId, tenantId]
  );
  if (!driver) throw new NotFoundError('Driver not found');

  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM driver_scores WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL',
    [tenantId, driverId]
  );
  const total = parseInt(countResult?.count || '0', 10);
  const offset = (page - 1) * pageSize;

  const rows = await query<ScoreRow>(
    `SELECT * FROM driver_scores
     WHERE tenant_id = $1 AND driver_id = $2 AND deleted_at IS NULL
     ORDER BY period_start DESC
     LIMIT $3 OFFSET $4`,
    [tenantId, driverId, pageSize, offset]
  );

  return {
    data: rows.map(mapScore),
    meta: { total, page, pageSize },
  };
}

export async function getLeaderboard(tenantId: string, period: 'month' | 'quarter' | 'year', page: number, pageSize: number) {
  const now = new Date();
  let periodStart: string;
  if (period === 'month') {
    periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  } else if (period === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3 + 1;
    periodStart = `${now.getFullYear()}-${String(qStart).padStart(2, '0')}-01`;
  } else {
    periodStart = `${now.getFullYear()}-01-01`;
  }

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM (
      SELECT DISTINCT s.driver_id FROM driver_scores s
      WHERE s.tenant_id = $1 AND s.deleted_at IS NULL AND s.period_start >= $2
    ) sub`,
    [tenantId, periodStart]
  );
  const total = parseInt(countResult?.count || '0', 10);
  const offset = (page - 1) * pageSize;

  const rows = await query<any>(
    `SELECT s.driver_id, s.overall_score, s.safety_score, s.punctuality_score, s.customer_score, s.fuel_efficiency_score,
            s.period_start, s.period_end, d.employee_code, u.name AS driver_name, d.status AS driver_status
     FROM driver_scores s
     JOIN drivers d ON d.id = s.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE s.tenant_id = $1 AND s.deleted_at IS NULL AND s.period_start >= $2
       AND s.id = (
         SELECT s2.id FROM driver_scores s2
         WHERE s2.driver_id = s.driver_id AND s2.tenant_id = s.tenant_id AND s2.deleted_at IS NULL
         ORDER BY s2.period_start DESC LIMIT 1
       )
     ORDER BY s.overall_score DESC
     LIMIT $3 OFFSET $4`,
    [tenantId, periodStart, pageSize, offset]
  );

  return {
    data: rows.map((r: any, i: number) => ({
      rank: offset + i + 1,
      driverId: r.driver_id,
      driverName: r.driver_name,
      employeeCode: r.employee_code,
      driverStatus: r.driver_status,
      overallScore: parseFloat(r.overall_score),
      safetyScore: parseFloat(r.safety_score),
      punctualityScore: parseFloat(r.punctuality_score),
      customerScore: parseFloat(r.customer_score),
      fuelEfficiencyScore: parseFloat(r.fuel_efficiency_score),
      periodStart: r.period_start,
      periodEnd: r.period_end,
    })),
    meta: { total, page, pageSize, period },
  };
}

export async function getLatestScore(tenantId: string, driverId: string) {
  const row = await queryOne<any>(
    `SELECT s.*, d.employee_code, u.name AS driver_name, d.status AS driver_status
     FROM driver_scores s
     JOIN drivers d ON d.id = s.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE s.tenant_id = $1 AND s.driver_id = $2 AND s.deleted_at IS NULL
     ORDER BY s.period_start DESC LIMIT 1`,
    [tenantId, driverId]
  );
  if (!row) return null;

  return {
    ...mapScore(row),
    driverName: row.driver_name,
    employeeCode: row.employee_code,
    driverStatus: row.driver_status,
    recommendation: getRecommendation(parseFloat(row.overall_score)),
  };
}
