"use client";

import { useState, useEffect } from "react";
import {
  Fuel,
  TrendingDown,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function FuelAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ dropped: boolean; message: string | null }>({ dropped: false, message: null });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const [analyticsRes, alertRes] = await Promise.all([
          fetch(`${API}/fleet/fuel/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/fleet/fuel/efficiency-check`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const analyticsData = await analyticsRes.json();
        const alertData = await alertRes.json();
        if (analyticsData.success) setAnalytics(analyticsData.data);
        if (alertData.success) setAlert(alertData.data);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} /> Loading analytics...
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <BarChart3 size={48} style={{ opacity: 0.3 }} />
          <p>No fuel data available for analytics.</p>
        </div>
      </div>
    );
  }

  const { summary, avgKmPerLiter, avgCostPerKm, efficiencyTrend } = analytics;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fuel Analytics</h1>
          <p className={styles.pageDesc}>Efficiency trends and cost analysis</p>
        </div>
      </div>

      {/* Efficiency Alert */}
      {alert.dropped && (
        <div className={styles.alertBanner}>
          <AlertTriangle size={18} />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            <Fuel size={20} />
          </div>
          <span className={styles.kpiLabel}>Total Fills</span>
          <span className={styles.kpiValue}>{summary.totalFills}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
            <Fuel size={20} />
          </div>
          <span className={styles.kpiLabel}>Total Liters</span>
          <span className={styles.kpiValue}>{summary.totalLiters.toLocaleString()} L</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
            <DollarSign size={20} />
          </div>
          <span className={styles.kpiLabel}>Total Cost</span>
          <span className={styles.kpiValue}>SAR {summary.totalCost.toLocaleString()}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
            <DollarSign size={20} />
          </div>
          <span className={styles.kpiLabel}>Avg Cost/Liter</span>
          <span className={styles.kpiValue}>SAR {summary.avgCostPerLiter.toFixed(2)}</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            <Gauge size={20} />
          </div>
          <span className={styles.kpiLabel}>Avg Efficiency</span>
          <span className={styles.kpiValue}>{avgKmPerLiter ?? "—"} km/L</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
            <TrendingDown size={20} />
          </div>
          <span className={styles.kpiLabel}>Avg Cost/km</span>
          <span className={styles.kpiValue}>SAR {avgCostPerKm ?? "—"}</span>
        </div>
      </div>

      {/* Efficiency Trend Chart */}
      {efficiencyTrend && efficiencyTrend.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Efficiency Trend (km/L)</h2>
          </div>
          <div className={styles.chartBody}>
            <svg viewBox={`0 0 ${Math.max(efficiencyTrend.length * 60, 300)} 200`} className={styles.chartSvg}>
              <defs>
                <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = 180 - (pct / 100) * 150;
                return (
                  <g key={pct}>
                    <line x1="40" y1={y} x2={Math.max(efficiencyTrend.length * 60, 300) - 10} y2={y} stroke="var(--color-border)" strokeWidth="0.5" />
                    <text x="35" y={y + 3} textAnchor="end" fill="var(--color-text-tertiary)" fontSize="9">{pct}</text>
                  </g>
                );
              })}
              {/* Area */}
              {efficiencyTrend.length > 1 && (
                <path
                  d={`M ${efficiencyTrend.map((d: any, i: number) =>
                    `${40 + i * 60} ${180 - (d.kmPerLiter / (Math.max(...efficiencyTrend.map((e: any) => e.kmPerLiter)) || 1) / 100) * 150}`
                  ).join(" L ")} L ${40 + (efficiencyTrend.length - 1) * 60} 180 L 40 180 Z`}
                  fill="url(#effGrad)"
                />
              )}
              {/* Line */}
              <path
                d={efficiencyTrend.map((d: any, i: number) =>
                  `${i === 0 ? "M" : "L"} ${40 + i * 60} ${180 - (d.kmPerLiter / (Math.max(...efficiencyTrend.map((e: any) => e.kmPerLiter)) || 1) / 100) * 150}`
                ).join(" ")}
                fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Dots */}
              {efficiencyTrend.map((d: any, i: number) => {
                const x = 40 + i * 60;
                const y = 180 - (d.kmPerLiter / (Math.max(...efficiencyTrend.map((e: any) => e.kmPerLiter)) || 1) / 100) * 150;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x={x} y={190} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="8">
                      {new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Efficiency Data Table */}
      {efficiencyTrend && efficiencyTrend.length > 0 && (
        <div className={styles.dataCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Efficiency Data</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bus</th>
                  <th>km/L</th>
                  <th>SAR/km</th>
                  <th>Liters</th>
                </tr>
              </thead>
              <tbody>
                {efficiencyTrend.slice().reverse().map((d: any, i: number) => (
                  <tr key={i}>
                    <td>{new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{d.plateNumber || "—"}</td>
                    <td><strong>{d.kmPerLiter}</strong></td>
                    <td>SAR {d.costPerKm}</td>
                    <td>{d.liters} L</td>
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
