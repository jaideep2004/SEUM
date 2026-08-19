"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  Search,
  ChevronLeft,
  MapPin,
  Route,
} from "lucide-react";
import Link from "next/link";
import { api, API_URL } from "@/services/api";
import DonutChart from "@/components/dashboard/DonutChart";
import Sparkline from "@/components/dashboard/Sparkline";
import { ExpiryBadge, getDaysUntilExpiry } from "@/components/fleet/ExpiryBadge";
import styles from "./page.module.css";

const tabs = ["Trips", "Documents", "History"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: styles.badgeSuccess,
    maintenance: styles.badgeWarning,
    retired: styles.badgeNeutral,
    sold: styles.badgeNeutral,
    completed: styles.badgeSuccess,
    scheduled: styles.badgeNeutral,
    delayed: styles.badgeDanger,
    cancelled: styles.badgeDanger,
    en_route: styles.badgeWarning,
  };
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  return <span className={`${styles.badge} ${map[status?.toLowerCase()] || styles.badgeNeutral}`}>{label}</span>;
}

const dateOnly = (iso?: string) => (iso ? String(iso).slice(0, 10) : "—");

interface Bus {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  fuelType: string | null;
  capacitySeated: number | null;
  status: string;
  assignedDepot: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TripRow {
  id: string;
  routeName: string | null;
  origin: string | null;
  destination: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  status: string;
  busPlate: string | null;
  driverName: string | null;
}

export default function FleetDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [busTotal, setBusTotal] = useState(0);
  const [fleetSummary, setFleetSummary] = useState({ totalBuses: 0, activeBuses: 0, maintenanceBuses: 0, retiredBuses: 0, soldBuses: 0 });
  const [fuelStats, setFuelStats] = useState({ totalLiters: 0, totalCost: 0, avgKmPerLiter: 0 });
  const [efficiencyTrend, setEfficiencyTrend] = useState<{ date: string; plateNumber: string; kmPerLiter: number }[]>([]);
  const [recentTrips, setRecentTrips] = useState<TripRow[]>([]);

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
      setLoading(true);
      try {
        const [busesRes, analytics, fuel, trips, docRes, fuelRes] = await Promise.all([
          api.get<any>("/fleet/buses?page=1&pageSize=5").catch(() => null),
          api.get<any>("/fleet/analytics/dashboard").catch(() => null),
          api.get<any>("/fleet/fuel/analytics").catch(() => null),
          api.get<any>("/trips?page=1&pageSize=5").catch(() => null),
          fetch(`${API_URL}/fleet/documents/expiring?days=365`),
          fetch(`${API_URL}/fleet/fuel/efficiency-check`),
        ]);

        if (busesRes?.data) {
          setBuses(busesRes.data);
          setBusTotal(busesRes.meta?.total ?? busesRes.data.length);
        }
        if (analytics?.summary) {
          setFleetSummary({
            totalBuses: analytics.summary.totalBuses || 0,
            activeBuses: analytics.summary.activeBuses || 0,
            maintenanceBuses: analytics.summary.maintenanceBuses || 0,
            retiredBuses: analytics.summary.retiredBuses || 0,
            soldBuses: analytics.summary.soldBuses || 0,
          });
          setEfficiencyTrend(analytics.fuelEfficiency?.trend || []);
        }
        if (fuel?.summary) {
          setFuelStats({
            totalLiters: fuel.summary.totalLiters || 0,
            totalCost: fuel.summary.totalCost || 0,
            avgKmPerLiter: fuel.avgKmPerLiter || 0,
          });
        }
        if (trips?.data) setRecentTrips(trips.data);

        const fuelJson = await fuelRes.json();
        if (fuelJson.success) setFuelAlert(fuelJson.data);

        const docJson = await docRes.json();
        if (docJson.success) {
          const docs = docJson.data;
          const expired = docs.filter((d: any) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 0);
          const expiring = docs.filter((d: any) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) > 0 && getDaysUntilExpiry(d.expiryDate) <= 30);
          setExpiringDocs(docs);
          setExpiredCount(expired.length);
          setExpiringCount(expiring.length);
          setDocKpiValue(String(expired.length + expiring.length));
          setDocKpiChange(expired.length > 0 ? `${expired.length} expired` : `${expiring.length} expiring`);
        }
      } catch (e) {
        console.error("Failed to load fleet dashboard", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const outOfService = fleetSummary.retiredBuses + fleetSummary.soldBuses;
  const pctOf = (n: number) => (fleetSummary.totalBuses > 0 ? `${((n / fleetSummary.totalBuses) * 100).toFixed(1)}%` : "0%");

  const kpiCards = [
    { label: "Total Vehicles", value: String(busTotal), change: `${fleetSummary.totalBuses} active fleet`, trend: "up" as const, icon: Truck, color: "#2563eb", bg: "#eff6ff", sparkData: [busTotal * 0.86, busTotal * 0.9, busTotal * 0.92, busTotal * 0.95, busTotal * 0.97, busTotal * 0.98, busTotal * 0.99, busTotal] },
    { label: "Active", value: String(fleetSummary.activeBuses), change: pctOf(fleetSummary.activeBuses), trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5", sparkData: [fleetSummary.activeBuses * 0.8, fleetSummary.activeBuses * 0.85, fleetSummary.activeBuses * 0.88, fleetSummary.activeBuses * 0.9, fleetSummary.activeBuses * 0.93, fleetSummary.activeBuses * 0.96, fleetSummary.activeBuses * 0.98, fleetSummary.activeBuses] },
    { label: "Under Maintenance", value: String(fleetSummary.maintenanceBuses), change: pctOf(fleetSummary.maintenanceBuses), trend: "neutral" as const, icon: Wrench, color: "#f59e0b", bg: "#fffbeb", sparkData: [0, 1, 0, 2, 1, 2, 1, fleetSummary.maintenanceBuses] },
    { label: "Out of Service", value: String(outOfService), change: pctOf(outOfService), trend: "down" as const, icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", sparkData: [outOfService, outOfService - (outOfService > 0 ? 1 : 0), 0, outOfService, 0, outOfService, 1, outOfService] },
    { label: "Documents Expiring", value: docKpiValue, change: docKpiChange, trend: "down" as const, icon: FileText, color: "#8b5cf6", bg: "#f5f3ff", sparkData: [0, 1, 2, 3, 4, 3, 2, expiringCount + expiredCount] },
  ];

  const effMax = Math.max(...efficiencyTrend.map((e) => e.kmPerLiter), 1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fleet Management</h1>
          <p className={styles.pageDesc}>Overview of your vehicle fleet</p>
        </div>
      </div>

      {fuelAlert.dropped && (
        <div className={styles.docBannerDanger} style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          {fuelAlert.message}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading fleet overview...</div>
      ) : (
        <>
          <div className={styles.kpiGrid5}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <div className={styles.kpiIconWrap} style={{ background: card.bg, color: card.color }}>
                      <Icon size={20} />
                    </div>
                    <Sparkline data={card.sparkData} width={60} height={24} color={card.color} fillColor={card.color} />
                  </div>
                  <span className={styles.kpiLabel}>{card.label}</span>
                  <span className={styles.kpiValue}>{card.value}</span>
                  <span className={`${styles.kpiChange} ${card.trend === "up" ? styles.kpiUp : card.trend === "down" ? styles.kpiDown : ""}`}>
                    {card.change}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.mainGrid}>
            <div className={styles.leftContent}>
              <div className={styles.grid2Col}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Fleet Status Distribution</h2>
                  </div>
                  <div className={styles.donutCenter}>
                    <DonutChart
                      segments={[
                        { label: "Active", value: fleetSummary.activeBuses, color: "#2563eb" },
                        { label: "Under Maintenance", value: fleetSummary.maintenanceBuses, color: "#f59e0b" },
                        { label: "Out of Service", value: outOfService, color: "#ef4444" },
                      ].filter((s) => s.value > 0)}
                      size={150}
                      thickness={18}
                      centerValue={String(fleetSummary.totalBuses)}
                      centerLabel="Total"
                    />
                  </div>
                  <div className={styles.donutLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                      <span className={styles.legendLabel}>Active</span>
                      <span className={styles.legendValue}>{fleetSummary.activeBuses} ({pctOf(fleetSummary.activeBuses)})</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                      <span className={styles.legendLabel}>Under Maintenance</span>
                      <span className={styles.legendValue}>{fleetSummary.maintenanceBuses} ({pctOf(fleetSummary.maintenanceBuses)})</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                      <span className={styles.legendLabel}>Out of Service</span>
                      <span className={styles.legendValue}>{outOfService} ({pctOf(outOfService)})</span>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Fuel Summary</h2>
                  </div>
                  <div className={styles.fuelStats}>
                    <div className={styles.fuelStatItem}>
                      <span className={styles.fuelStatLabel}>Total Fuel</span>
                      <span className={styles.fuelStatValue}>{fuelStats.totalLiters.toLocaleString()} L</span>
                    </div>
                    <div className={styles.fuelStatItem}>
                      <span className={styles.fuelStatLabel}>Total Cost</span>
                      <span className={styles.fuelStatValue}>SAR {fuelStats.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={styles.lineChartArea}>
                    {efficiencyTrend.length >= 2 ? (
                      <svg viewBox="0 0 500 120" className={`${styles.lineChart} lineChartAnimated`}>
                        <defs>
                          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M ${efficiencyTrend.map((e, i) => `${(i / (efficiencyTrend.length - 1)) * 500} ${118 - (e.kmPerLiter / effMax) * 100}`).join(" L ")} L 500 120 L 0 120 Z`}
                          fill="url(#fuelGrad)"
                          className="chartFill"
                        />
                        <path
                          d={`M ${efficiencyTrend.map((e, i) => `${(i / (efficiencyTrend.length - 1)) * 500} ${118 - (e.kmPerLiter / effMax) * 100}`).join(" L ")}`}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="chartLine"
                        />
                      </svg>
                    ) : (
                      <p className={styles.tabPlaceholder}>
                        {fuelStats.avgKmPerLiter ? `Average efficiency: ${fuelStats.avgKmPerLiter} km/L` : "No fuel data yet"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
                        <th>Status</th>
                        <th>Depot</th>
                        <th>Fuel Type</th>
                        <th>In Fleet Since</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buses.map((v) => (
                        <tr key={v.id}>
                          <td><span className={styles.plateNumber}>{v.plateNumber}</span></td>
                          <td>
                            <div className={styles.vehicleCell}>
                              <span className={styles.vehicleModel}>{v.make} {v.model} {v.year || ""}</span>
                              <span className={styles.vehicleId}>{v.fuelType ? `${v.fuelType} · ${v.capacitySeated ?? "—"} seats` : "—"}</span>
                            </div>
                          </td>
                          <td>{statusBadge(v.status)}</td>
                          <td className={styles.textMuted}>
                            <span className={styles.locationCell}>
                              <MapPin size={12} />
                              {v.assignedDepot || "—"}
                            </span>
                          </td>
                          <td className={styles.textMuted}>{v.fuelType || "—"}</td>
                          <td className={styles.textMuted}>{dateOnly(v.createdAt)}</td>
                          <td>
                            <Link href="/dashboard/fleet/buses" className={styles.viewBtn}>View</Link>
                          </td>
                        </tr>
                      ))}
                      {buses.length === 0 && (
                        <tr>
                          <td colSpan={7} className={styles.textMuted} style={{ padding: 24, textAlign: "center" }}>No vehicles in fleet yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={styles.pagination}>
                  <span className={styles.paginationInfo}>Showing {buses.length > 0 ? `1 to ${buses.length}` : "0"} of {busTotal} vehicles</span>
                  <div className={styles.paginationBtns}>
                    <button className={styles.paginationBtn} disabled><ChevronLeft size={16} /></button>
                    <button className={`${styles.paginationBtn} ${styles.paginationActive}`}>1</button>
                    <button className={styles.paginationBtn} disabled><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>

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
                      {recentTrips.map((t) => (
                        <div key={t.id} className={styles.recentTripItem}>
                          <div className={styles.recentTripInfo}>
                            <Route size={14} style={{ color: "var(--color-primary)" }} />
                            <span className={styles.recentTripRoute}>
                              {t.routeName || `${t.origin || "?"} → ${t.destination || "?"}`}
                            </span>
                          </div>
                          <span className={styles.recentTripDate}>
                            {dateOnly(t.scheduledDate)}{t.scheduledStartTime ? ` · ${t.scheduledStartTime.slice(0, 5)}` : ""}
                          </span>
                          <span className={styles.recentTripMeta}>{t.busPlate || "No bus"} · {t.driverName || "No driver"}</span>
                          {statusBadge(t.status)}
                        </div>
                      ))}
                      {recentTrips.length === 0 && (
                        <p className={styles.tabPlaceholder}>No trips scheduled yet</p>
                      )}
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

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Vehicle Details</h2>
                </div>

                <div className={styles.busImage}>
                  <Truck size={48} style={{ color: "var(--color-text-tertiary)" }} />
                </div>

                {buses[0] ? (
                  <>
                    <div className={styles.vehicleDetailHeader}>
                      <span className={styles.vehiclePlate}>{buses[0].plateNumber}</span>
                      {statusBadge(buses[0].status)}
                    </div>
                    <p className={styles.vehicleModelDetail}>{buses[0].make} {buses[0].model} {buses[0].year || ""}</p>

                    <div className={styles.detailSection}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Fuel Type</span>
                        <span className={styles.detailValue}>{buses[0].fuelType || "—"}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Assigned Depot</span>
                        <span className={styles.detailValue}>{buses[0].assignedDepot || "—"}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Capacity</span>
                        <span className={styles.detailValue}>{buses[0].capacitySeated ?? "—"} seated</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Added</span>
                        <span className={styles.detailValue}>{dateOnly(buses[0].createdAt)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Last Updated</span>
                        <span className={styles.detailValue}>{dateOnly(buses[0].updatedAt)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className={styles.tabPlaceholder}>Select a vehicle</p>
                )}

                <div className={styles.detailActions}>
                  <button className={styles.detailActionBtn}>
                    <MapPin size={14} />
                    Track
                  </button>
                  <Link href="/dashboard/fleet/documents" className={styles.detailActionBtn}>
                    <FileText size={14} />
                    Documents
                  </Link>
                  <Link href="/dashboard/maintenance" className={styles.detailActionBtn}>
                    <Wrench size={14} />
                    Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}