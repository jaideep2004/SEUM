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
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
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
  { labelKey: "ops.dash.qaCreateTrip", icon: Plus, color: "#2563eb", href: "/dashboard/trips/new" },
  { labelKey: "ops.dash.qaMonitoring", icon: Radio, color: "#ef4444", href: "/dashboard/monitoring" },
  { labelKey: "ops.dash.qaAssignDriver", icon: UserCheck, color: "#6366f1", href: "/dashboard/trips" },
  { labelKey: "ops.dash.qaDelayDash", icon: AlertTriangle, color: "#f59e0b", href: "/dashboard/delays" },
  { labelKey: "ops.dash.qaRoutes", icon: Route, color: "#10b981", href: "/dashboard/routes" },
  { labelKey: "ops.dash.qaWorkOrder", icon: FileText, color: "#8b5cf6", href: "/dashboard/maintenance" },
];

const statusLabelKeys: Record<string, string> = {
  confirmed: "ops.dash.bkConfirmed",
  pending: "ops.dash.bkPending",
  completed: "ops.dash.bkCompleted",
  cancelled: "ops.dash.bkCancelled",
  refunded: "ops.dash.bkRefunded",
};

function bookingStatus(status: string, t: (key: string) => string) {
  const map: Record<string, { cls: string }> = {
    confirmed: { cls: styles.badgeSuccess },
    pending: { cls: styles.badgeWarning },
    completed: { cls: styles.badgeNeutral },
    cancelled: { cls: styles.badgeNeutral },
  };
  return <span className={`${styles.badge} ${map[status]?.cls || styles.badgeNeutral}`}>{statusLabelKeys[status] ? t(statusLabelKeys[status]) : status}</span>;
}

