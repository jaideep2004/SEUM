"use client";

import {
  Bus,
  Users,
  DollarSign,
  Gauge,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Fuel,
  Wrench,
  Bell,
  Star,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
import MapPlaceholder from "@/components/dashboard/MapPlaceholder";
import styles from "./page.module.css";

const kpiRow1 = [
  { label: "Today's Trips", value: "42", change: "+12% vs yesterday", trend: "up" as const, icon: Bus, color: "#2563eb", bg: "#eff6ff", sparkData: [30, 32, 28, 35, 38, 40, 42] },
  { label: "Active Buses", value: "128", change: "92% of total fleet", trend: "neutral" as const, icon: Gauge, color: "#10b981", bg: "#ecfdf5", sparkData: [120, 122, 125, 124, 126, 127, 128] },
  { label: "Delayed Trips", value: "6", change: "2 vs yesterday", trend: "warning" as const, icon: Clock, color: "#f59e0b", bg: "#fffbeb", sparkData: [4, 5, 3, 6, 8, 5, 6] },
  { label: "Today's Revenue", value: "SAR 245,680", change: "+18% vs yesterday", trend: "up" as const, icon: DollarSign, color: "#10b981", bg: "#ecfdf5", sparkData: [180, 195, 200, 210, 220, 235, 245] },
];

const kpiRow2 = [
  { label: "Employees", value: "358", icon: Users, color: "#6366f1", bg: "#eef2ff" },
  { label: "Maintenance Due", value: "14", icon: Wrench, color: "#f59e0b", bg: "#fffbeb" },
  { label: "Incidents", value: "3", icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
  { label: "Alerts", value: "8", icon: Bell, color: "#2563eb", bg: "#eff6ff" },
];

const tripStatus = [
  { label: "Scheduled", count: 18, color: "#94a3b8" },
  { label: "On Trip", count: 42, color: "#2563eb" },
  { label: "Completed", count: 28, color: "#10b981" },
  { label: "Delayed", count: 6, color: "#f59e0b" },
  { label: "Cancelled", count: 2, color: "#ef4444" },
];

const topDrivers = [
  { name: "Fahad Al Qahtani", rating: 4.9, trips: 156 },
  { name: "Mohammed Khan", rating: 4.8, trips: 142 },
  { name: "Ali Hassan", rating: 4.7, trips: 128 },
  { name: "Ahmed Saud", rating: 4.6, trips: 115 },
  { name: "Yusuf Ahmed", rating: 4.5, trips: 108 },
];

const alerts = [
  { type: "warning", message: "Speed Violation", detail: "Bus BUS-012 exceeded speed limit on Route 7", time: "10 min ago" },
  { type: "danger", message: "Delayed Trip", detail: "Route Makkah-Madinah delayed by 45 min", time: "25 min ago" },
  { type: "info", message: "Maintenance Due", detail: "BUS-005 oil change scheduled for tomorrow", time: "1 hr ago" },
  { type: "success", message: "New Booking", detail: "15 passengers booked for Route 42", time: "2 hr ago" },
];

const revenueData = [160, 175, 180, 195, 200, 210, 225, 235, 245];

export default function CompanyAdminDashboard() {
  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Company Admin Dashboard</h1>
          <p className={styles.pageDesc}>Demo Transport Co · Makkah, Saudi Arabia</p>
        </div>
      </div>

      {/* KPI Row 1 */}
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

      {/* KPI Row 2 */}
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

      {/* Main Grid: Content + Right Sidebar */}
      <div className={styles.mainGrid}>
        {/* Left Content */}
        <div className={styles.leftContent}>
          {/* Fleet Status + Live Map */}
          <div className={styles.grid2Col}>
            {/* Fleet Status Overview */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Fleet Status Overview</h2>
              </div>
              <div className={styles.donutCenter}>
                <DonutChart
                  segments={[
                    { label: "On Trip", value: 128, color: "#2563eb" },
                    { label: "Available", value: 34, color: "#10b981" },
                    { label: "Maintenance", value: 18, color: "#f59e0b" },
                    { label: "Inactive", value: 12, color: "#ef4444" },
                  ]}
                  size={160}
                  thickness={20}
                  centerValue="192"
                  centerLabel="Total Fleet"
                />
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                  <span className={styles.legendLabel}>On Trip</span>
                  <span className={styles.legendValue}>128 (67%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#10b981" }} />
                  <span className={styles.legendLabel}>Available</span>
                  <span className={styles.legendValue}>34 (18%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                  <span className={styles.legendLabel}>Maintenance</span>
                  <span className={styles.legendValue}>18 (9%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                  <span className={styles.legendLabel}>Inactive</span>
                  <span className={styles.legendValue}>12 (6%)</span>
                </div>
              </div>
            </div>

            {/* Live Fleet Map */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Live Fleet Map</h2>
                <span className={styles.cardAction}>Expand <ChevronRight size={14} /></span>
              </div>
              <MapPlaceholder label="128 buses online in Makkah region" />
            </div>
          </div>

          {/* Revenue + Alerts */}
          <div className={styles.grid2Col}>
            {/* Revenue Overview */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Revenue Overview</h2>
                  <p className={styles.cardSubtext}>This Week</p>
                </div>
                <span className={styles.revenueValue}>SAR 1,725,380</span>
              </div>
              <div className={styles.lineChartArea}>
                <svg viewBox="0 0 500 120" className={`${styles.lineChart} lineChartAnimated`}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${120 - revenueData[0] * 0.5} ${revenueData.map((v, i) => `L ${(i / (revenueData.length - 1)) * 500} ${120 - v * 0.5}`).join(" ")} L 500 120 L 0 120 Z`}
                    fill="url(#revGrad)"
                    className="chartFill"
                  />
                  <path
                    d={`M ${revenueData.map((v, i) => `${(i / (revenueData.length - 1)) * 500} ${120 - v * 0.5}`).join(" L ")}`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="chartLine"
                  />
                </svg>
              </div>
            </div>

            {/* Fuel Summary */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Fuel Summary</h2>
              </div>
              <div className={styles.fuelGrid}>
                <div className={styles.fuelItem}>
                  <Fuel size={18} style={{ color: "#2563eb" }} />
                  <span className={styles.fuelLabel}>Total Fuel</span>
                  <span className={styles.fuelValue}>24,580 L</span>
                </div>
                <div className={styles.fuelItem}>
                  <DollarSign size={18} style={{ color: "#10b981" }} />
                  <span className={styles.fuelLabel}>Total Cost</span>
                  <span className={styles.fuelValue}>SAR 73,450</span>
                </div>
                <div className={styles.fuelItemFull}>
                  <Gauge size={18} style={{ color: "#f59e0b" }} />
                  <span className={styles.fuelLabel}>Avg Efficiency</span>
                  <span className={styles.fuelValue}>3.6 km/L</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Alerts & Notifications</h2>
              <span className={styles.cardAction}>View All <ChevronRight size={14} /></span>
            </div>
            <div className={styles.alertList}>
              {alerts.map((a, i) => (
                <div key={i} className={styles.alertItem}>
                  <span className={`${styles.alertDot} ${a.type === "warning" ? styles.alertWarning : a.type === "danger" ? styles.alertDanger : a.type === "info" ? styles.alertInfo : styles.alertSuccess}`} />
                  <div className={styles.alertContent}>
                    <p className={styles.alertTitle}>{a.message}</p>
                    <p className={styles.alertDetail}>{a.detail}</p>
                  </div>
                  <span className={styles.alertTime}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          {/* Trip Status */}
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

          {/* Top Performing Drivers */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Top Performing Drivers</h2>
            </div>
            <div className={styles.driverList}>
              {topDrivers.map((d, i) => (
                <div key={i} className={styles.driverRow}>
                  <div className={styles.driverAvatar}>
                    <span>{d.name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <div className={styles.driverInfo}>
                    <span className={styles.driverName}>{d.name}</span>
                    <span className={styles.driverTrips}>{d.trips} trips</span>
                  </div>
                  <div className={styles.driverRating}>
                    <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                    <span>{d.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
