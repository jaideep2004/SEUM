"use client";

import {
  Building2,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Bus,
  Server,
  Database,
  HardDrive,
  Wifi,
  Globe,
  BarChart3,
} from "lucide-react";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
import styles from "./page.module.css";

const kpiCards = [
  {
    label: "Total Companies",
    value: "128",
    change: "+8 this week",
    trend: "up" as const,
    icon: Building2,
    color: "#2563eb",
    bg: "#eff6ff",
    sparkData: [80, 85, 82, 90, 95, 100, 108, 115, 120, 128],
  },
  {
    label: "Monthly Revenue",
    value: "SAR 2.48M",
    change: "+18.6% vs last month",
    trend: "up" as const,
    icon: DollarSign,
    color: "#10b981",
    bg: "#ecfdf5",
    sparkData: [1.8, 1.9, 2.0, 1.95, 2.1, 2.2, 2.3, 2.35, 2.4, 2.48],
  },
  {
    label: "Active Subscriptions",
    value: "114",
    change: "89% of total",
    trend: "up" as const,
    icon: Activity,
    color: "#6366f1",
    bg: "#eef2ff",
    sparkData: [90, 95, 98, 100, 102, 105, 108, 110, 112, 114],
  },
  {
    label: "System Usage",
    value: "72%",
    change: "+6% vs last week",
    trend: "up" as const,
    icon: BarChart3,
    color: "#f59e0b",
    bg: "#fffbeb",
    sparkData: [58, 60, 62, 65, 64, 68, 70, 69, 71, 72],
  },
];

const recentCompanies = [
  { name: "Al-Rashid Transport", plan: "Enterprise", status: "Active", users: 28, revenue: "SAR 48,000" },
  { name: "Saudi Bus Lines", plan: "Enterprise", status: "Active", users: 45, revenue: "SAR 72,000" },
  { name: "Makkah Express", plan: "Professional", status: "Active", users: 12, revenue: "SAR 18,000" },
  { name: "Green Umrah Services", plan: "Starter", status: "Trial", users: 8, revenue: "SAR 0" },
  { name: "Gulf Transport Co", plan: "Enterprise", status: "Active", users: 52, revenue: "SAR 96,000" },
];

const systemHealth = [
  { name: "API Services", status: "Healthy", color: "#10b981" },
  { name: "Database", status: "Healthy", color: "#10b981" },
  { name: "Web Servers", status: "Healthy", color: "#10b981" },
  { name: "Storage", status: "Healthy", color: "#10b981" },
  { name: "Backup Services", status: "Healthy", color: "#10b981" },
];

const topModules = [
  { name: "Operations Management", usage: 128, max: 128 },
  { name: "Fleet Management", usage: 116, max: 128 },
  { name: "Accounting & Finance", usage: 104, max: 128 },
  { name: "HR & Payroll", usage: 98, max: 128 },
  { name: "Maintenance", usage: 86, max: 128 },
];

const platformActivity = [42, 55, 48, 72, 65, 80, 90, 78, 85, 92, 88, 100];

