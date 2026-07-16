"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Clock,
  Fuel,
  Calendar,
  FileText,
  ChevronRight,
  Search,
  ChevronLeft,
  MapPin,
  Shield,
  Gauge,
  Route,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
import { ExpiryBadge, getDaysUntilExpiry } from "@/components/fleet/ExpiryBadge";
import styles from "./page.module.css";

const kpiCards = [
  { label: "Total Vehicles", value: "156", change: "+5 this week", trend: "up" as const, icon: Truck, color: "#2563eb", bg: "#eff6ff", sparkData: [140, 142, 145, 148, 150, 152, 154, 156] },
  { label: "Active", value: "128", change: "82.1%", trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5", sparkData: [110, 112, 115, 118, 120, 122, 125, 128] },
  { label: "Under Maintenance", value: "12", change: "7.7%", trend: "neutral" as const, icon: Wrench, color: "#f59e0b", bg: "#fffbeb", sparkData: [10, 12, 11, 14, 13, 12, 11, 12] },
  { label: "Out of Service", value: "5", change: "3.2%", trend: "down" as const, icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", sparkData: [8, 7, 6, 5, 6, 5, 4, 5] },
  { label: "Documents Expiring", value: "—", change: "Loading...", trend: "down" as const, icon: FileText, color: "#8b5cf6", bg: "#f5f3ff", sparkData: [5, 6, 7, 8, 9, 8, 7, 8] },
];

const vehicles = [
  { id: "BUS-001", plate: "1234 KSA", model: "Yutong 55 Seater 2022", status: "Active", driver: "Ahmed Khan", location: "Makkah Ring Road", fuel: 72, fuelL: "145L", lastUpdate: "2 min ago" },
  { id: "BUS-002", plate: "1235 KSA", model: "MAN 2024", status: "Active", driver: "Khalid Hassan", location: "Jeddah Highway", fuel: 62, fuelL: "124L", lastUpdate: "5 min ago" },
  { id: "BUS-003", plate: "1236 KSA", model: "Scania 2023", status: "Active", driver: "Fahad Omar", location: "Madinah Road", fuel: 91, fuelL: "182L", lastUpdate: "1 min ago" },
  { id: "BUS-004", plate: "1237 KSA", model: "MAN 2024", status: "Maintenance", driver: "—", location: "Workshop", fuel: 30, fuelL: "60L", lastUpdate: "1 hr ago" },
  { id: "BUS-005", plate: "1238 KSA", model: "Volvo 2023", status: "Active", driver: "Saeed Al-Ghamdi", location: "Airport Road", fuel: 55, fuelL: "110L", lastUpdate: "3 min ago" },
];

const recentTrips = [
  { route: "Makkah → Madinah", date: "Jul 14, 2025", distance: "420 km", duration: "4h 15m", status: "Completed" },
  { route: "Jeddah → Makkah", date: "Jul 14, 2025", distance: "95 km", duration: "1h 30m", status: "Completed" },
  { route: "Makkah → Jeddah", date: "Jul 13, 2025", distance: "95 km", duration: "1h 45m", status: "Completed" },
  { route: "Madinah → Jeddah", date: "Jul 13, 2025", distance: "420 km", duration: "4h 30m", status: "Completed" },
];

const fuelData = [22000, 23500, 24000, 23800, 24200, 24500, 24580];

const tabs = ["Trips", "Documents", "History"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    "Active": styles.badgeSuccess,
    "Maintenance": styles.badgeWarning,
    "Out of Service": styles.badgeDanger,
  };
  return <span className={`${styles.badge} ${map[status] || styles.badgeNeutral}`}>{status}</span>;
}

export default function FleetDashboard() {
  const [activeTab, setActiveTab] = useState(0);

  // Document expiry data
  const [expiringDocs, setExpiringDocs] = useState<any[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [docKpiValue, setDocKpiValue] = useState("—");
  const [docKpiChange, setDocKpiChange] = useState("Loading...");

  // Fuel efficiency alert
  const [fuelAlert, setFuelAlert] = useState<{ dropped: boolean; message: string | null }>({ dropped: false, message: null });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const [docRes, fuelRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fleet/documents/expiring?days=365`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/fleet/fuel/efficiency-check`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);
        const docData = await docRes.json();
        const fuelData = await fuelRes.json();
        if (fuelData.success) setFuelAlert(fuelData.data);
        if (docData.success) {
          const docs = docData.data;
          const expired = docs.filter((d: any) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 0);
          const expiring = docs.filter((d: any) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) > 0 && getDaysUntilExpiry(d.expiryDate) <= 30);
          setExpiringDocs(docs);
          setExpiredCount(expired.length);
          setExpiringCount(expiring.length);
          setDocKpiValue(String(expired.length + expiring.length));
          setDocKpiChange(expired.length > 0 ? `${expired.length} expired` : `${expiring.length} expiring`);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fleet Management</h1>
          <p className={styles.pageDesc}>Overview of your vehicle fleet</p>
        </div>
      </div>

      {/* Fuel Efficiency Alert */}
      {fuelAlert.dropped && (
        <div className={styles.docBannerDanger} style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          {fuelAlert.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className={styles.kpiGrid5}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isDocCard = card.label === "Documents Expiring";
          return (
            <div key={card.label} className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                  <Icon size={20} />
                </div>
                <Sparkline data={card.sparkData} width={60} height={24} color={card.color} fillColor={card.color} />
              </div>
              <span className={styles.kpiLabel}>{card.label}</span>
              <span className={styles.kpiValue}>{isDocCard ? docKpiValue : card.value}</span>
              <span className={`${styles.kpiChange} ${isDocCard && expiredCount > 0 ? styles.kpiDown : card.trend === "up" ? styles.kpiUp : card.trend === "down" ? styles.kpiDown : ""}`}>
                {isDocCard ? docKpiChange : card.change}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Content + Vehicle Details */}
      <div className={styles.mainGrid}>
        <div className={styles.leftContent}>
          {/* Fleet Status Donut + Fuel Chart */}
          <div className={styles.grid2Col}>
            {/* Fleet Status Distribution */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Fleet Status Distribution</h2>
              </div>
              <div className={styles.donutCenter}>
                <DonutChart
                  segments={[
                    { label: "Active", value: 128, color: "#2563eb" },
                    { label: "Under Maintenance", value: 12, color: "#f59e0b" },
                    { label: "Out of Service", value: 5, color: "#ef4444" },
                    { label: "Inactive", value: 11, color: "#94a3b8" },
                  ]}
                  size={150}
                  thickness={18}
                  centerValue="156"
                  centerLabel="Total"
                />
              </div>
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                  <span className={styles.legendLabel}>Active</span>
                  <span className={styles.legendValue}>128 (82.1%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                  <span className={styles.legendLabel}>Under Maintenance</span>
                  <span className={styles.legendValue}>12 (7.7%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                  <span className={styles.legendLabel}>Out of Service</span>
                  <span className={styles.legendValue}>5 (3.2%)</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#94a3b8" }} />
                  <span className={styles.legendLabel}>Inactive</span>
                  <span className={styles.legendValue}>11 (7.0%)</span>
                </div>
              </div>
            </div>

            {/* Fuel Summary */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Fuel Summary (This Week)</h2>
              </div>
              <div className={styles.fuelStats}>
                <div className={styles.fuelStatItem}>
                  <span className={styles.fuelStatLabel}>Total Fuel</span>
                  <span className={styles.fuelStatValue}>24,580 L</span>
                </div>
                <div className={styles.fuelStatItem}>
                  <span className={styles.fuelStatLabel}>Total Cost</span>
                  <span className={styles.fuelStatValue}>SAR 68,450</span>
                </div>
              </div>
              <div className={styles.lineChartArea}>
                <svg viewBox="0 0 500 120" className={`${styles.lineChart} lineChartAnimated`}>
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${120 - fuelData[0] * 0.004} ${fuelData.map((v, i) => `L ${(i / (fuelData.length - 1)) * 500} ${120 - v * 0.004}`).join(" ")} L 500 120 L 0 120 Z`}
                    fill="url(#fuelGrad)"
                    className="chartFill"
                  />
                  <path
                    d={`M ${fuelData.map((v, i) => `${(i / (fuelData.length - 1)) * 500} ${120 - v * 0.004}`).join(" L ")}`}
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
          </div>

          {/* Vehicle Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Vehicles Overview</h2>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input type="text" className={styles.searchInput} placeholder="Search vehicles..." />
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Plate Number</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Fuel Level</th>
                    <th>Last Update</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td><span className={styles.plateNumber}>{v.plate}</span></td>
                      <td>
                        <div className={styles.vehicleCell}>
                          <span className={styles.vehicleModel}>{v.model}</span>
                          <span className={styles.vehicleId}>{v.id}</span>
                        </div>
                      </td>
                      <td>{v.driver}</td>
                      <td>{statusBadge(v.status)}</td>
                      <td className={styles.textMuted}>
                        <span className={styles.locationCell}>
                          <MapPin size={12} />
                          {v.location}
                        </span>
                      </td>
                      <td>
                        <div className={styles.fuelCell}>
                          <div className={styles.fuelBar}>
                            <div
                              className={styles.fuelFill}
                              style={{
                                width: `${v.fuel}%`,
                                background: v.fuel > 60 ? "var(--color-success)" : v.fuel > 30 ? "var(--color-warning)" : "var(--color-danger)",
                              }}
                            />
                          </div>
                          <span className={styles.fuelText}>{v.fuel}% ({v.fuelL})</span>
                        </div>
                      </td>
                      <td className={styles.textMuted}>{v.lastUpdate}</td>
                      <td>
                        <button className={styles.viewBtn}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>Showing 1 to 5 of 156 vehicles</span>
              <div className={styles.paginationBtns}>
                <button className={styles.paginationBtn} disabled><ChevronLeft size={16} /></button>
                <button className={`${styles.paginationBtn} ${styles.paginationActive}`}>1</button>
                <button className={styles.paginationBtn}>2</button>
                <button className={styles.paginationBtn}>3</button>
                <button className={styles.paginationBtn}>...</button>
                <button className={styles.paginationBtn}>32</button>
                <button className={styles.paginationBtn}><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.card}>
            <div className={styles.tabs}>
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === i ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className={styles.tabContent}>
              {activeTab === 0 && (
                <div className={styles.recentTripsList}>
                  {recentTrips.map((t, i) => (
                    <div key={i} className={styles.recentTripItem}>
                      <div className={styles.recentTripInfo}>
                        <Route size={14} style={{ color: "var(--color-primary)" }} />
                        <span className={styles.recentTripRoute}>{t.route}</span>
                      </div>
                      <span className={styles.recentTripDate}>{t.date}</span>
                      <span className={styles.recentTripMeta}>{t.distance} · {t.duration}</span>
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 1 && (
                <div className={styles.docTabContent}>
                  {expiredCount > 0 && (
                    <div className={styles.docBannerDanger}>
                      <AlertTriangle size={16} />
                      {expiredCount} document{expiredCount !== 1 ? "s" : ""} expired — requires immediate attention
                      <Link href="/dashboard/fleet/documents" className={styles.docBannerLink}>
                        View All <ChevronRight size={14} />
                      </Link>
                    </div>
                  )}
                  {expiredCount === 0 && expiringCount > 0 && (
                    <div className={styles.docBannerWarning}>
                      <Clock size={16} />
                      {expiringCount} document{expiringCount !== 1 ? "s" : ""} expiring within 30 days
                      <Link href="/dashboard/fleet/documents" className={styles.docBannerLink}>
                        View All <ChevronRight size={14} />
                      </Link>
                    </div>
                  )}
                  <div className={styles.docListCompact}>
                    {expiringDocs.length === 0 ? (
                      <p className={styles.tabPlaceholder}>No documents on file</p>
                    ) : (
                      expiringDocs.slice(0, 8).map((doc: any) => (
                        <div key={doc.id} className={styles.docCompactItem}>
                          <div className={styles.docCompactInfo}>
                            <span className={styles.docCompactType}>
                              {doc.documentType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                            <span className={styles.docCompactPlate}>{doc.plateNumber}</span>
                          </div>
                          <ExpiryBadge expiryDate={doc.expiryDate} />
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/dashboard/fleet/documents" className={styles.docViewAll}>
                    <FileText size={14} />
                    View All Documents
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
              {activeTab === 2 && <p className={styles.tabPlaceholder}>Maintenance and inspection history</p>}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Vehicle Details */}
        <div className={styles.rightSidebar}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Vehicle Details</h2>
            </div>

            {/* Bus Image Placeholder */}
            <div className={styles.busImage}>
              <Truck size={48} style={{ color: "var(--color-text-tertiary)" }} />
            </div>

            <div className={styles.vehicleDetailHeader}>
              <span className={styles.vehiclePlate}>1234 KSA</span>
              <span className={styles.badgeActive}>Active</span>
            </div>
            <p className={styles.vehicleModelDetail}>Yutong 55 Seater Model 2022</p>

            <div className={styles.detailSection}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Driver</span>
                <span className={styles.detailValue}>Ahmed Khan</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Current Location</span>
                <span className={styles.detailValue}>Makkah Ring Road</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fuel Level</span>
                <span className={styles.detailValue}>72% (145L)</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Insurance</span>
                <span className={styles.detailValue}>Valid until Jun 21, 2025</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Next Maintenance</span>
                <span className={styles.detailValue}>In 2,350 km or 18 days</span>
              </div>
            </div>

            <div className={styles.detailActions}>
              <button className={styles.detailActionBtn}>
                <MapPin size={14} />
                Track
              </button>
              <button className={styles.detailActionBtn}>
                <FileText size={14} />
                Documents
              </button>
              <button className={styles.detailActionBtn}>
                <Wrench size={14} />
                Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
