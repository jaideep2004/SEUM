"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Repeat, Clock, CalendarDays, RotateCcw } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", weekdays: "Weekdays", weekends: "Weekends", custom_days: "Custom",
};

const FREQ_COLORS: Record<string, string> = {
  daily: "#3b82f6", weekdays: "#10b981", weekends: "#8b5cf6", custom_days: "#f59e0b",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurringTripsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFreq, setFilterFreq] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function fetchPatterns() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterFreq) params.set("frequency", filterFreq);
      if (filterActive !== "") params.set("isActive", filterActive);
      if (search) params.set("search", search);
      const res = await fetch(`${API}/operations/recurring-trips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setPatterns(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchPatterns(); }, [page, filterFreq, filterActive]);

  function handleSearch() { setPage(1); fetchPatterns(); }

  const totalPages = Math.ceil(total / pageSize);

  function freqBadge(p: any) {
    const label = FREQ_LABELS[p.frequency] || p.frequency;
    const color = FREQ_COLORS[p.frequency] || "#6b7280";
    return <span className={styles.freqBadge} style={{ background: color + "20", color }}>{label}</span>;
  }

  function daysDisplay(p: any) {
    if (p.frequency === "daily") return "Every day";
    if (p.frequency === "weekdays") return "Mon–Fri";
    if (p.frequency === "weekends") return "Sat–Sun";
    return p.daysOfWeek?.map((d: number) => DAY_LABELS[d]).join(", ") || "—";
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Recurring Trips</h1>
          <p className={styles.pageDesc}>Manage recurring trip patterns and auto-generate trips</p>
        </div>
        <Link href="/dashboard/recurring-trips/new" className={styles.createBtn}>
          <Plus size={14} /> New Pattern
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search by route..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterFreq} onChange={(e) => { setFilterFreq(e.target.value); setPage(1); }}>
            <option value="">All Frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
            <option value="custom_days">Custom</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Route</th>
              <th>Bus</th>
              <th>Driver</th>
              <th>Frequency</th>
              <th>Schedule</th>
              <th>Period</th>
              <th>Last Gen</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>Loading...</td></tr>
            ) : patterns.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>No recurring patterns found</td></tr>
            ) : patterns.map((p) => (
              <tr key={p.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/recurring-trips/${p.id}`)}>
                <td className={styles.routeCell}>{p.routeName || p.routeId || "—"}</td>
                <td>{p.busPlate || <span className={styles.muted}>—</span>}</td>
                <td>{p.driverName || <span className={styles.muted}>—</span>}</td>
                <td>{freqBadge(p)}</td>
                <td className={styles.timeCell}>
                  <Clock size={11} /> {p.scheduledStartTime?.slice(0, 5)}
                  <span className={styles.daysText}>{daysDisplay(p)}</span>
                </td>
                <td className={styles.dateCell}>
                  <CalendarDays size={11} />
                  {new Date(p.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  {p.endDate ? ` – ${new Date(p.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : " →"}
                </td>
                <td className={styles.muted}>
                  {p.lastGeneratedAt ? new Date(p.lastGeneratedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Never"}
                </td>
                <td>
                  <span className={`${styles.statusDot} ${p.isActive ? styles.activeDot : styles.inactiveDot}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