export default function SuperAdminDashboard() {
  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Super Admin Dashboard</h1>
          <p className={styles.pageDesc}>Overview of SEUM Platform</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className={styles.kpiGrid4}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                  <Icon size={20} />
                </div>
                <Sparkline data={card.sparkData} width={72} height={28} color={card.color} fillColor={card.color} />
              </div>
              <span className={styles.kpiLabel}>{card.label}</span>
              <span className={styles.kpiValue}>{card.value}</span>
              <span className={`${styles.kpiChange} ${styles.kpiUp}`}>{card.change}</span>
            </div>
          );
        })}
      </div>

      {/* Row 2: Revenue + Subscriptions */}
      <div className={styles.grid2Col}>
        {/* Revenue Overview */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Revenue Overview</h2>
              <p className={styles.cardSubtext}>This Month</p>
            </div>
            <span className={styles.revenueValue}>SAR 2,483,650</span>
          </div>
          <div className={styles.lineChartArea}>
            <svg viewBox="0 0 600 150" className={`${styles.lineChart} lineChartAnimated`}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <path
                d={`M 0 ${150 - platformActivity[0] * 1.4} ${platformActivity.map((v, i) => `L ${(i / (platformActivity.length - 1)) * 600} ${150 - v * 1.4}`).join(" ")} L 600 150 L 0 150 Z`}
                fill="url(#revGrad)"
                className="chartFill"
              />
              {/* Line */}
              <path
                d={`M ${platformActivity.map((v, i) => `${(i / (platformActivity.length - 1)) * 600} ${150 - v * 1.4}`).join(" L ")}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chartLine"
              />
              {/* Dots */}
              {platformActivity.map((v, i) => (
                <circle
                  key={i}
                  cx={(i / (platformActivity.length - 1)) * 600}
                  cy={150 - v * 1.4}
                  r="3"
                  fill="white"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Subscriptions Overview */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Subscriptions Overview</h2>
            <span className={styles.cardAction}>View All <ChevronRight size={14} /></span>
          </div>
          <div className={styles.donutCenter}>
            <DonutChart
              segments={[
                { label: "Active", value: 114, color: "#2563eb" },
                { label: "Trial", value: 8, color: "#f59e0b" },
                { label: "Expired", value: 6, color: "#ef4444" },
              ]}
              size={140}
              thickness={18}
              centerValue="114"
              centerLabel="Total"
            />
          </div>
          <div className={styles.donutLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#2563eb" }} />
              <span className={styles.legendLabel}>Active</span>
              <span className={styles.legendValue}>114</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
              <span className={styles.legendLabel}>Trial</span>
              <span className={styles.legendValue}>8</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#ef4444" }} />
              <span className={styles.legendLabel}>Expired</span>
              <span className={styles.legendValue}>6</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Companies + System Usage */}
      <div className={styles.grid2Col}>
        {/* Recent Companies */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent Companies</h2>
            <span className={styles.cardAction}>View All <ChevronRight size={14} /></span>
          </div>
          <div className={styles.companyList}>
            {recentCompanies.map((c, i) => (
              <div key={i} className={styles.companyRow}>
                <div className={styles.companyAvatar}>
                  <Building2 size={16} />
                </div>
                <div className={styles.companyInfo}>
                  <span className={styles.companyName}>{c.name}</span>
                  <span className={styles.companyMeta}>{c.plan} · {c.users} users</span>
                </div>
                <span className={`${styles.badge} ${c.status === "Active" ? styles.badgeSuccess : styles.badgeWarning}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Usage */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>System Usage</h2>
          </div>
          <div className={styles.donutCenter}>
            <DonutChart
              segments={[
                { label: "Compute", value: 72, color: "#2563eb" },
                { label: "Database", value: 68, color: "#10b981" },
                { label: "Storage", value: 74, color: "#f59e0b" },
                { label: "Bandwidth", value: 66, color: "#6366f1" },
              ]}
              size={140}
              thickness={18}
              centerValue="72%"
              centerLabel="Usage"
            />
          </div>
          <div className={styles.donutLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#2563eb" }} />
              <span className={styles.legendLabel}>Compute</span>
              <span className={styles.legendValue}>72%</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#10b981" }} />
              <span className={styles.legendLabel}>Database</span>
              <span className={styles.legendValue}>68%</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
              <span className={styles.legendLabel}>Storage</span>
              <span className={styles.legendValue}>74%</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#6366f1" }} />
              <span className={styles.legendLabel}>Bandwidth</span>
              <span className={styles.legendValue}>66%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Storage + Connected Buses + System Health */}
      <div className={styles.grid3Col}>
        {/* Storage Usage */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Storage Usage</h2>
          </div>
          <div className={styles.storageInfo}>
            <div className={styles.storageAmounts}>
              <span className={styles.storageUsed}>2.4 TB Used</span>
              <span className={styles.storageTotal}>of 5 TB Total</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: "48%" }} />
            </div>
            <span className={styles.storageAvail}>Available 2.6 TB</span>
          </div>
        </div>

        {/* Connected Buses */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Connected Buses</h2>
          </div>
          <div className={styles.busStats}>
            <div className={styles.busTotal}>
              <Bus size={24} style={{ color: "#2563eb" }} />
              <span className={styles.busTotalNum}>3,862</span>
              <span className={styles.busTotalLabel}>Total</span>
            </div>
            <div className={styles.busBreakdown}>
              <div className={styles.busRow}>
                <span className={styles.busDot} style={{ background: "#10b981" }} />
                <span>Online</span>
                <span className={styles.busCount}>3,256</span>
              </div>
              <div className={styles.busRow}>
                <span className={styles.busDot} style={{ background: "#ef4444" }} />
                <span>Offline</span>
                <span className={styles.busCount}>542</span>
              </div>
              <div className={styles.busRow}>
                <span className={styles.busDot} style={{ background: "#f59e0b" }} />
                <span>Maintenance</span>
                <span className={styles.busCount}>64</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>System Health</h2>
          </div>
          <div className={styles.healthList}>
            {systemHealth.map((s, i) => (
              <div key={i} className={styles.healthRow}>
                <CheckCircle2 size={16} style={{ color: s.color }} />
                <span className={styles.healthName}>{s.name}</span>
                <span className={styles.healthStatus} style={{ color: s.color }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Platform Activity + Online Companies + Top Modules */}
      <div className={styles.grid3Col}>
        {/* Platform Activity */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Platform Activity</h2>
            <span className={styles.cardAction}>Details <ChevronRight size={14} /></span>
          </div>
          <div className={styles.lineChartArea}>
            <svg viewBox="0 0 500 120" className={`${styles.lineChart} lineChartAnimated`}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 ${120 - platformActivity[0] * 1.1} ${platformActivity.map((v, i) => `L ${(i / (platformActivity.length - 1)) * 500} ${120 - v * 1.1}`).join(" ")} L 500 120 L 0 120 Z`}
                fill="url(#actGrad)"
                className="chartFill"
              />
              <path
                d={`M ${platformActivity.map((v, i) => `${(i / (platformActivity.length - 1)) * 500} ${120 - v * 1.1}`).join(" L ")}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chartLine"
              />
            </svg>
          </div>
        </div>

        {/* Online Companies (Map) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Online Companies</h2>
          </div>
          <div className={styles.worldMap}>
            <svg viewBox="0 0 400 200" className={styles.mapSvg}>
              {/* Simplified world outline */}
              <ellipse cx="200" cy="100" rx="180" ry="80" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.4} />
              <ellipse cx="200" cy="100" rx="130" ry="60" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.3} />
              <ellipse cx="200" cy="100" rx="80" ry="35" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.2} />
              {/* Dots representing active companies */}
              {[
                { x: 230, y: 85, size: 5 },
                { x: 245, y: 90, size: 4 },
                { x: 220, y: 95, size: 6 },
                { x: 260, y: 88, size: 3 },
                { x: 210, y: 78, size: 4 },
                { x: 255, y: 95, size: 3 },
                { x: 235, y: 100, size: 5 },
                { x: 270, y: 82, size: 3 },
                { x: 195, y: 88, size: 4 },
                { x: 248, y: 78, size: 3 },
              ].map((dot, i) => (
                <g key={i}>
                  <circle cx={dot.x} cy={dot.y} r={dot.size + 4} fill="#2563eb" opacity={0.1} />
                  <circle cx={dot.x} cy={dot.y} r={dot.size} fill="#2563eb" opacity={0.6} />
                  <circle cx={dot.x} cy={dot.y} r={2} fill="#2563eb" />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Top Active Modules */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top Active Modules</h2>
          </div>
          <div className={styles.moduleList}>
            {topModules.map((m, i) => (
              <div key={i} className={styles.moduleRow}>
                <span className={styles.moduleName}>{m.name}</span>
                <div className={styles.moduleBarWrap}>
                  <div className={styles.moduleBar} style={{ width: `${(m.usage / m.max) * 100}%` }} />
                </div>
                <span className={styles.moduleValue}>{m.usage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© 2025 SEUM Technology · v2.1.0</span>
        <div className={styles.footerLinks}>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
