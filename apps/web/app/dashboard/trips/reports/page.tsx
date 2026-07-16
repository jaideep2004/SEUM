"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, Download, Calendar, CheckCircle, AlertTriangle, XCircle,
  Clock, Route, Bus, User, TrendingUp, TrendingDown, ChevronDown,
  FileText, Search,
} from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type SortDir = "asc" | "desc";

function today() { return new Date().toISOString().slice(0, 10); }
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function TripReportsPage() {
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
    { label: "Total Trips", value: summary.total_trips, icon: BarChart3, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Completed", value: summary.completed, icon: CheckCircle, color: "#10b981", bg: "#ecfdf5" },
    { label: "Delayed", value: summary.delayed, icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Cancelled", value: summary.cancelled, icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
    { label: "Completion Rate", value: `${summary.completion_rate}%`, icon: TrendingUp, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: "Delay Rate", value: `${summary.delay_rate}%`, icon: TrendingDown, color: "#f97316", bg: "#fff7ed" },
  ] : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trip Reports</h1>
          <p className={styles.pageDesc}>Daily trip summary, driver and route performance</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.dateRange}>
            <Calendar size={13} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.dateInput} />
            <span>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.dateInput} />
          </div>
          <button className={styles.generateBtn} onClick={fetchReports} disabled={loading}>
            <BarChart3 size={14} /> {loading ? "Loading..." : "Generate"}
          </button>
          <div className={styles.exportWrap}>
            <button className={styles.exportBtn} onClick={() => setShowExport(!showExport)}>
              <Download size={14} /> Export <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className={styles.exportDropdown}>
                <button onClick={() => handleExport("trips")}>Export Trip Report (CSV)</button>
                <button onClick={() => handleExport("drivers")}>Export Driver Performance (CSV)</button>
                <button onClick={() => handleExport("routes")}>Export Route Performance (CSV)</button>
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
          <BarChart3 size={14} /> Summary
        </button>
        <button className={`${styles.tab} ${activeTab === "drivers" ? styles.tabActive : ""}`} onClick={() => setActiveTab("drivers")}>
          <User size={14} /> Drivers ({drivers.length})
        </button>
        <button className={`${styles.tab} ${activeTab === "routes" ? styles.tabActive : ""}`} onClick={() => setActiveTab("routes")}>
          <Route size={14} /> Routes ({routes.length})
        </button>
        <button className={`${styles.tab} ${activeTab === "buses" ? styles.tabActive : ""}`} onClick={() => setActiveTab("buses")}>
          <Bus size={14} /> Buses ({buses.length})
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Period Overview: {startDate} to {endDate}</h3>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Trips per Day (avg)</span>
              <span className={styles.overviewValue}>
                {summary ? (summary.total_trips / Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)).toFixed(1) : "—"}
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Completion Rate</span>
              <span className={styles.overviewValue} style={{ color: summary?.completion_rate >= 80 ? "#10b981" : "#f59e0b" }}>
                {summary?.completion_rate ?? "—"}%
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Delay Rate</span>
              <span className={styles.overviewValue} style={{ color: summary?.delay_rate <= 10 ? "#10b981" : "#f59e0b" }}>
                {summary?.delay_rate ?? "—"}%
              </span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Active Drivers</span>
              <span className={styles.overviewValue}>{drivers.length}</span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Active Routes</span>
              <span className={styles.overviewValue}>{routes.length}</span>
            </div>
            <div className={styles.overviewStat}>
              <span className={styles.overviewLabel}>Buses Used</span>
              <span className={styles.overviewValue}>{buses.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Driver Performance Tab */}
      {activeTab === "drivers" && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.sectionTitle}>Driver Performance</h3>
            <span className={styles.tableHint}>Click column headers to sort</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort("driverName")}>Driver <SortIcon field="driverName" /></th>
                  <th onClick={() => handleSort("totalTrips")}>Trips <SortIcon field="totalTrips" /></th>
                  <th onClick={() => handleSort("onTimePct")} className={styles.sortActive}>On-Time % <SortIcon field="onTimePct" /></th>
                  <th onClick={() => handleSort("completedTrips")}>Completed <SortIcon field="completedTrips" /></th>
                  <th onClick={() => handleSort("delayedTrips")}>Delayed <SortIcon field="delayedTrips" /></th>
                  <th onClick={() => handleSort("cancelledTrips")}>Cancelled <SortIcon field="cancelledTrips" /></th>
                  <th onClick={() => handleSort("avgDelayMinutes")}>Avg Delay <SortIcon field="avgDelayMinutes" /></th>
                  <th onClick={() => handleSort("totalDelayMinutes")}>Total Delay <SortIcon field="totalDelayMinutes" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>No driver data for this period</td></tr>
                ) : sortedDrivers.map((d: any) => (
                  <tr key={d.driverId}>
                    <td className={styles.driverCell}><User size={12} />{d.driverName}</td>
                    <td>{d.totalTrips}</td>
                    <td><span className={styles.pctBadge} data-good={d.onTimePct >= 80}>{d.onTimePct}%</span></td>
                    <td>{d.completedTrips}</td>
                    <td>{d.delayedTrips}</td>
                    <td>{d.cancelledTrips}</td>
                    <td>{d.avgDelayMinutes} min</td>
                    <td>{d.totalDelayMinutes} min</td>
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
          <h3 className={styles.sectionTitle}>Route Performance</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Origin → Destination</th>
                  <th>Distance</th>
                  <th>Trips</th>
                  <th>Delayed</th>
                  <th>Delay %</th>
                  <th>Avg Delay</th>
                  <th>Max Delay</th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>No route data for this period</td></tr>
                ) : routes.map((r: any) => (
                  <tr key={r.routeId}>
                    <td className={styles.routeCell}><Route size={12} />{r.routeName}</td>
                    <td className={styles.muted}>{r.origin} → {r.destination}</td>
                    <td>{r.distanceKm ? `${r.distanceKm} km` : "—"}</td>
                    <td>{r.totalTrips}</td>
                    <td>{r.delayedTrips}</td>
                    <td>
                      <span className={styles.pctBadge} data-good={r.delayFrequencyPct <= 15}>{r.delayFrequencyPct}%</span>
                    </td>
                    <td>{r.avgDelayMinutes} min</td>
                    <td>{r.maxDelayMinutes} min</td>
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
          <h3 className={styles.sectionTitle}>Bus Utilization</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Make / Model</th>
                  <th>Year</th>
                  <th>Trips</th>
                  <th>Completed</th>
                  <th>Delayed</th>
                  <th>Cancelled</th>
                  <th>Avg Delay</th>
                </tr>
              </thead>
              <tbody>
                {buses.length === 0 ? (
                  <tr><td colSpan={8} className={styles.tableEmpty}>No bus data for this period</td></tr>
                ) : buses.map((b: any) => (
                  <tr key={b.busId}>
                    <td className={styles.busCell}><Bus size={12} />{b.plateNumber}</td>
                    <td className={styles.muted}>{b.make} {b.model}</td>
                    <td>{b.year || "—"}</td>
                    <td>{b.totalTrips}</td>
                    <td><span className={styles.greenText}>{b.completedTrips}</span></td>
                    <td>{b.delayedTrips}</td>
                    <td>{b.cancelledTrips}</td>
                    <td>{b.avgDelayMinutes} min</td>
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
