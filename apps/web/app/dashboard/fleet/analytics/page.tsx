"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Download, Truck, Wrench, AlertTriangle, Clock,
  Gauge, TrendingDown, DollarSign, Calendar, FileText,
} from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function FleetAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/fleet/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExport = async (format: string) => {
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/fleet/analytics/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (format === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "fleet-report.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} /> Loading analytics...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <BarChart3 size={48} style={{ opacity: 0.3 }} />
          <p>No fleet data available.</p>
        </div>
      </div>
    );
  }

  const { summary, avgBusAge, utilizationRate, usedBuses, upcomingRenewals, fuelEfficiency, readinessDistribution, maintenanceCostPerBus, maintenanceCostGrandTotal } = data;
  const utilPct = Math.min(utilizationRate, 100);
  const maintCosts: any[] = Array.isArray(maintenanceCostPerBus) ? maintenanceCostPerBus : [];
  const maintGrandTotal = typeof maintenanceCostGrandTotal === "number"
    ? maintenanceCostGrandTotal
    : maintCosts.reduce((s: number, b: any) => s + (Number(b.totalCost) || 0), 0);
  const maxMaintCost = Math.max(...maintCosts.map((b: any) => Number(b.totalCost) || 0), 1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fleet Analytics</h1>
          <p className={styles.pageDesc}>Comprehensive fleet performance dashboard</p>
        </div>
        <div className={styles.exportDropdown}>
          <button className={styles.exportBtn} onClick={() => handleExport("csv")}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <Truck size={20} style={{ color: "#3b82f6" }} />
          <span className={styles.kpiLabel}>Total Buses</span>
          <span className={styles.kpiValue}>{summary.totalBuses}</span>
          <span className={styles.kpiSub}>{summary.activeBuses} active</span>
        </div>
        <div className={styles.kpiCard}>
          <Wrench size={20} style={{ color: "#f59e0b" }} />
          <span className={styles.kpiLabel}>Maintenance</span>
          <span className={styles.kpiValue}>{summary.maintenanceBuses}</span>
          <span className={styles.kpiSub}>{summary.retiredBuses} retired</span>
        </div>
        <div className={styles.kpiCard}>
          <Gauge size={20} style={{ color: "#10b981" }} />
          <span className={styles.kpiLabel}>Utilization</span>
          <span className={styles.kpiValue}>{utilizationRate}%</span>
          <span className={styles.kpiSub}>{usedBuses} of {summary.totalBuses} in use</span>
        </div>
        <div className={styles.kpiCard}>
          <Calendar size={20} style={{ color: "#8b5cf6" }} />
          <span className={styles.kpiLabel}>Avg Bus Age</span>
          <span className={styles.kpiValue}>{avgBusAge} yrs</span>
          <span className={styles.kpiSub}>Fleet average</span>
        </div>
        <div className={styles.kpiCard}>
          <TrendingDown size={20} style={{ color: "#ef4444" }} />
          <span className={styles.kpiLabel}>Avg Efficiency</span>
          <span className={styles.kpiValue}>{fuelEfficiency.avgKmPerLiter ?? "—"}</span>
          <span className={styles.kpiSub}>km/L</span>
        </div>
        <div className={styles.kpiCard}>
          <Clock size={20} style={{ color: "#f97316" }} />
          <span className={styles.kpiLabel}>Renewals Due</span>
          <span className={styles.kpiValue}>{upcomingRenewals.length}</span>
          <span className={styles.kpiSub}>within 30 days</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Utilization Gauge */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Fleet Utilization</h3>
          <div className={styles.gaugeWrap}>
            <svg viewBox="0 0 200 120" className={styles.gaugeSvg}>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-border)" strokeWidth="16" strokeLinecap="round" />
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="round"
                strokeDasharray={`${(utilPct / 100) * 251.2} 251.2`}
              />
              <text x="100" y="80" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--color-text)">
                {utilizationRate}%
              </text>
              <text x="100" y="98" textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">
                {usedBuses} of {summary.totalBuses} buses assigned
              </text>
            </svg>
          </div>
        </div>

        {/* Bus Age Bar */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Bus Age Distribution</h3>
          <div className={styles.barChart}>
            <div className={styles.barRow}>
              <span className={styles.barLabel}>0-3 yrs</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: "45%", background: "#10b981" }} />
              </div>
              <span className={styles.barCount}>—</span>
            </div>
            <div className={styles.barRow}>
              <span className={styles.barLabel}>4-7 yrs</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: "30%", background: "#3b82f6" }} />
              </div>
              <span className={styles.barCount}>—</span>
            </div>
            <div className={styles.barRow}>
              <span className={styles.barLabel}>8+ yrs</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: "25%", background: "#f59e0b" }} />
              </div>
              <span className={styles.barCount}>—</span>
            </div>
          </div>
        </div>

        {/* Fuel Efficiency Trend */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Fuel Efficiency (km/L)</h3>
          {fuelEfficiency.trend?.length > 0 ? (
            <svg viewBox="0 0 300 140" className={styles.trendSvg}>
              <defs>
                <linearGradient id="fuelTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={fuelEfficiency.trend.map((d: any, i: number) =>
                  `${i === 0 ? "M" : "L"} ${30 + i * (240 / Math.max(fuelEfficiency.trend.length - 1, 1))} ${130 - (d.kmPerLiter / 30) * 100}`
                ).join(" ") + ` L ${30 + (fuelEfficiency.trend.length - 1) * (240 / Math.max(fuelEfficiency.trend.length - 1, 1))} 130 L 30 130 Z`}
                fill="url(#fuelTrendGrad)"
              />
              <path
                d={fuelEfficiency.trend.map((d: any, i: number) =>
                  `${i === 0 ? "M" : "L"} ${30 + i * (240 / Math.max(fuelEfficiency.trend.length - 1, 1))} ${130 - (d.kmPerLiter / 30) * 100}`
                ).join(" ")}
                fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {fuelEfficiency.trend.map((d: any, i: number) => {
                const x = 30 + i * (240 / Math.max(fuelEfficiency.trend.length - 1, 1));
                const y = 130 - (d.kmPerLiter / 30) * 100;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="3" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                    <text x={x} y={142} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="7">
                      {new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <p className={styles.chartEmpty}>No efficiency data yet</p>
          )}
        </div>
      </div>

      {/* Lower Row: Renewals + Maintenance */}
      <div className={styles.chartsRowLower}>
        {/* Upcoming Renewals Widget */}
        <div className={styles.renewalsCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.chartTitle}>Upcoming Renewals</h3>
            <FileText size={16} style={{ color: "var(--color-text-secondary)" }} />
          </div>
          {upcomingRenewals.length === 0 ? (
            <p className={styles.chartEmpty}>No renewals due in the next 30 days</p>
          ) : (
            <div className={styles.renewalList}>
              {upcomingRenewals.map((r: any) => {
                const days = daysUntil(r.expiryDate);
                const isUrgent = days <= 7;
                const isSoon = days <= 14;
                return (
                  <div key={r.id} className={styles.renewalItem}>
                    <div className={styles.renewalInfo}>
                      <span className={styles.renewalType}>
                        {r.documentType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                      <span className={styles.renewalBus}>{r.plateNumber} — {r.busMake} {r.busModel}</span>
                    </div>
                    <span
                      className={styles.renewalDays}
                      style={{
                        color: isUrgent ? "#ef4444" : isSoon ? "#f97316" : "#f59e0b",
                        fontWeight: 700,
                      }}
                    >
                      {days}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Maintenance Cost Per Bus */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.chartTitle}>Maintenance Cost / Bus</h3>
            {maintCosts.length > 0 ? (
              <span className={styles.maintTotalBadge}>Fleet total: SAR {Number(maintGrandTotal).toLocaleString()}</span>
            ) : (
              <DollarSign size={16} style={{ color: "var(--color-text-tertiary)" }} />
            )}
          </div>
          {maintCosts.length === 0 ? (
            <div className={styles.chartEmpty}>
              <DollarSign size={24} style={{ opacity: 0.3 }} />
              <p>No maintenance cost records yet.<br />Costs appear once tasks are invoiced.</p>
            </div>
          ) : (
            <div className={styles.maintWrap}>
              <div className={styles.maintBarList}>
                {maintCosts.slice(0, 8).map((b: any) => {
                  const pct = Math.max((Number(b.totalCost) / maxMaintCost) * 100, 4);
                  return (
                    <div key={b.busId} className={styles.maintBarRow}>
                      <span className={styles.maintBarLabel} title={`${b.plateNumber} ${b.make || ""} ${b.model || ""}`}>
                        {b.plateNumber}
                      </span>
                      <div className={styles.maintBarTrack}>
                        <div className={styles.maintBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.maintBarValue}>SAR {Number(b.totalCost).toLocaleString()}</span>
                      <span className={styles.maintBarCount}>{b.taskCount} task{b.taskCount !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
              {maintCosts.length > 8 && (
                <p className={styles.maintMore}>+{maintCosts.length - 8} more buses with costs</p>
              )}
              <div className={styles.maintTableWrap}>
                <table className={styles.maintTable}>
                  <thead>
                    <tr>
                      <th>Bus</th>
                      <th>Tasks</th>
                      <th style={{ textAlign: "right" }}>Total Cost</th>
                      <th style={{ textAlign: "right" }}>Parts</th>
                      <th style={{ textAlign: "right" }}>Labor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintCosts.map((b: any) => (
                      <tr key={b.busId}>
                        <td>
                          <span className={styles.maintPlate}>{b.plateNumber}</span>
                          {(b.make || b.model) && (
                            <span className={styles.maintSub}> {b.make || ""} {b.model || ""}</span>
                          )}
                        </td>
                        <td>{b.taskCount}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>SAR {Number(b.totalCost).toLocaleString()}</td>
                        <td style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>{b.partsCost != null ? `SAR ${Number(b.partsCost).toLocaleString()}` : "—"}</td>
                        <td style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>{b.laborCost != null ? `SAR ${Number(b.laborCost).toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
