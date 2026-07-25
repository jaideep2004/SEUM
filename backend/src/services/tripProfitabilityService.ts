import { query, queryOne } from '../db';

interface TripProfitRow {
  id: string; tenant_id: string; route_id: string; bus_id: string;
  route_name: string; plate_number: string; driver_name: string;
  trip_type: string; scheduled_date: string; status: string;
  estimated_revenue: string;
  fuel_cost: string; maintenance_cost: string; toll_cost: string;
  total_expenses: string;
}

function mapProfit(r: TripProfitRow) {
  const revenue = parseFloat(r.estimated_revenue || '0');
  const expenses = parseFloat(r.total_expenses || '0');
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return {
    id: r.id, tenantId: r.tenant_id, routeId: r.route_id, busId: r.bus_id,
    routeName: r.route_name, plateNumber: r.plate_number, driverName: r.driver_name,
    tripType: r.trip_type, scheduledDate: r.scheduled_date, status: r.status,
    estimatedRevenue: revenue, fuelCost: parseFloat(r.fuel_cost || '0'),
    maintenanceCost: parseFloat(r.maintenance_cost || '0'),
    tollCost: parseFloat(r.toll_cost || '0'),
    totalExpenses: expenses, profit, marginPercent: Math.round(margin * 100) / 100,
  };
}

