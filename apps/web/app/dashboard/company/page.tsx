"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import {
  Bus,
  Users,
  DollarSign,
  Gauge,
  Clock,
  AlertTriangle,
  Wrench,
  Bell,
  Star,
  ChevronRight,
  Fuel,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
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
  scheduledStartTime?: string;
  delayMinutes?: number;
}

const spark = [12, 16, 14, 20, 18, 24, 22];

export default function CompanyAdminDashboard() {
  const [stats, setStats] = useState<TripStats | null>(null);
  const [fleet, setFleet] = useState({ total: 0, active: 0, maintenance: 0, retired: 0, sold: 0 });
  const [revenue, setRevenue] = useState({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [revenueTrend, setRevenueTrend] = useState<{ day: string; revenue: number }[]>([]);
  const [employees, setEmployees] = useState(0);
  const [maintenanceDue, setMaintenanceDue] = useState(0);
  const [incidents, setIncidents] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [delays, setDelays] = useState<ActiveTrip[]>([]);
  const [renewals, setRenewals] = useState<{ id: string; plateNumber: string; documentType: string; expiryDate: string }[]>([]);
  const [topDrivers, setTopDrivers] = useState<{ driverName: string; overallScore: number; employeeCode: string }[]>([]);
  const [fuel, setFuel] = useState({ totalLiters: 0, totalCost: 0, avgKmPerLiter: 0 });
  const [companyName, setCompanyName] = useState("Company");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [mon, analytics, bd, hr, mnt, brk, notif, leader, fa] = await Promise.all([
          api.get<any>(`/operations/monitoring/dashboard?date=${today}`).catch(() => null),
          api.get<any>("/fleet/analytics/dashboard").catch(() => null),
          api.get<any>("/bookings/dashboard").catch(() => null),
          api.get<any>("/hr/employees?pageSize=1").catch(() => null),
          api.get<any>("/maintenance/tasks?pageSize=1&status=in_progress").catch(() => null),
          api.get<any>("/maintenance/breakdowns?pageSize=1").catch(() => null),
          api.get<any>("/notifications?pageSize=1").catch(() => null),
          api.get<any>("/drivers/scores/leaderboard?period=month&page=1&pageSize=5").catch(() => null),
          api.get<any>(`/fleet/fuel/analytics`).catch(() => null),
        ] as const);

        if (mon) {
          setStats(mon.stats || null);
          setDelays((mon.delayedTrips || []).slice(0, 5));
        }
        if (analytics?.summary) {
          setFleet({
            total: analytics.summary.totalBuses || 0,
            active: analytics.summary.activeBuses || 0,
            maintenance: analytics.summary.maintenanceBuses || 0,
            retired: analytics.summary.retiredBuses || 0,
            sold: analytics.summary.soldBuses || 0,
          });
          setRenewals((analytics.upcomingRenewals || []).slice(0, 5));
        }
        if (fa?.summary) {
          setFuel({ totalLiters: fa.summary.totalLiters || 0, totalCost: fa.summary.totalCost || 0, avgKmPerLiter: fa.avgKmPerLiter || 0 });
        }
        if (bd) {
          setRevenue({ today: bd.revenue?.today || 0, thisWeek: bd.revenue?.thisWeek || 0, thisMonth: bd.revenue?.thisMonth || 0 });
          setRevenueTrend(bd.revenueTrend || []);
        }
        if (hr?.meta?.total !== undefined) setEmployees(hr.meta.total);
        if (mnt?.meta?.total !== undefined) setMaintenanceDue(mnt.meta.total);
        if (brk?.meta?.total !== undefined) setIncidents(brk.meta.total);
        if (notif?.meta?.total !== undefined) setAlertsCount(notif.meta.total);
        if (leader?.data) setTopDrivers(leader.data);

        const me = await api.get<any>("/auth/me").catch(() => null);
        if (me?.tenantName) setCompanyName(me.tenantName);
      } catch (e) {
        console.error("Failed to load company dashboard", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpiRow1 = [
    { label: "Today's Trips", value: String(stats?.total_trips || 0), change: `${stats?.en_route || 0} en route now`, trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff", sparkData: spark },
    { label: "Active Buses", value: String(fleet.active), change: `${fleet.total} total fleet`, trend: "up" as const, icon: Gauge, color: "#10b981", bg: "#ecfdf5", sparkData: spark },
    { label: "Delayed Trips", value: String(stats?.delayed || 0), change: (stats?.delayed || 0) > 0 ? "needs attention" : "all on time", trend: (stats?.delayed || 0) > 0 ? ("warning" as const) : ("up" as const), icon: Clock, color: "#f59e0b", bg: "#fffbeb", sparkData: spark },
    { label: "Today's Revenue", value: `SAR ${(revenue.today || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `SAR ${(revenue.thisMonth || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} this month`, trend: "up" as const, icon: DollarSign, color: "#10b981", bg: "#ecfdf5", sparkData: spark },
  ];

  const kpiRow2 = [
    { label: "Employees", value: String(employees), icon: Users, color: "#6366f1", bg: "#eef2ff" },
    { label: "Maintenance Due", value: String(maintenanceDue), icon: Wrench, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Incidents", value: String(incidents), icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
    { label: "Alerts", value: String(alertsCount), icon: Bell, color: "#2563eb", bg: "#eff6ff" },
  ];

  const donutSegments = [
    { label: "Active", value: fleet.active, color: "#2563eb" },
    { label: "Maintenance", value: fleet.maintenance, color: "#f59e0b" },
    { label: "Retired", value: fleet.retired, color: "#94a3b8" },
    { label: "Sold", value: fleet.sold, color: "#ef4444" },
  ].filter((s) => s.value > 0);
  const pct = (v: number) => (fleet.total > 0 ? `${Math.round((v / fleet.total) * 100)}%` : "0%");

  const tripStatus = [
    { label: "Scheduled", count: stats?.scheduled || 0, color: "#94a3b8" },
    { label: "On Trip", count: stats?.en_route || 0, color: "#2563eb" },
    { label: "Completed", count: stats?.completed || 0, color: "#10b981" },
    { label: "Delayed", count: stats?.delayed || 0, color: "#f59e0b" },
    { label: "Cancelled", count: stats?.cancelled || 0, color: "#ef4444" },
  ];

  const alerts = [
    ...delays.map((d) => ({
      type: "danger" as const,
      message: "Delayed Trip",
      detail: `${d.routeName || "Trip"} · ${d.busPlate || "-"}${d.delayMinutes ? ` · +${d.delayMinutes} min` : ""}`,
      time: d.driverName || "—",
    })),
    ...renewals.map((r) => ({
      type: "warning" as const,
      message: "Document Expiring",
      detail: `${r.plateNumber} · ${r.documentType}`,
      time: r.expiryDate,
    })),
  ].slice(0, 6);

  const chartMax = Math.max(...revenueTrend.map((p) => Number(p.revenue)), 1);
  const chartPts = revenueTrend.length >= 2 ? revenueTrend : [];
  const linePath = chartPts.length
    ? chartPts.map((p, i) => `${(i / (chartPts.length - 1)) * 500} ${120 - (Number(p.revenue) / chartMax) * 100}`).join(" L ")
    : "";
  const areaPath = linePath ? `M ${linePath} L 500 120 L 0 120 Z` : "";

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Company Admin Dashboard</h1>
          <p className={styles.pageDesc}>{companyName} · Makkah, Saudi Arabia</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading company overview...</div>
      ) : (
        <>
          <div className={styles.kpiGrid4}>
            {kpiRow1.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                      <Icon size={20} />
                    </div>
                    <Sparkline data={card.sparkData} width={68} height={26} color={card.color} fillColor={card.color} />
                  </div>
                  <span className={styles.kpiLabel}>{card.label}</span>
                  <span className={styles.kpiValue}>{card.value}</span>
                  <span className={`${styles.kpiChange} ${card.trend === "up" ? styles.kpiUp : card.trend === "warning" ? styles.kpiWarn : ""}`}>
                    {card.change}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.kpiGrid4}>
            {kpiRow2.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={styles.kpiCardSmall}>
                  <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                    <Icon size={18} />
                  </div>
                  <div className={styles.kpiSmallInfo}>
                    <span className={styles.kpiLabel}>{card.label}</span>
                    <span className={styles.kpiValueSmall}>{card.value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.leftContent}>
              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Fleet Status Overview</h2>
                  </div>
                  <div className={styles.donutCenter}>
                    {donutSegments.length > 0 ? (
                      <DonutChart
                        segments={donutSegments}
                        size={160}
                        thickness={20}
                        centerValue={String(fleet.total)}
                        centerLabel="Total Fleet"
                      />
                    ) : (
                      <div className={styles.driverTrips}>No vehicles yet</div>
                    )}
                  </div>
                  <div className={styles.donutLegend}>
                    {donutSegments.map((s) => (
                      <div key={s.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendLabel}>{s.label}</span>
                        <span className={styles.legendValue}>{s.value} ({pct(s.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Live Fleet Map</h2>
                    <span className={styles.cardAction}>Expand <ChevronRight size={14} /></span>
                  </div>
                  <MapPlaceholder label={`${fleet.active} buses online in Makkah region`} />
                </div>
              </div>

              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>Revenue Overview</h2>
                      <p className={styles.cardSubtext}>Last {chartPts.length || 0} days</p>
                    </div>
                    <span className={styles.revenueValue}>SAR {revenue.thisWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className={styles.lineChartArea}>
                    {chartPts.length >= 2 ? (
                      <svg viewBox="0 0 500 120" className={`${styles.lineChart} lineChartAnimated`}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#revGrad)" className="chartFill" />
                        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chartLine" />
                      </svg>
                    ) : (
                      <div className={styles.driverTrips}>No revenue data yet</div>
                    )}
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
                      <DollarSign size={18} style={{ color: "#10b981" }} />
                      <span className={styles.fuelLabel}>Total Cost</span>
                      <span className={styles.fuelValue}>SAR {fuel.totalCost.toLocaleString()}</span>
                    </div>
                    <div className={styles.fuelItemFull}>
                      <Gauge size={18} style={{ color: "#f59e0b" }} />
                      <span className={styles.fuelLabel}>Avg Efficiency</span>
                      <span className={styles.fuelValue}>{fuel.avgKmPerLiter ? `${fuel.avgKmPerLiter} km/L` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recent Alerts & Notifications</h2>
                  <Link href="/dashboard/delays" className={styles.cardAction}>View All <ChevronRight size={14} /></Link>
                </div>
                <div className={styles.alertList}>
                  {alerts.map((a, i) => (
                    <div key={i} className={styles.alertItem}>
                      <span className={`${styles.alertDot} ${a.type === "warning" ? styles.alertWarning : a.type === "danger" ? styles.alertDanger : styles.alertInfo}`} />
                      <div className={styles.alertContent}>
                        <p className={styles.alertTitle}>{a.message}</p>
                        <p className={styles.alertDetail}>{a.detail}</p>
                      </div>
                      <span className={styles.alertTime}>{a.time}</span>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className={styles.driverTrips} style={{ padding: 16 }}>No alerts — all clear</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Trip Status</h2>
                </div>
                <div className={styles.tripStatusList}>
                  {tripStatus.map((t, i) => (
                    <div key={i} className={styles.tripStatusRow}>
                      <span className={styles.tripStatusLabel}>{t.label}</span>
                      <span className={styles.tripStatusCount} style={{ color: t.color }}>{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Top Performing Drivers</h2>
                </div>
                <div className={styles.driverList}>
                  {topDrivers.map((d, i) => (
                    <div key={i} className={styles.driverRow}>
                      <div className={styles.driverAvatar}>
                        <span>{(d.driverName || "?").split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div className={styles.driverInfo}>
                        <span className={styles.driverName}>{d.driverName || "—"}</span>
                        <span className={styles.driverTrips}>{d.employeeCode || "Driver"}</span>
                      </div>
                      <div className={styles.driverRating}>
                        <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                        <span>{d.overallScore != null ? d.overallScore.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                  {topDrivers.length === 0 && (
                    <div className={styles.driverTrips} style={{ padding: 16 }}>No driver scores yet</div>
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