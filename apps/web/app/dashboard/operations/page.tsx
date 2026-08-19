"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import {
  Bus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  CalendarCheck,
  ChevronRight,
  Plus,
  UserCheck,
  Navigation,
  Route,
  FileText,
  Fuel,
  Gauge,
  Radio,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import MapPlaceholder from "@/components/dashboard/MapPlaceholder";
import styles from "./page.module.css";

interface TripStats {
  total_trips: number;
  scheduled: number;
  en_route: number;
  completed: number;
  delayed: number;
  cancelled: number;
}

interface ActiveTrip {
  id: string;
  routeName: string;
  busPlate: string;
  driverName: string;
  status: string;
  scheduledStartTime: string;
}

interface BookingRow {
  id: string;
  bookingReference: string;
  numberOfPassengers: number;
  status: string;
  bookingDate: string;
  totalAmount: number;
  customer?: { name: string };
  trip?: { route?: { name: string; origin: string; destination: string } };
}

const quickActions = [
  { label: "Create Trip", icon: Plus, color: "#2563eb", href: "/dashboard/trips/new" },
  { label: "Trip Monitoring", icon: Radio, color: "#ef4444", href: "/dashboard/monitoring" },
  { label: "Assign Driver", icon: UserCheck, color: "#6366f1", href: "/dashboard/trips" },
  { label: "Delay Dashboard", icon: AlertTriangle, color: "#f59e0b", href: "/dashboard/delays" },
  { label: "Routes", icon: Route, color: "#10b981", href: "/dashboard/routes" },
  { label: "Work Order", icon: FileText, color: "#8b5cf6", href: "/dashboard/maintenance" },
];

const statusLabel: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function bookingStatus(status: string) {
  const map: Record<string, { cls: string }> = {
    confirmed: { cls: styles.badgeSuccess },
    pending: { cls: styles.badgeWarning },
    completed: { cls: styles.badgeNeutral },
    cancelled: { cls: styles.badgeNeutral },
  };
  return <span className={`${styles.badge} ${map[status]?.cls || styles.badgeNeutral}`}>{statusLabel[status] || status}</span>;
}

