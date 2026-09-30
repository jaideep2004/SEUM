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
  scheduledStartTime?: string;
  delayMinutes?: number;
}

const spark = [12, 16, 14, 20, 18, 24, 22];

export default function CompanyAdminDashboard() {
  const { lang, t } = useLanguage();
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
    { label: t("home.company.todayTrips"), value: formatNumber(stats?.total_trips || 0, lang), change: `${formatNumber(stats?.en_route || 0, lang)} ${t("home.company.enRouteNow")}`, trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff", sparkData: spark },
    { label: t("home.company.activeBuses"), value: formatNumber(fleet.active, lang), change: `${formatNumber(fleet.total, lang)} ${t("home.company.totalFleet")}`, trend: "up" as const, icon: Gauge, color: "#10b981", bg: "#ecfdf5", sparkData: spark },
    { label: t("home.company.delayedTrips"), value: formatNumber(stats?.delayed || 0, lang), change: (stats?.delayed || 0) > 0 ? t("home.company.needsAttention") : t("home.company.allOnTime"), trend: (stats?.delayed || 0) > 0 ? ("warning" as const) : ("up" as const), icon: Clock, color: "#f59e0b", bg: "#fffbeb", sparkData: spark },
    { label: t("home.company.todayRevenue"), value: formatCurrency(revenue.today || 0, lang, 0), change: `${formatCurrency(revenue.thisMonth || 0, lang, 0)} ${t("home.company.thisMonthSuffix")}`, trend: "up" as const, icon: DollarSign, color: "#10b981", bg: "#ecfdf5", sparkData: spark },
  ];

  const kpiRow2 = [
    { label: t("home.company.employees"), value: formatNumber(employees, lang), icon: Users, color: "#6366f1", bg: "#eef2ff" },
    { label: t("home.company.maintDue"), value: formatNumber(maintenanceDue, lang), icon: Wrench, color: "#f59e0b", bg: "#fffbeb" },
    { label: t("home.company.incidents"), value: formatNumber(incidents, lang), icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
    { label: t("home.company.alerts"), value: formatNumber(alertsCount, lang), icon: Bell, color: "#2563eb", bg: "#eff6ff" },
  ];

  const donutSegments = [
    { label: t("home.company.segActive"), value: fleet.active, color: "#2563eb" },
    { label: t("home.company.segMaintenance"), value: fleet.maintenance, color: "#f59e0b" },
    { label: t("home.company.segRetired"), value: fleet.retired, color: "#94a3b8" },
    { label: t("home.company.segSold"), value: fleet.sold, color: "#ef4444" },
  ].filter((s) => s.value > 0);
  const pct = (v: number) => (fleet.total > 0 ? `${Math.round((v / fleet.total) * 100)}%` : "0%");

  const tripStatus = [
    { label: t("home.company.tsScheduled"), count: stats?.scheduled || 0, color: "#94a3b8" },
    { label: t("home.company.tsOnTrip"), count: stats?.en_route || 0, color: "#2563eb" },
    { label: t("home.company.tsCompleted"), count: stats?.completed || 0, color: "#10b981" },
    { label: t("home.company.tsDelayed"), count: stats?.delayed || 0, color: "#f59e0b" },
    { label: t("home.company.tsCancelled"), count: stats?.cancelled || 0, color: "#ef4444" },
  ];

  const alerts = [
    ...delays.map((d) => ({
      type: "danger" as const,
      message: t("home.company.delayedTrip"),
      detail: `${d.routeName || "Trip"} · ${d.busPlate || "-"}${d.delayMinutes ? ` · +${d.delayMinutes} min` : ""}`,
      time: d.driverName || "—",
    })),
    ...renewals.map((r) => ({
      type: "warning" as const,
      message: t("home.company.docExpiring"),
      detail: `${r.plateNumber} · ${r.documentType}`,
      time: formatDate(r.expiryDate, lang),
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
          <h1 className={styles.pageTitle}>{t("home.company.title")}</h1>
          <p className={styles.pageDesc}>{companyName} {t("home.company.region")}</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("home.company.loading")}</div>
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
                    <h2 className={styles.cardTitle}>{t("home.company.fleetOverview")}</h2>
                  </div>
                  <div className={styles.donutCenter}>
                    {donutSegments.length > 0 ? (
                      <DonutChart
                        segments={donutSegments}
                        size={160}
                        thickness={20}
                        centerValue={formatNumber(fleet.total, lang)}
                        centerLabel={t("home.company.totalFleetLabel")}
                      />
                    ) : (
                      <div className={styles.driverTrips}>{t("home.company.noVehicles")}</div>
                    )}
                  </div>
                  <div className={styles.donutLegend}>
                    {donutSegments.map((s) => (
                      <div key={s.label} className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendLabel}>{s.label}</span>
                        <span className={styles.legendValue}>{formatNumber(s.value, lang)} ({pct(s.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t("home.company.liveMap")}</h2>
                    <span className={styles.cardAction}>{t("home.company.expand")}<ChevronRight size={14} /></span>
                  </div>
                  <MapPlaceholder label={`${formatNumber(fleet.active, lang)} ${t("home.company.busesOnline")}`} />
                </div>
              </div>

              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>{t("home.company.revenueOverview")}</h2>
                      <p className={styles.cardSubtext}>{t("home.company.lastA")}{formatNumber(chartPts.length, lang)}{t("home.company.lastB")}</p>
                    </div>
                    <span className={styles.revenueValue}>{formatCurrency(revenue.thisWeek, lang, 0)}</span>
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
                      <div className={styles.driverTrips}>{t("home.company.noRevenue")}</div>
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t("home.company.fuelSummary")}</h2>
                  </div>
                  <div className={styles.fuelGrid}>
                    <div className={styles.fuelItem}>
                      <Fuel size={18} style={{ color: "#2563eb" }} />
                      <span className={styles.fuelLabel}>{t("home.company.totalFuel")}</span>
                      <span className={styles.fuelValue}>{formatNumber(fuel.totalLiters, lang)}{t("home.company.litersSuffix")}</span>
                    </div>
                    <div className={styles.fuelItem}>
                      <DollarSign size={18} style={{ color: "#10b981" }} />
                      <span className={styles.fuelLabel}>{t("home.company.totalCost")}</span>
                      <span className={styles.fuelValue}>{formatCurrency(fuel.totalCost, lang, 0)}</span>
                    </div>
                    <div className={styles.fuelItemFull}>
                      <Gauge size={18} style={{ color: "#f59e0b" }} />
                      <span className={styles.fuelLabel}>{t("home.company.avgEff")}</span>
                      <span className={styles.fuelValue}>{fuel.avgKmPerLiter ? `${fuel.avgKmPerLiter}${t("home.company.kmPerLiter")}` : "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("home.company.recentAlerts")}</h2>
                  <Link href="/dashboard/delays" className={styles.cardAction}>{t("home.company.viewAll")}<ChevronRight size={14} /></Link>
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
                    <div className={styles.driverTrips} style={{ padding: 16 }}>{t("home.company.noAlerts")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("home.company.tripStatus")}</h2>
                </div>
                <div className={styles.tripStatusList}>
                  {tripStatus.map((tr, i) => (
                    <div key={i} className={styles.tripStatusRow}>
                      <span className={styles.tripStatusLabel}>{tr.label}</span>
                      <span className={styles.tripStatusCount} style={{ color: tr.color }}>{formatNumber(tr.count, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{t("home.company.topDrivers")}</h2>
                </div>
                <div className={styles.driverList}>
                  {topDrivers.map((d, i) => (
                    <div key={i} className={styles.driverRow}>
                      <div className={styles.driverAvatar}>
                        <span>{(d.driverName || "?").split(" ").map(n => n[0]).join("")}</span>
                      </div>
                      <div className={styles.driverInfo}>
                        <span className={styles.driverName}>{d.driverName || "—"}</span>
                        <span className={styles.driverTrips}>{d.employeeCode || t("home.company.driverFallback")}</span>
                      </div>
                      <div className={styles.driverRating}>
                        <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                        <span>{d.overallScore != null ? d.overallScore.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                  {topDrivers.length === 0 && (
                    <div className={styles.driverTrips} style={{ padding: 16 }}>{t("home.company.noDriverScores")}</div>
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