export default function OperationsDashboard() {
  const { lang, t } = useLanguage();
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
    { labelKey: "ops.dash.kpiTrips", value: String(total), change: `${stats?.en_route || 0} ${t("ops.dash.enRouteNow")}`, trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff" },
    { labelKey: "ops.dash.kpiBuses", value: String(activeBuses), change: `${readiness.ready} ${t("ops.dash.readyToday")}`, trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
    { labelKey: "ops.dash.kpiDelayed", value: String(stats?.delayed || 0), change: `${(stats?.delayed || 0) > 0 ? t("ops.dash.needsAttention") : t("ops.dash.allOnTime")}`, trend: (stats?.delayed || 0) > 0 ? ("warning" as const) : ("up" as const), icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
    { labelKey: "ops.dash.kpiRevenue", value: `SAR ${revenueToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: t("ops.dash.fromBookings"), trend: "up" as const, icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
    { labelKey: "ops.dash.kpiEmployees", value: String(employees), icon: Users, color: "#6366f1", bg: "#eef2ff" },
    { labelKey: "ops.dash.kpiMaintenance", value: String(maintenanceDue), icon: CalendarCheck, color: "#f59e0b", bg: "#fffbeb" },
  ];

  const readinessTotal = readiness.ready + readiness.maintenance + readiness.outOfService + readiness.unchecked;
  const readinessPct = readinessTotal > 0 ? Math.round((readiness.ready / readinessTotal) * 100) : 0;

  const tripDistribution = [
    { label: t("tracking.mon.completed"), value: stats?.completed || 0, color: "#10b981" },
    { label: t("tracking.mon.enRoute"), value: stats?.en_route || 0, color: "#2563eb" },
    { label: t("tracking.mon.scheduled"), value: stats?.scheduled || 0, color: "#94a3b8" },
    { label: t("tracking.mon.delayed"), value: stats?.delayed || 0, color: "#f59e0b" },
    { label: t("tracking.mon.cancelled"), value: stats?.cancelled || 0, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("ops.dash.title")}</h1>
          <p className={styles.pageDesc}>{t("ops.dash.desc")}</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("ops.dash.loading")}</div>
      ) : (
        <>
          <div className={styles.kpiGrid6}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.labelKey} className={styles.kpiCard}>
                  <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.kpiInfo}>
                    <span className={styles.kpiLabel}>{t(card.labelKey)}</span>
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
                    <h2 className={styles.cardTitle}>{t("ops.dash.overview")}</h2>
                  </div>
                  <MapPlaceholder label={t("ops.dash.mapLabel")} />
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t("ops.dash.quickActions")}</h2>
                  </div>
                  <div className={styles.quickActionsGrid}>
                    {quickActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.labelKey} href={a.href} className={styles.quickActionBtn}>
                          <div className={styles.quickActionIcon} style={{ background: `${a.color}15`, color: a.color }}>
                            <Icon size={20} />
                          </div>
                          <span className={styles.quickActionLabel}>{t(a.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("ops.dash.recentBookings")}</h2>
                  <Link href="/dashboard/bookings" className={styles.cardAction}>{t("ops.dash.viewAll")} <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("ops.dash.colBookingId")}</th>
                        <th>{t("ops.dash.colCustomer")}</th>
                        <th>{t("ops.dash.colPassengers")}</th>
                        <th>{t("ops.dash.colServiceType")}</th>
                        <th>{t("ops.dash.colRoute")}</th>
                        <th>{t("ops.dash.colStatus")}</th>
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
                          <td>{bookingStatus(b.status, t)}</td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr><td colSpan={6} className={styles.textMuted} style={{ textAlign: "center", padding: 24 }}>{t("ops.dash.noBookings")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t("ops.dash.fleetReadiness")}</h2>
                  </div>
                  <div className={styles.readinessInfo}>
                    <div className={styles.readinessBar}>
                      <div className={styles.readinessFill} style={{ width: `${readinessPct}%` }} />
                    </div>
                    <div className={styles.readinessStats}>
                      <span className={styles.readinessPercent}>{readinessPct}%</span>
                      <span className={styles.readinessDetail}>
                        {readiness.ready} {t("ops.dash.readyWord")} · {readiness.maintenance} {t("ops.dash.underMaint")} · {readiness.outOfService} {t("ops.dash.outOfService")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t("ops.dash.fuelSummary")}</h2>
                  </div>
                  <div className={styles.fuelGrid}>
                    <div className={styles.fuelItem}>
                      <Fuel size={18} style={{ color: "#2563eb" }} />
                      <span className={styles.fuelLabel}>{t("ops.dash.totalFuel")}</span>
                      <span className={styles.fuelValue}>{fuel.totalLiters.toLocaleString()} {t("ops.dash.litersUnit")}</span>
                    </div>
                    <div className={styles.fuelItem}>
                      <Gauge size={18} style={{ color: "#10b981" }} />
                      <span className={styles.fuelLabel}>{t("ops.dash.totalCost")}</span>
                      <span className={styles.fuelValue}>SAR {fuel.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("ops.dash.tripDist")}</h2>
                </div>
                <div className={styles.donutCenter}>
                  {tripDistribution.length > 0 ? (
                    <DonutChart
                      segments={tripDistribution}
                      size={150}
                      thickness={18}
                      centerValue={String(total)}
                      centerLabel={t("ops.dash.totalTrips")}
                    />
                  ) : (
                    <div className={styles.textMuted} style={{ padding: 32 }}>{t("ops.dash.noTripsToday")}</div>
                  )}
                </div>
                <div className={styles.donutLegend}>
                  {tripDistribution.map((seg, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: seg.color }} />
                      <span className={styles.legendLabel}>{seg.label}</span>
                      <span className={styles.legendValue}>{seg.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("ops.dash.activeTripsNow")}</h2>
                  <Link href="/dashboard/monitoring" className={styles.cardAction}>{t("ops.dash.viewAll")} <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.upcomingList}>
                  {activeTrips.map((at, i) => (
                    <div key={at.id || i} className={styles.upcomingItem}>
                      <div className={styles.upcomingHeader}>
                        <span className={styles.upcomingId}>{at.busPlate || at.routeName || t("ops.dash.tripWord")}</span>
                        <span className={styles.upcomingTime}>{at.scheduledStartTime}</span>
                      </div>
                      <span className={styles.upcomingRoute}>{at.routeName || "—"}</span>
                      <div className={styles.upcomingMeta}>
                        <span>{at.driverName || t("ops.dash.unassigned")}</span>
                        <span>·</span>
                        <span>{at.status}</span>
                      </div>
                    </div>
                  ))}
                  {activeTrips.length === 0 && (
                    <div className={styles.textMuted} style={{ padding: 16 }}>{t("ops.dash.noActiveTrips")}</div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("ops.dash.delayedTrips")}</h2>
                  <Link href="/dashboard/delays" className={styles.cardAction}>{t("ops.dash.viewAll")} <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.alertList}>
                  {delayedTrips.slice(0, 5).map((d, i) => (
                    <Link key={d.id || i} href="/dashboard/delays" className={styles.alertItem}>
                      <span className={styles.alertDot} style={{ background: "#f59e0b" }} />
                      <span className={styles.alertText}>
                        {d.routeName || t("ops.dash.tripWord")} — {d.busPlate || "-"} · {d.driverName || t("ops.dash.unassigned")}
                      </span>
                    </Link>
                  ))}
                  {delayedTrips.length === 0 && (
                    <div className={styles.textMuted} style={{ padding: 16 }}>{t("ops.dash.noDelayedTrips")}</div>
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