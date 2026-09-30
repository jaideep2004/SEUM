"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function TripProfitabilityPage() {
  const { lang, t } = useLanguage();
  const money = (v: number) => formatCurrency(v, lang);
  const STATUS_LABELS: Record<string, string> = {
    scheduled: t("finance.tripProf.statusScheduled"),
    en_route: t("finance.tripProf.statusEnRoute"),
    completed: t("finance.tripProf.statusCompleted"),
    cancelled: t("finance.tripProf.statusCancelled"),
    delayed: t("finance.tripProf.statusDelayed"),
  };
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
        <h1>{t("finance.tripProf.title")}</h1>
        <div className={styles.headerLinks}>
          <Link href="/dashboard/accounting/trip-profitability/analytics" className={`${styles.actionBtn} ${styles.primaryBtn}`}>
            <BarChart3 size={14} /> {t("finance.tripProf.analytics")}
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">{t("finance.tripProf.allStatuses")}</option>
          <option value="scheduled">{STATUS_LABELS.scheduled}</option>
          <option value="en_route">{STATUS_LABELS.en_route}</option>
          <option value="completed">{STATUS_LABELS.completed}</option>
          <option value="cancelled">{STATUS_LABELS.cancelled}</option>
          <option value="delayed">{STATUS_LABELS.delayed}</option>
        </select>
        <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <button className={styles.filterBtn} onClick={() => fetchData()}>{t("finance.tripProf.apply")}</button>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("finance.tripProf.loading")}</div>
      ) : trips.length === 0 ? (
        <div className={styles.loading}>{t("finance.tripProf.noTrips")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("finance.tripProf.colDate")}</th>
                <th>{t("finance.tripProf.colRoute")}</th>
                <th>{t("finance.tripProf.colBus")}</th>
                <th>{t("finance.tripProf.colRevenue")}</th>
                <th>{t("finance.tripProf.colFuel")}</th>
                <th>{t("finance.tripProf.colMaint")}</th>
                <th>{t("finance.tripProf.colTolls")}</th>
                <th>{t("finance.tripProf.colTotalCosts")}</th>
                <th>{t("finance.tripProf.colProfit")}</th>
                <th>{t("finance.tripProf.colMargin")}</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.id}>
                  <td>{formatDate(t.scheduledDate, lang)}</td>
                  <td>{t.routeName || "—"}</td>
                  <td>{t.plateNumber || "—"}</td>
                  <td>{money(t.estimatedRevenue)}</td>
                  <td>{money(t.fuelCost)}</td>
                  <td>{money(t.maintenanceCost)}</td>
                  <td>{money(t.tollCost)}</td>
                  <td>{money(t.totalExpenses)}</td>
                  <td className={t.profit >= 0 ? styles.positive : styles.negative}>
                    {money(t.profit)}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className={styles.marginBar}
                        style={{ width: Math.min(Math.abs(t.marginPercent), 100), background: t.marginPercent >= 0 ? "#059669" : "#dc2626" }} />
                      {formatNumber(t.marginPercent, lang, 1)}%
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
