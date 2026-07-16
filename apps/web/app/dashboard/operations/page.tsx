"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Bus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Users,
  MapPin,
  Plus,
  UserCheck,
  Navigation,
  ClipboardList,
  Route,
  FileText,
  Fuel,
  Gauge,
  TrendingUp,
  Radio,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import MapPlaceholder from "@/components/dashboard/MapPlaceholder";
import styles from "./page.module.css";

const kpiCards = [
  { label: "Today's Trips", value: "42", change: "+12% vs yesterday", trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff" },
  { label: "Active Buses", value: "128", change: "+8% utilization", trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
  { label: "Delayed Trips", value: "6", change: "2 vs yesterday", trend: "warning" as const, icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
  { label: "Today's Revenue", value: "SAR 245,680", change: "+18% vs yesterday", trend: "up" as const, icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
  { label: "Employees", value: "358", icon: Users, color: "#6366f1", bg: "#eef2ff" },
  { label: "Maintenance Due", value: "14", icon: CalendarCheck, color: "#f59e0b", bg: "#fffbeb" },
];

const quickActions = [
  { label: "Create Trip", icon: Plus, color: "#2563eb", href: "/dashboard/trips/new" },
  { label: "Trip Monitoring", icon: Radio, color: "#ef4444", href: "/dashboard/monitoring" },
  { label: "Assign Driver", icon: UserCheck, color: "#6366f1", href: "/dashboard/trips" },
  { label: "Delay Dashboard", icon: AlertTriangle, color: "#f59e0b", href: "/dashboard/delays" },
  { label: "Routes", icon: Route, color: "#10b981", href: "/dashboard/routes" },
  { label: "Work Order", icon: FileText, color: "#8b5cf6", href: "/dashboard/maintenance" },
];

const recentBookings = [
  { id: "BK-4521", customer: "Ahmed Al-Rashid", passengers: 4, service: "VIP Umrah", date: "Jul 14, 2025", status: "Confirmed" },
  { id: "BK-4520", customer: "Sara Mohammed", passengers: 12, service: "Group Transfer", date: "Jul 14, 2025", status: "Confirmed" },
  { id: "BK-4519", customer: "Omar Hassan", passengers: 2, service: "Airport Pickup", date: "Jul 14, 2025", status: "Pending" },
  { id: "BK-4518", customer: "Fatima Ali", passengers: 8, service: "Ziyarat Tour", date: "Jul 14, 2025", status: "Confirmed" },
  { id: "BK-4517", customer: "Khalid Nasser", passengers: 45, service: "Group Pilgrimage", date: "Jul 13, 2025", status: "Completed" },
];

const upcomingTrips = [
  { id: "TR-7845", route: "Makkah → Madinah", time: "02:00 PM", bus: "BUS-003", driver: "Fahad Omar" },
  { id: "TR-7846", route: "Jeddah → Makkah", time: "03:30 PM", bus: "BUS-012", driver: "Mohammed Ali" },
  { id: "TR-7847", route: "Makkah → Jeddah", time: "04:00 PM", bus: "BUS-007", driver: "Nasser Ali" },
  { id: "TR-7848", route: "Madinah → Jeddah", time: "05:00 PM", bus: "BUS-019", driver: "Hassan Youssef" },
];

const alerts = [
  { type: "warning", message: "Speed Violation - BUS-012 on Route 7", href: "/dashboard/monitoring" },
  { type: "info", message: "Fatigue Detected - Driver Ali Hassan", href: "/dashboard/monitoring" },
  { type: "warning", message: "Route Deviation - BUS-019 near Jeddah", href: "/dashboard/monitoring" },
  { type: "danger", message: "Maintenance Due - BUS-005 oil change", href: "/dashboard/fleet/maintenance" },
];

const tripDistribution = [
  { label: "On Trip", value: 32, color: "#2563eb" },
  { label: "Scheduled", value: 6, color: "#94a3b8" },
  { label: "Delayed", value: 4, color: "#f59e0b" },
  { label: "Completed", value: 24, color: "#10b981" },
];

function bookingStatus(status: string) {
  const map: Record<string, { cls: string }> = {
    Confirmed: { cls: styles.badgeSuccess },
    Pending: { cls: styles.badgeWarning },
    Completed: { cls: styles.badgeNeutral },
  };
  return <span className={`${styles.badge} ${map[status]?.cls || styles.badgeNeutral}`}>{status}</span>;
}

export default function OperationsDashboard() {
  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Operations Dashboard</h1>
          <p className={styles.pageDesc}>Live monitoring of all fleet operations</p>
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Main Content + Right Sidebar */}
      <div className={styles.mainGrid}>
        <div className={styles.leftContent}>
          {/* Map + Quick Actions */}
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

          {/* Recent Bookings */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Bookings</h2>
              <span className={styles.cardAction}>View All <ChevronRight size={14} /></span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer</th>
                    <th>Passengers</th>
                    <th>Service Type</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td><span className={styles.bookingId}>{b.id}</span></td>
                      <td>{b.customer}</td>
                      <td>{b.passengers}</td>
                      <td className={styles.textMuted}>{b.service}</td>
                      <td className={styles.textMuted}>{b.date}</td>
                      <td>{bookingStatus(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Readiness + Fuel */}
          <div className={styles.grid2Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Fleet Readiness</h2>
              </div>
              <div className={styles.readinessInfo}>
                <div className={styles.readinessBar}>
                  <div className={styles.readinessFill} style={{ width: "92%" }} />
                </div>
                <div className={styles.readinessStats}>
                  <span className={styles.readinessPercent}>92%</span>
                  <span className={styles.readinessDetail}>118 Ready · 8 Under Maintenance · 2 Out of Service</span>
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
                  <span className={styles.fuelValue}>5,680 L</span>
                </div>
                <div className={styles.fuelItem}>
                  <Gauge size={18} style={{ color: "#10b981" }} />
                  <span className={styles.fuelLabel}>Total Cost</span>
                  <span className={styles.fuelValue}>SAR 15,680</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          {/* Trip Status Distribution */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Trip Status Distribution</h2>
            </div>
            <div className={styles.donutCenter}>
              <DonutChart
                segments={tripDistribution}
                size={150}
                thickness={18}
                centerValue="42"
                centerLabel="Total Trips"
              />
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

          {/* Upcoming Trips */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Upcoming Trips</h2>
              <span className={styles.cardAction}>View All <ChevronRight size={14} /></span>
            </div>
            <div className={styles.upcomingList}>
              {upcomingTrips.map((t, i) => (
                <div key={i} className={styles.upcomingItem}>
                  <div className={styles.upcomingHeader}>
                    <span className={styles.upcomingId}>{t.id}</span>
                    <span className={styles.upcomingTime}>{t.time}</span>
                  </div>
                  <span className={styles.upcomingRoute}>{t.route}</span>
                  <div className={styles.upcomingMeta}>
                    <span>{t.bus}</span>
                    <span>·</span>
                    <span>{t.driver}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Alerts</h2>
            </div>
            <div className={styles.alertList}>
              {alerts.map((a, i) => (
                <Link key={i} href={a.href} className={styles.alertItem}>
                  <span className={`${styles.alertDot} ${a.type === "warning" ? styles.alertWarning : a.type === "danger" ? styles.alertDanger : styles.alertInfo}`} />
                  <span className={styles.alertText}>{a.message}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
