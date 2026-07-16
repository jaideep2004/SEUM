import { query, queryOne } from '../db';

export async function getFleetAnalytics(tenantId: string) {
  // 1. Buses by status
  const busesByStatus = await query<any>(
    `SELECT status, COUNT(*)::int AS count
     FROM buses WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY status`,
    [tenantId]
  );

  let totalBuses = 0;
  const statusBreakdown: Record<string, number> = {};
  for (const row of busesByStatus) {
    statusBreakdown[row.status] = row.count;
    totalBuses += row.count;
  }

  // 2. Average bus age
  const avgAgeResult = await queryOne<any>(
    `SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), CONCAT(year::text, '-01-01')::date))))::int AS avg_age
     FROM buses WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );
  const avgBusAge = avgAgeResult?.avg_age || 0;

  // 3. Fleet utilization — buses with active assignments in current month
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

  const utilResult = await queryOne<any>(
    `SELECT COUNT(DISTINCT a.bus_id)::int AS used_buses
     FROM assignments a
     WHERE a.tenant_id = $1
       AND a.status IN ('scheduled', 'active')
       AND a.start_date <= $2
       AND (a.end_date IS NULL OR a.end_date >= $3)`,
    [tenantId, lastDay, firstDay]
  );
  const usedBuses = utilResult?.used_buses || 0;
  const utilizationRate = totalBuses > 0 ? parseFloat(((usedBuses / totalBuses) * 100).toFixed(1)) : 0;

  // 4. Upcoming document renewals (next 30 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const upcomingRenewals = await query<any>(
    `SELECT d.id, d.document_type, d.document_number, d.expiry_date,
            d.status AS doc_status, b.plate_number, b.make, b.model
     FROM bus_documents d
     JOIN buses b ON b.id = d.bus_id
     WHERE d.tenant_id = $1
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date >= CURRENT_DATE
       AND d.expiry_date <= $2
     ORDER BY d.expiry_date ASC
     LIMIT 20`,
    [tenantId, cutoffStr]
  );

  // 5. Fuel efficiency trends (last 12 data points)
  const fuelEfficiency = await query<any>(
    `SELECT f1.date, f1.liters, f1.odometer_reading AS curr_odo,
            f2.odometer_reading AS prev_odo, b.plate_number
     FROM fuel_logs f1
     JOIN fuel_logs f2 ON f2.bus_id = f1.bus_id AND f2.tenant_id = f1.tenant_id
       AND f2.odometer_reading IS NOT NULL AND f2.odometer_reading < f1.odometer_reading
     JOIN buses b ON b.id = f1.bus_id
     WHERE f1.tenant_id = $1 AND f1.odometer_reading IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM fuel_logs f3
         WHERE f3.bus_id = f1.bus_id AND f3.tenant_id = f1.tenant_id
           AND f3.odometer_reading IS NOT NULL
           AND f3.odometer_reading > f2.odometer_reading
           AND f3.odometer_reading < f1.odometer_reading
       )
     ORDER BY f1.date DESC
     LIMIT 12`,
    [tenantId]
  );

  const efficiencyTrend = fuelEfficiency
    .map((r: any) => ({
      date: r.date,
      plateNumber: r.plate_number,
      kmPerLiter: r.liters > 0 ? parseFloat(((r.curr_odo - r.prev_odo) / r.liters).toFixed(2)) : 0,
    }))
    .reverse();

  const avgKmPerLiter = efficiencyTrend.length > 0
    ? parseFloat((efficiencyTrend.reduce((s: number, d: any) => s + d.kmPerLiter, 0) / efficiencyTrend.length).toFixed(2))
    : null;

  // 6. Maintenance cost per bus (placeholder — no maintenance module)
  const maintenanceCostPerBus: { busId: string; plateNumber: string; totalCost: number }[] = [];

  // 7. Readiness distribution
  const readinessDist = await query<any>(
    `SELECT COALESCE(r.status, 'unchecked') AS status, COUNT(*)::int AS count
     FROM buses b
     LEFT JOIN bus_readiness r ON r.bus_id = b.id AND r.tenant_id = b.tenant_id
     WHERE b.tenant_id = $1 AND b.deleted_at IS NULL
     GROUP BY COALESCE(r.status, 'unchecked')`,
    [tenantId]
  );

  return {
    summary: {
      totalBuses,
      activeBuses: statusBreakdown['active'] || 0,
      maintenanceBuses: statusBreakdown['maintenance'] || 0,
      retiredBuses: statusBreakdown['retired'] || 0,
      soldBuses: statusBreakdown['sold'] || 0,
    },
    avgBusAge,
    utilizationRate,
    usedBuses,
    upcomingRenewals: upcomingRenewals.map((r: any) => ({
      id: r.id,
      documentType: r.document_type,
      documentNumber: r.document_number,
      expiryDate: r.expiry_date,
      status: r.doc_status,
      plateNumber: r.plate_number,
      busMake: r.make,
      busModel: r.model,
    })),
    fuelEfficiency: {
      avgKmPerLiter,
      trend: efficiencyTrend,
    },
    maintenanceCostPerBus,
    readinessDistribution: Object.fromEntries(
      readinessDist.map((r: any) => [r.status, r.count])
    ),
  };
}

export async function exportFleetReportCSV(tenantId: string): Promise<string> {
  const buses = await query<any>(
    `SELECT id, plate_number, make, model, year, status, assigned_depot
     FROM buses WHERE tenant_id = $1 AND deleted_at IS NULL
     ORDER BY plate_number`,
    [tenantId]
  );

  const header = 'ID,Plate Number,Make,Model,Year,Status,Depot';
  const rows = buses.map((b: any) =>
    `"${b.id}","${b.plate_number}","${b.make}","${b.model}",${b.year},"${b.status}","${b.assigned_depot || ''}"`
  );

  return [header, ...rows].join('\n');
}
