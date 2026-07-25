"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function formatCurrency(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TripProfitabilityPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ status: "completed", start_date: "", end_date: "" });

  async function fetchData(page = 1) {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.status) params.set("status", filters.status);
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    try {
      const res = await fetch(`${API}/accounting/trip-profitability?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) { setTrips(d.data); setMeta(d.meta); }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Trip Profitability</h1>
        <div className={styles.headerLinks}>
          <Link href="/dashboard/accounting/trip-profitability/analytics" className={`${styles.actionBtn} ${styles.primaryBtn}`}>
            <BarChart3 size={14} /> Analytics
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="en_route">En Route</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="delayed">Delayed</option>
        </select>
        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <button className={styles.filterBtn} onClick={() => fetchData()}>Apply</button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading profitability data...</div>
      ) : trips.length === 0 ? (
        <div className={styles.loading}>No trips found</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th>Bus</th>
                <th>Revenue</th>
                <th>Fuel</th>
                <th>Maint.</th>
                <th>Tolls</th>
                <th>Total Costs</th>
                <th>Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>{t.scheduledDate}</td>
                  <td>{t.routeName || "—"}</td>
                  <td>{t.plateNumber || "—"}</td>
                  <td>{formatCurrency(t.estimatedRevenue)}</td>
                  <td>{formatCurrency(t.fuelCost)}</td>
                  <td>{formatCurrency(t.maintenanceCost)}</td>
                  <td>{formatCurrency(t.tollCost)}</td>
                  <td>{formatCurrency(t.totalExpenses)}</td>
                  <td className={t.profit >= 0 ? styles.positive : styles.negative}>
                    {formatCurrency(t.profit)}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className={styles.marginBar}
                        style={{ width: Math.min(Math.abs(t.marginPercent), 100), background: t.marginPercent >= 0 ? "#059669" : "#dc2626" }} />
                      {t.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
