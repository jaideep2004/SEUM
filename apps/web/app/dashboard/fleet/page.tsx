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
import { useLanguage, formatDate, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const tabs = ["fleet.dashboard.trips", "fleet.dashboard.documents", "fleet.dashboard.history"];

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
  const { lang, t: tr } = useLanguage();
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
  const [docKpiChange, setDocKpiChange] = useState(tr("fleet.dashboard.loadingKpi"));

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
          setDocKpiChange(expired.length > 0 ? `${expired.length} ${tr("fleet.dashboard.expired")}` : `${expiring.length} ${tr("fleet.dashboard.expiring")}`);
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
    { label: tr("fleet.dashboard.totalVehicles"), value: String(busTotal), change: `${fleetSummary.totalBuses} ${tr("fleet.dashboard.activeFleet")}`, trend: "up" as const, icon: Truck, color: "#2563eb", bg: "#eff6ff", sparkData: [busTotal * 0.86, busTotal * 0.9, busTotal * 0.92, busTotal * 0.95, busTotal * 0.97, busTotal * 0.98, busTotal * 0.99, busTotal] },
    { label: tr("fleet.dashboard.active"), value: String(fleetSummary.activeBuses), change: pctOf(fleetSummary.activeBuses), trend: "up" as const, icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5", sparkData: [fleetSummary.activeBuses * 0.8, fleetSummary.activeBuses * 0.85, fleetSummary.activeBuses * 0.88, fleetSummary.activeBuses * 0.9, fleetSummary.activeBuses * 0.93, fleetSummary.activeBuses * 0.96, fleetSummary.activeBuses * 0.98, fleetSummary.activeBuses] },
    { label: tr("fleet.dashboard.underMaintenance"), value: String(fleetSummary.maintenanceBuses), change: pctOf(fleetSummary.maintenanceBuses), trend: "neutral" as const, icon: Wrench, color: "#f59e0b", bg: "#fffbeb", sparkData: [0, 1, 0, 2, 1, 2, 1, fleetSummary.maintenanceBuses] },
    { label: tr("fleet.dashboard.outOfService"), value: String(outOfService), change: pctOf(outOfService), trend: "down" as const, icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", sparkData: [outOfService, outOfService - (outOfService > 0 ? 1 : 0), 0, outOfService, 0, outOfService, 1, outOfService] },
    { label: tr("fleet.dashboard.documentsExpiring"), value: docKpiValue, change: docKpiChange, trend: "down" as const, icon: FileText, color: "#8b5cf6", bg: "#f5f3ff", sparkData: [0, 1, 2, 3, 4, 3, 2, expiringCount + expiredCount] },
  ];

  const effMax = Math.max(...efficiencyTrend.map((e) => e.kmPerLiter), 1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{tr("fleet.dashboard.title")}</h1>
          <p className={styles.pageDesc}>{tr("fleet.dashboard.desc")}</p>
        </div>
      </div>

      {fuelAlert.dropped && (
        <div className={styles.docBannerDanger} style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          {fuelAlert.message}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>{tr("fleet.dashboard.loading")}</div>
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
                    <h2 className={styles.cardTitle}>{tr("fleet.dashboard.statusDist")}</h2>
                  </div>
                  <div className={styles.donutCenter}>
                    <DonutChart
                      segments={[
                        { label: tr("fleet.dashboard.active"), value: fleetSummary.activeBuses, color: "#2563eb" },
                        { label: tr("fleet.dashboard.underMaintenance"), value: fleetSummary.maintenanceBuses, color: "#f59e0b" },
                        { label: tr("fleet.dashboard.outOfService"), value: outOfService, color: "#ef4444" },
                      ].filter((s) => s.value > 0)}
                      size={150}
                      thickness={18}
                      centerValue={String(fleetSummary.totalBuses)}
                      centerLabel={tr("fleet.dashboard.total")}
                    />
                  </div>
                  <div className={styles.donutLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#2563eb" }} />
                      <span className={styles.legendLabel}>{tr("fleet.dashboard.active")}</span>
                      <span className={styles.legendValue}>{fleetSummary.activeBuses} ({pctOf(fleetSummary.activeBuses)})</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                      <span className={styles.legendLabel}>{tr("fleet.dashboard.underMaintenance")}</span>
                      <span className={styles.legendValue}>{fleetSummary.maintenanceBuses} ({pctOf(fleetSummary.maintenanceBuses)})</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                      <span className={styles.legendLabel}>{tr("fleet.dashboard.outOfService")}</span>
                      <span className={styles.legendValue}>{outOfService} ({pctOf(outOfService)})</span>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{tr("fleet.dashboard.fuelSummary")}</h2>
                  </div>
                  <div className={styles.fuelStats}>
                    <div className={styles.fuelStatItem}>
                      <span className={styles.fuelStatLabel}>{tr("fleet.dashboard.totalFuel")}</span>
                      <span className={styles.fuelStatValue}>{fuelStats.totalLiters.toLocaleString()} {tr("fleet.dashboard.litersUnit")}</span>
                    </div>
                    <div className={styles.fuelStatItem}>
                      <span className={styles.fuelStatLabel}>{tr("fleet.dashboard.totalCost")}</span>
                      <span className={styles.fuelStatValue}>{formatCurrency(fuelStats.totalCost, lang, 0)}</span>
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
                        {fuelStats.avgKmPerLiter ? `${tr("fleet.dashboard.avgEfficiency")}: ${fuelStats.avgKmPerLiter} ${tr("fleet.dashboard.kmPerL")}` : tr("fleet.dashboard.noFuelData")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{tr("fleet.dashboard.vehiclesOverview")}</h2>
                  <div className={styles.searchBox}>
                    <Search size={14} className={styles.searchIcon} />
                    <input type="text" className={styles.searchInput} placeholder={tr("fleet.dashboard.searchVehicles")} />
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{tr("fleet.dashboard.plateNumber")}</th>
                        <th>{tr("fleet.dashboard.vehicle")}</th>
                        <th>{tr("fleet.dashboard.status")}</th>
                        <th>{tr("fleet.dashboard.depot")}</th>
                        <th>{tr("fleet.dashboard.fuelType")}</th>
                        <th>{tr("fleet.dashboard.inFleetSince")}</th>
                        <th>{tr("fleet.dashboard.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buses.map((v) => (
                        <tr key={v.id}>
                          <td><span className={styles.plateNumber}>{v.plateNumber}</span></td>
                          <td>
                            <div className={styles.vehicleCell}>
                              <span className={styles.vehicleModel}>{v.make} {v.model} {v.year || ""}</span>
                              <span className={styles.vehicleId}>{v.fuelType ? `${v.fuelType} · ${v.capacitySeated ?? "—"} ${tr("fleet.dashboard.seats")}` : "—"}</span>
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
                          <td className={styles.textMuted}>{formatDate(v.createdAt, lang)}</td>
                          <td>
                            <Link href="/dashboard/fleet/buses" className={styles.viewBtn}>{tr("common.view")}</Link>
                          </td>
                        </tr>
                      ))}
                      {buses.length === 0 && (
                        <tr>
                          <td colSpan={7} className={styles.textMuted} style={{ padding: 24, textAlign: "center" }}>{tr("fleet.dashboard.noVehicles")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={styles.pagination}>
                  <span className={styles.paginationInfo}>{tr("fleet.dashboard.showing")} {buses.length > 0 ? `1 ${tr("fleet.dashboard.to")} ${buses.length}` : "0"} {tr("fleet.dashboard.of")} {busTotal} {tr("fleet.dashboard.vehiclesWord")}</span>
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
                      {tr(tab)}
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
                            {formatDate(t.scheduledDate, lang)}{t.scheduledStartTime ? ` · ${t.scheduledStartTime.slice(0, 5)}` : ""}
                          </span>
                          <span className={styles.recentTripMeta}>{t.busPlate || tr("fleet.dashboard.noBus")} · {t.driverName || tr("fleet.dashboard.noDriver")}</span>
                          {statusBadge(t.status)}
                        </div>
                      ))}
                      {recentTrips.length === 0 && (
                        <p className={styles.tabPlaceholder}>{tr("fleet.dashboard.noTrips")}</p>
                      )}
                    </div>
                  )}
                  {activeTab === 1 && (
                    <div className={styles.docTabContent}>
                      {expiredCount > 0 && (
                        <div className={styles.docBannerDanger}>
                          <AlertTriangle size={16} />
                          {expiredCount} {expiredCount !== 1 ? tr("fleet.dashboard.documentsPl") : tr("fleet.dashboard.documentSg")} {tr("fleet.dashboard.expiredAttention")}
                          <Link href="/dashboard/fleet/documents" className={styles.docBannerLink}>
                            {tr("fleet.dashboard.viewAll")} <ChevronRight size={14} />
                          </Link>
                        </div>
                      )}
                      {expiredCount === 0 && expiringCount > 0 && (
                        <div className={styles.docBannerWarning}>
                          <Clock size={16} />
                          {expiringCount} {expiringCount !== 1 ? tr("fleet.dashboard.documentsPl") : tr("fleet.dashboard.documentSg")} {tr("fleet.dashboard.expiringAttention")}
                          <Link href="/dashboard/fleet/documents" className={styles.docBannerLink}>
                            {tr("fleet.dashboard.viewAll")} <ChevronRight size={14} />
                          </Link>
                        </div>
                      )}
                      <div className={styles.docListCompact}>
                        {expiringDocs.length === 0 ? (
                          <p className={styles.tabPlaceholder}>{tr("fleet.dashboard.noDocs")}</p>
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
                        {tr("fleet.dashboard.viewAllDocs")}
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  )}
                  {activeTab === 2 && <p className={styles.tabPlaceholder}>{tr("fleet.dashboard.maintHistory")}</p>}
                </div>
              </div>
            </div>

            <div className={styles.rightSidebar}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{tr("fleet.dashboard.vehicleDetails")}</h2>
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
                        <span className={styles.detailLabel}>{tr("fleet.dashboard.fuelType")}</span>
                        <span className={styles.detailValue}>{buses[0].fuelType || "—"}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{tr("fleet.dashboard.assignedDepot")}</span>
                        <span className={styles.detailValue}>{buses[0].assignedDepot || "—"}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{tr("fleet.dashboard.capacity")}</span>
                        <span className={styles.detailValue}>{buses[0].capacitySeated ?? "—"} {tr("fleet.dashboard.seated")}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{tr("fleet.dashboard.added")}</span>
                        <span className={styles.detailValue}>{formatDate(buses[0].createdAt, lang)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{tr("fleet.dashboard.lastUpdated")}</span>
                        <span className={styles.detailValue}>{formatDate(buses[0].updatedAt, lang)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className={styles.tabPlaceholder}>{tr("fleet.dashboard.selectVehicle")}</p>
                )}

                <div className={styles.detailActions}>
                  <button className={styles.detailActionBtn}>
                    <MapPin size={14} />
                    {tr("fleet.dashboard.track")}
                  </button>
                  <Link href="/dashboard/fleet/documents" className={styles.detailActionBtn}>
                    <FileText size={14} />
                    {tr("fleet.dashboard.documentsBtn")}
                  </Link>
                  <Link href="/dashboard/maintenance" className={styles.detailActionBtn}>
                    <Wrench size={14} />
                    {tr("fleet.dashboard.service")}
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