export default function OperationsDashboard() {
  const [stats, setStats] = useState<TripStats | null>(null);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [delayedTrips, setDelayedTrips] = useState<ActiveTrip[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [activeBuses, setActiveBuses] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [employees, setEmployees] = useState(0);
  const [maintenanceDue, setMaintenanceDue] = useState(0);
  const [readiness, setReadiness] = useState({ ready: 0, maintenance: 0, outOfService: 0, unchecked: 0 });
  const [fuel, setFuel] = useState({ totalLiters: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [mon, buses, bks, rds, fa, hr, mnt] = await Promise.all([
          api.get<any>(`/operations/monitoring/dashboard?date=${today}`).catch(() => null),
          api.get<any>("/fleet/buses?pageSize=100").catch(() => null),
          api.get<any>("/bookings?pageSize=5").catch(() => null),
          api.get<any>("/fleet/readiness").catch(() => null),
          api.get<any>("/fleet/fuel/analytics").catch(() => null),
          api.get<any>("/hr/employees?pageSize=1").catch(() => null),
          api.get<any>("/maintenance/tasks?pageSize=1&status=in_progress").catch(() => null),
        ]);

        if (mon) {
          setStats(mon.stats || null);
          setActiveTrips((mon.activeTrips || []).slice(0, 5));
          setDelayedTrips((mon.delayedTrips || []).slice(0, 5));
        }
        if (buses?.data) {
          setActiveBuses(buses.data.filter((b: any) => b.status === "active" && b.isActive !== false).length);
        }
        if (bks?.data) {
          setBookings(bks.data.slice(0, 5));
        }
        if (rds) {
          const counts = { ready: 0, maintenance: 0, outOfService: 0, unchecked: 0 };
          for (const r of rds) {
            const st = r.status || (r as any).bus_status || "unchecked";
            if (st === "ready") counts.ready++;
            else if (st === "in_maintenance") counts.maintenance++;
            else if (st === "out_of_service") counts.outOfService++;
            else counts.unchecked++;
          }
          setReadiness(counts);
        }
        if (fa?.summary) {
          setFuel({ totalLiters: fa.summary.totalLiters || 0, totalCost: fa.summary.totalCost || 0 });
        }
        if (hr?.meta?.total !== undefined) setEmployees(hr.meta.total);
        if (mnt?.meta?.total !== undefined) setMaintenanceDue(mnt.meta.total);
        const bd = await api.get<any>("/bookings/dashboard").catch(() => null);
        if (bd?.revenue?.today !== undefined) setRevenueToday(bd.revenue.today);
      } catch (e) {
        console.error("Failed to load operations dashboard", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = stats?.total_trips || 0;
  const kpiCards = [
    { label: "Today's Trips", value: String(total), change: `${stats?.en_route || 0} en route now`, trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff" },
    { label: "Active Buses", value: String(activeBuses), change: `${readiness.ready} ready today`, trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
    { label: "Delayed Trips", value: String(stats?.delayed || 0), change: `${(stats?.delayed || 0) > 0 ? "needs attention" : "all on time"}`, trend: (stats?.delayed || 0) > 0 ? ("warning" as const) : ("up" as const), icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Today's Revenue", value: `SAR ${revenueToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: "from bookings", trend: "up" as const, icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
    { label: "Employees", value: String(employees), icon: Users, color: "#6366f1", bg: "#eef2ff" },
    { label: "Maintenance Due", value: String(maintenanceDue), icon: CalendarCheck, color: "#f59e0b", bg: "#fffbeb" },
  ];

  const readinessTotal = readiness.ready + readiness.maintenance + readiness.outOfService + readiness.unchecked;
  const readinessPct = readinessTotal > 0 ? Math.round((readiness.ready / readinessTotal) * 100) : 0;

  const tripDistribution = [
    { label: "Completed", value: stats?.completed || 0, color: "#10b981" },
    { label: "En Route", value: stats?.en_route || 0, color: "#2563eb" },
    { label: "Scheduled", value: stats?.scheduled || 0, color: "#94a3b8" },
    { label: "Delayed", value: stats?.delayed || 0, color: "#f59e0b" },
    { label: "Cancelled", value: stats?.cancelled || 0, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Operations Dashboard</h1>
          <p className={styles.pageDesc}>Live monitoring of all fleet operations</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading live operations data...</div>
      ) : (
        <>
          <div className={styles.kpiGrid6}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={styles.kpiCard}>
                  <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.kpiInfo}>
                    <span className={styles.kpiLabel}>{card.label}</span>
                    <span className={styles.kpiValue}>{card.value}</span>
                    {card.change && (
                      <span className={`${styles.kpiChange} ${card.trend === "up" ? styles.kpiUp : card.trend === "warning" ? styles.kpiWarn : ""}`}>
                        {card.change}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.leftContent}>
              <div className={styles.gridMapActions}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Operations Overview</h2>
                  </div>
                  <MapPlaceholder label="Live fleet tracking — Makkah Region" />
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Quick Actions</h2>
                  </div>
                  <div className={styles.quickActionsGrid}>
                    {quickActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.label} href={a.href} className={styles.quickActionBtn}>
                          <div className={styles.quickActionIcon} style={{ background: `${a.color}15`, color: a.color }}>
                            <Icon size={20} />
                          </div>
                          <span className={styles.quickActionLabel}>{a.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recent Bookings</h2>
                  <Link href="/dashboard/bookings" className={styles.cardAction}>View All <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Passengers</th>
                        <th>Service Type</th>
                        <th>Route</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td><span className={styles.bookingId}>{b.bookingReference}</span></td>
                          <td>{b.customer?.name || "-"}</td>
                          <td>{b.numberOfPassengers}</td>
                          <td className={styles.textMuted}>{b.trip?.route?.name || "—"}</td>
                          <td className={styles.textMuted}>
                            {b.trip?.route?.origin && b.trip?.route?.destination ? `${b.trip.route.origin} → ${b.trip.route.destination}` : "—"}
                          </td>
                          <td>{bookingStatus(b.status)}</td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr><td colSpan={6} className={styles.textMuted} style={{ textAlign: "center", padding: 24 }}>No bookings yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Fleet Readiness</h2>
                  </div>
                  <div className={styles.readinessInfo}>
                    <div className={styles.readinessBar}>
                      <div className={styles.readinessFill} style={{ width: `${readinessPct}%` }} />
                    </div>
                    <div className={styles.readinessStats}>
                      <span className={styles.readinessPercent}>{readinessPct}%</span>
                      <span className={styles.readinessDetail}>
                        {readiness.ready} Ready · {readiness.maintenance} Under Maintenance · {readiness.outOfService} Out of Service
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Fuel Summary</h2>
                  </div>
                  <div className={styles.fuelGrid}>
                    <div className={styles.fuelItem}>
                      <Fuel size={18} style={{ color: "#2563eb" }} />
                      <span className={styles.fuelLabel}>Total Fuel</span>
                      <span className={styles.fuelValue}>{fuel.totalLiters.toLocaleString()} L</span>
                    </div>
                    <div className={styles.fuelItem}>
                      <Gauge size={18} style={{ color: "#10b981" }} />
                      <span className={styles.fuelLabel}>Total Cost</span>
                      <span className={styles.fuelValue}>SAR {fuel.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Trip Status Distribution</h2>
                </div>
                <div className={styles.donutCenter}>
                  {tripDistribution.length > 0 ? (
                    <DonutChart
                      segments={tripDistribution}
                      size={150}
                      thickness={18}
                      centerValue={String(total)}
                      centerLabel="Total Trips"
                    />
                  ) : (
                    <div className={styles.textMuted} style={{ padding: 32 }}>No trips today</div>
                  )}
                </div>
                <div className={styles.donutLegend}>
                  {tripDistribution.map((t, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: t.color }} />
                      <span className={styles.legendLabel}>{t.label}</span>
                      <span className={styles.legendValue}>{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Active Trips Now</h2>
                  <Link href="/dashboard/monitoring" className={styles.cardAction}>View All <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.upcomingList}>
                  {activeTrips.map((t, i) => (
                    <div key={t.id || i} className={styles.upcomingItem}>
                      <div className={styles.upcomingHeader}>
                        <span className={styles.upcomingId}>{t.busPlate || t.routeName || "Trip"}</span>
                        <span className={styles.upcomingTime}>{t.scheduledStartTime}</span>
                      </div>
                      <span className={styles.upcomingRoute}>{t.routeName || "—"}</span>
                      <div className={styles.upcomingMeta}>
                        <span>{t.driverName || "Unassigned"}</span>
                        <span>·</span>
                        <span>{t.status}</span>
                      </div>
                    </div>
                  ))}
                  {activeTrips.length === 0 && (
                    <div className={styles.textMuted} style={{ padding: 16 }}>No active trips</div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Delayed Trips</h2>
                  <Link href="/dashboard/delays" className={styles.cardAction}>View All <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.alertList}>
                  {delayedTrips.slice(0, 5).map((d, i) => (
                    <Link key={d.id || i} href="/dashboard/delays" className={styles.alertItem}>
                      <span className={styles.alertDot} style={{ background: "#f59e0b" }} />
                      <span className={styles.alertText}>
                        {d.routeName || "Trip"} — {d.busPlate || "-"} · {d.driverName || "Unassigned"}
                      </span>
                    </Link>
                  ))}
                  {delayedTrips.length === 0 && (
                    <div className={styles.textMuted} style={{ padding: 16 }}>No delayed trips 🎉</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}