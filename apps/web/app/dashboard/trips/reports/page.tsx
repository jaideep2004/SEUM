"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, Download, Calendar, CheckCircle, AlertTriangle, XCircle,
  Clock, Route, Bus, User, TrendingUp, TrendingDown, ChevronDown,
  FileText, Search,
} from "lucide-react";
import styles from "./page.module.css";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type SortDir = "asc" | "desc";

function today() { return new Date().toISOString().slice(0, 10); }
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function TripReportsPage() {
  const { lang, t } = useLanguage();
  const [startDate, setStartDate] = useState(weekAgo());
  const [endDate, setEndDate] = useState(today());
  const [summary, setSummary] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "drivers" | "routes" | "buses">("summary");
  const [sortField, setSortField] = useState("onTimePct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showExport, setShowExport] = useState(false);

  async function fetchReports() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`${API}/operations/reports/trip?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setDrivers(json.data.drivers);
        setRoutes(json.data.routes);
        setBuses(json.data.buses);
      }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchReports(); }, []);

  async function handleExport(section: string) {
    setShowExport(false);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ startDate, endDate, format: "csv", section });
      const res = await fetch(`${API}/operations/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const names: Record<string, string> = { trips: "trip-report", drivers: "driver-performance", routes: "route-performance" };
      a.href = url;
      a.download = `${names[section] || "report"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortedDrivers = useMemo(() => {
    const sorted = [...drivers].sort((a: any, b: any) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [drivers, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <TrendingUp size={11} /> : <TrendingDown size={11} />;
  };

  const summaryCards = summary ? [
    { label: t("trips.reports.totalTrips"), value: summary.total_trips, icon: BarChart3, color: "#3b82f6", bg: "#eff6ff" },
    { label: t("trips.reports.completed"), value: summary.completed, icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
    { label: t("trips.reports.delayed"), value: summary.delayed, icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
    { label: t("trips.reports.cancelled"), value: summary.cancelled, icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
    { label: t("trips.reports.completionRate"), value: `${summary.completion_rate}%`, icon: TrendingUp, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: t("trips.reports.delayRate"), value: `${summary.delay_rate}%`, icon: TrendingDown, color: "#f97316", bg: "#fff7ed" },
  ] : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("trips.reports.title")}</h1>
          <p className={styles.pageDesc}>{t("trips.reports.desc")}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.dateRange}>
            <Calendar size={13} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.dateInput} />
            <span>{t("trips.reports.to")}</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.dateInput} />
          </div>
          <button className={styles.generateBtn} onClick={fetchReports} disabled={loading}>
            <BarChart3 size={14} /> {loading ? t("common.loading") : t("trips.reports.generate")}
          </button>
          <div className={styles.exportWrap}>
            <button className={styles.exportBtn} onClick={() => setShowExport(!showExport)}>
              <Download size={14} /> {t("common.export")} <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className={styles.exportDropdown}>
                <button onClick={() => handleExport("trips")}>{t("trips.reports.exportTrips")}</button>
                <button onClick={() => handleExport("drivers")}>{t("trips.reports.exportDrivers")}</button>
                <button onClick={() => handleExport("routes")}>{t("trips.reports.exportRoutes")}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ background: card.bg, color: card.color }}>
                <Icon size={18} />
              </div>
              <span className={styles.summaryLabel}>{card.label}</span>
              <span className={styles.summaryValue}>{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === "summary" ? styles.tabActive : ""}`} onClick={() => setActiveTab("summary")}>
          <BarChart3 size={14} /> {t("trips.reports.tabSummary")}
        </button>
        <button className={`${styles.tab} ${activeTab === "drivers" ? styles.tabActive : ""}`} onClick={() => setActiveTab("drivers")}>
          <User size={14} /> {t("trips.reports.tabDrivers")} ({drivers.length})
        </button>
        <button className={`${styles.tab} ${activeTab === "routes" ? styles.tabActive : ""}`} onClick={() => setActiveTab("routes")}>
          <Route size={14} /> {t("trips.reports.tabRoutes")} ({routes.length})
        </button>
        <button className={`${styles.tab} ${activeTab === "buses" ? styles.tabActive : ""}`} onClick={() => setActiveTab("buses")}>
          <Bus size={14} /> {t("trips.reports.tabBuses")} ({buses.length})
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>{t("trips.reports.periodOverview")} {startDate} {t("trips.reports.to")} {endDate}</h3>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.tripsPerDay")}</span>
              <span className={styles.overviewValue}>
                {summary ? (summary.total_trips / Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)).toFixed(1) : "—"}
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.completionRate")}</span>
              <span className={styles.overviewValue} style={{ color: summary?.completion_rate >= 80 ? "#10b981" : "#f59e0b" }}>
                {summary?.completion_rate ?? "—"}%
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.delayRate")}</span>
              <span className={styles.overviewValue} style={{ color: summary?.delay_rate <= 10 ? "#10b981" : "#f59e0b" }}>
                {summary?.delay_rate ?? "—"}%
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.activeDrivers")}</span>
              <span className={styles.overviewValue}>{drivers.length}</span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.activeRoutes")}</span>
              <span className={styles.overviewValue}>{routes.length}</span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>{t("trips.reports.busesUsed")}</span>
              <span className={styles.overviewValue}>{buses.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Driver Performance Tab */}
      {activeTab === "drivers" && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.sectionTitle}>{t("trips.reports.driverPerf")}</h3>
            <span className={styles.tableHint}>{t("trips.reports.sortHint")}</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort("driverName")}>{t("trips.reports.colDriver")} <SortIcon field="driverName" /></th>
                  <th onClick={() => handleSort("totalTrips")}>{t("trips.reports.colTrips")} <SortIcon field="totalTrips" /></th>
                  <th onClick={() => handleSort("onTimePct")} className={styles.sortActive}>{t("trips.reports.colOnTime")} <SortIcon field="onTimePct" /></th>
                  <th onClick={() => handleSort("completedTrips")}>{t("trips.reports.colCompleted")} <SortIcon field="completedTrips" /></th>
                  <th onClick={() => handleSort("delayedTrips")}>{t("trips.reports.colDelayed")} <SortIcon field="delayedTrips" /></th>
                  <th onClick={() => handleSort("cancelledTrips")}>{t("trips.reports.colCancelled")} <SortIcon field="cancelledTrips" /></th>
                  <th onClick={() => handleSort("avgDelayMinutes")}>{t("trips.reports.colAvgDelay")} <SortIcon field="avgDelayMinutes" /></th>
                  <th onClick={() => handleSort("totalDelayMinutes")}>{t("trips.reports.colTotalDelay")} <SortIcon field="totalDelayMinutes" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>{t("trips.reports.noDriverData")}</td></tr>
                ) : sortedDrivers.map((d: any) => (
                  <tr key={d.driverId}>
                    <td className={styles.driverCell}><User size={12} />{d.driverName}</td>
                    <td>{d.totalTrips}</td>
                    <td><span className={styles.pctBadge} data-good={d.onTimePct >= 80}>{d.onTimePct}%</span></td>
                    <td>{d.completedTrips}</td>
                    <td>{d.delayedTrips}</td>
                    <td>{d.cancelledTrips}</td>
                    <td>{d.avgDelayMinutes} {t("trips.reports.min")}</td>
                    <td>{d.totalDelayMinutes} {t("trips.reports.min")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Route Performance Tab */}
      {activeTab === "routes" && (
        <div className={styles.tableCard}>
          <h3 className={styles.sectionTitle}>{t("trips.reports.routePerf")}</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("trips.reports.colRoute")}</th>
                  <th>{t("trips.reports.colOriginDest")}</th>
                  <th>{t("trips.reports.colDistance")}</th>
                  <th>{t("trips.reports.colTrips")}</th>
                  <th>{t("trips.reports.colDelayed")}</th>
                  <th>{t("trips.reports.colDelayPct")}</th>
                  <th>{t("trips.reports.colAvgDelay")}</th>
                  <th>{t("trips.reports.colMaxDelay")}</th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>{t("trips.reports.noRouteData")}</td></tr>
                ) : routes.map((r: any) => (
                  <tr key={r.routeId}>
                    <td className={styles.routeCell}><Route size={12} />{r.routeName}</td>
                    <td className={styles.muted}>{r.origin} → {r.destination}</td>
                    <td>{r.distanceKm ? `${r.distanceKm} ${t("trips.reports.km")}` : "—"}</td>
                    <td>{r.totalTrips}</td>
                    <td>{r.delayedTrips}</td>
                    <td>
                      <span className={styles.pctBadge} data-good={r.delayFrequencyPct <= 15}>{r.delayFrequencyPct}%</span>
                    </td>
                    <td>{r.avgDelayMinutes} {t("trips.reports.min")}</td>
                    <td>{r.maxDelayMinutes} {t("trips.reports.min")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bus Utilization Tab */}
      {activeTab === "buses" && (
        <div className={styles.tableCard}>
          <h3 className={styles.sectionTitle}>{t("trips.reports.busUtil")}</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("trips.reports.colBus")}</th>
                  <th>{t("trips.reports.colMakeModel")}</th>
                  <th>{t("trips.reports.colYear")}</th>
                  <th>{t("trips.reports.colTrips")}</th>
                  <th>{t("trips.reports.colCompleted")}</th>
                  <th>{t("trips.reports.colDelayed")}</th>
                  <th>{t("trips.reports.colCancelled")}</th>
                  <th>{t("trips.reports.colAvgDelay")}</th>
                </tr>
              </thead>
              <tbody>
                {buses.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>{t("trips.reports.noBusData")}</td></tr>
                ) : buses.map((b: any) => (
                  <tr key={b.busId}>
                    <td className={styles.busCell}><Bus size={12} />{b.plateNumber}</td>
                    <td className={styles.muted}>{b.make} {b.model}</td>
                    <td>{b.year || "—"}</td>
                    <td>{b.totalTrips}</td>
                    <td><span className={styles.greenText}>{b.completedTrips}</span></td>
                    <td>{b.delayedTrips}</td>
                    <td>{b.cancelledTrips}</td>
                    <td>{b.avgDelayMinutes} {t("trips.reports.min")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