export async function listTripProfitability(
  tenantId: string, params: {
    status?: string; startDate?: string; endDate?: string; routeId?: string; busId?: string;
    page: number; pageSize: number;
  },
) {
  const conditions: string[] = ['t.deleted_at IS NULL'];
  const values: any[] = [];
  let idx = 1;

  conditions.push(`t.tenant_id = $${idx}`); values.push(tenantId); idx++;
  if (params.status) { conditions.push(`t.status = $${idx}`); values.push(params.status); idx++; }
  if (params.startDate) { conditions.push(`t.scheduled_date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`t.scheduled_date <= $${idx}`); values.push(params.endDate); idx++; }
  if (params.routeId) { conditions.push(`t.route_id = $${idx}`); values.push(params.routeId); idx++; }
  if (params.busId) { conditions.push(`t.bus_id = $${idx}`); values.push(params.busId); idx++; }

  const where = conditions.join(' AND ');
  const offset = (params.page - 1) * params.pageSize;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) FROM trips t WHERE ${where}`, values,
  );
  const total = parseInt(countResult?.count || '0', 10);

  const rows = await query<any>(
    `SELECT t.id, t.tenant_id, t.route_id, t.bus_id, t.scheduled_date, t.status, t.estimated_revenue,
            r.name AS route_name,
            b.plate_number,
            u.name AS driver_name,
            COALESCE(fuel.total, 0)::text AS fuel_cost,
            COALESCE(maintenance.total, 0)::text AS maintenance_cost,
            COALESCE(tolls.total, 0)::text AS toll_cost,
            COALESCE(fuel.total, 0) + COALESCE(maintenance.total, 0) + COALESCE(tolls.total, 0) AS total_expenses,
            COALESCE(pass.count, 0)::int AS passenger_count
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     LEFT JOIN users u ON u.id = t.driver_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
       WHERE trip_id = t.id AND expense_category = 'fuel' AND deleted_at IS NULL
     ) fuel ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
       WHERE trip_id = t.id AND expense_category = 'maintenance' AND deleted_at IS NULL
     ) maintenance ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
       WHERE trip_id = t.id AND expense_category = 'tolls' AND deleted_at IS NULL
     ) tolls ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) FROM trip_passengers WHERE trip_id = t.id
     ) pass ON true
     WHERE ${where}
     ORDER BY t.scheduled_date DESC, t.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.pageSize, offset],
  );

  return {
    data: rows.map((r: any) => ({ ...mapProfit(r), passengerCount: r.passenger_count })),
    meta: { total, page: params.page, pageSize: params.pageSize },
  };
}

export async function getProfitAnalytics(tenantId: string, params: {
  startDate?: string; endDate?: string; groupBy?: 'route' | 'bus';
}) {
  const conditions: string[] = ['t.deleted_at IS NULL', `t.status = 'completed'`];
  const values: any[] = [];
  let idx = 1;

  conditions.push(`t.tenant_id = $${idx}`); values.push(tenantId); idx++;
  if (params.startDate) { conditions.push(`t.scheduled_date >= $${idx}`); values.push(params.startDate); idx++; }
  if (params.endDate) { conditions.push(`t.scheduled_date <= $${idx}`); values.push(params.endDate); idx++; }

  const where = conditions.join(' AND ');

  // KPIs
  const kpiRow = await queryOne<any>(
    `SELECT COUNT(*)::int AS trip_count,
            COALESCE(AVG(t.estimated_revenue), 0)::text AS avg_revenue,
            COALESCE(AVG(
              t.estimated_revenue - COALESCE(fuel.total, 0) - COALESCE(maintenance.total, 0) - COALESCE(tolls.total, 0)
            ), 0)::text AS avg_profit
     FROM trips t
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'fuel' AND deleted_at IS NULL) fuel ON true
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'maintenance' AND deleted_at IS NULL) maintenance ON true
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'tolls' AND deleted_at IS NULL) tolls ON true
     WHERE ${where}`,
    values,
  );

  // Group breakdown
  const groupField = params.groupBy === 'bus' ? 'b.plate_number' : 'r.name';
  const groupLabel = params.groupBy === 'bus' ? 'plate_number' : 'route_name';
  const groupJoin = params.groupBy === 'bus'
    ? 'LEFT JOIN buses b ON b.id = t.bus_id'
    : 'LEFT JOIN routes r ON r.id = t.route_id';

  const groupRows = await query<any>(
    `SELECT ${groupField} AS label,
            COUNT(*)::int AS trip_count,
            COALESCE(SUM(t.estimated_revenue), 0)::text AS total_revenue,
            COALESCE(SUM(t.estimated_revenue - COALESCE(fuel.total, 0) - COALESCE(maintenance.total, 0) - COALESCE(tolls.total, 0)), 0)::text AS total_profit
     FROM trips t
     ${groupJoin}
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'fuel' AND deleted_at IS NULL) fuel ON true
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'maintenance' AND deleted_at IS NULL) maintenance ON true
     LEFT JOIN LATERAL (SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE trip_id = t.id AND expense_category = 'tolls' AND deleted_at IS NULL) tolls ON true
     WHERE ${where}
     GROUP BY ${groupField}
     ORDER BY total_profit DESC`,
    values,
  );

  return {
    kpis: {
      tripCount: kpiRow?.trip_count || 0,
      avgRevenue: parseFloat(kpiRow?.avg_revenue || '0'),
      avgProfit: parseFloat(kpiRow?.avg_profit || '0'),
      avgMargin: parseFloat(kpiRow?.avg_revenue || '0') > 0
        ? Math.round((parseFloat(kpiRow?.avg_profit || '0') / parseFloat(kpiRow?.avg_revenue || '1')) * 10000) / 100
        : 0,
    },
    breakdown: groupRows.map((r: any) => {
      const rev = parseFloat(r.total_revenue);
      const profit = parseFloat(r.total_profit);
      return {
        label: r.label,
        tripCount: r.trip_count,
        totalRevenue: rev,
        totalProfit: profit,
        marginPercent: rev > 0 ? Math.round((profit / rev) * 10000) / 100 : 0,
      };
    }),
  };
}

export async function createProfitJournalEntry(tenantId: string, tripId: string) {
  const trip = await queryOne<any>(
    `SELECT t.id, t.estimated_revenue, t.scheduled_date,
            r.name AS route_name, b.plate_number
     FROM trips t
     LEFT JOIN routes r ON r.id = t.route_id
     LEFT JOIN buses b ON b.id = t.bus_id
     WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
    [tripId, tenantId],
  );
  if (!trip) return null;

  const revenue = parseFloat(trip.estimated_revenue || '0');
  if (revenue <= 0) return null;

  // Find revenue and expense accounts
  const revenueAccount = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '4000' AND is_active = true AND deleted_at IS NULL`,
    [tenantId],
  );
  const arAccount = await queryOne<any>(
    `SELECT id FROM accounts WHERE tenant_id = $1 AND code = '1200' AND is_active = true AND deleted_at IS NULL`,
    [tenantId],
  );
  if (!revenueAccount || !arAccount) return null;

  const entryNumber = `AJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

  const entry = await queryOne<any>(
    `INSERT INTO journal_entries (tenant_id, entry_number, date, description, reference_type, reference_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [tenantId, entryNumber, trip.scheduled_date,
     `Auto-journal: Trip revenue ${trip.route_name || ''} ${trip.plate_number || ''}`,
     'trip', tripId, 'posted', null],
  );

  await query(
    `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
     VALUES ($1, $2, $3, 0, 'Trip revenue'), ($1, $4, 0, $3, 'Accounts receivable - trip revenue')`,
    [entry!.id, arAccount.id, revenue, revenueAccount.id],
  );

  return entry?.id;
}
