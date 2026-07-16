"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MapPin, Clock, CalendarDays } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280",
  cancelled: "#ef4444", delayed: "#f59e0b",
};

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function fetchTrips() {
    setLoading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterStatus) params.set("status", filterStatus);
      if (filterType) params.set("tripType", filterType);
      if (search) params.set("search", search);
      const res = await fetch(`${API}/operations/trips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) { setTrips(json.data); setTotal(json.meta.total); }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchTrips(); }, [page, filterStatus, filterType]);

  function handleSearch() { setPage(1); fetchTrips(); }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trips</h1>
          <p className={styles.pageDesc}>Manage scheduled trips and operations</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/trips/calendar" className={styles.calendarBtn}>
            <CalendarDays size={14} /> Calendar
          </Link>
          <Link href="/dashboard/trips/new" className={styles.createBtn}>
            <Plus size={14} /> New Trip
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search trips..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="en_route">En Route</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="hajj">Hajj</option>
            <option value="umrah">Umrah</option>
            <option value="charter">Charter</option>
            <option value="shuttle">Shuttle</option>
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
              <th>Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>Loading...</td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>No trips found</td></tr>
            ) : trips.map((t) => (
              <tr key={t.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/trips/${t.id}`)}>
                <td className={styles.routeCell}>
                  <MapPin size={12} />
                  {t.routeName || <span className={styles.muted}>—</span>}
                </td>
                <td>{t.busPlate || <span className={styles.muted}>—</span>}</td>
                <td>
                  <div className={styles.driverCell}>
                    <span>{t.driverName || <span className={styles.muted}>—</span>}</span>
                    {t.driverConfirmationStatus && t.driverConfirmationStatus !== "pending" && (
                      <span className={styles.confirmBadge} data-status={t.driverConfirmationStatus}>
                        {t.driverConfirmationStatus}
                      </span>
                    )}
                  </div>
                </td>
                <td>{t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                <td className={styles.timeCell}>
                  <Clock size={11} />
                  {t.scheduledStartTime?.slice(0, 5) || "—"}
                </td>
                <td><span className={styles.typeTag}>{t.tripType}</span></td>
                <td>
                  <span className={styles.statusDot} style={{ background: STATUS_COLORS[t.status] || "#6b7280" }} />
                  <span className={styles.statusLabel}>{t.status.replace("_", " ")}</span>
                </td>
                <td>
                  <span className={styles.arrow}>→</span>
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
