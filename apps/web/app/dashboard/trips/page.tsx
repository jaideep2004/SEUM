"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MapPin, Clock, CalendarDays } from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280",
  cancelled: "#ef4444", delayed: "#f59e0b",
};

export default function TripsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
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
          <h1 className={styles.pageTitle}>{t("trips.list.title")}</h1>
          <p className={styles.pageDesc}>{t("trips.list.desc")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/trips/calendar" className={styles.calendarBtn}>
            <CalendarDays size={14} /> {t("trips.list.calendar")}
          </Link>
          <Link href="/dashboard/trips/new" className={styles.createBtn}>
            <Plus size={14} /> {t("trips.list.newTrip")}
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder={t("trips.list.searchPh")} value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
        </div>
        <div className={styles.filterSelect}>
          <Filter size={13} />
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">{t("trips.list.allStatus")}</option>
            <option value="scheduled">{t("trips.list.scheduled")}</option>
            <option value="en_route">{t("trips.list.enRoute")}</option>
            <option value="completed">{t("trips.list.completed")}</option>
            <option value="delayed">{t("trips.list.delayed")}</option>
            <option value="cancelled">{t("trips.list.cancelled")}</option>
          </select>
        </div>
        <div className={styles.filterSelect}>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">{t("trips.list.allTypes")}</option>
            <option value="single">{t("trips.list.singleTrip")}</option>
            <option value="round">{t("trips.list.roundTrip")}</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("trips.list.colRoute")}</th>
              <th>{t("trips.list.colBus")}</th>
              <th>{t("trips.list.colDriver")}</th>
              <th>{t("trips.list.colDate")}</th>
              <th>{t("trips.list.colTime")}</th>
              <th>{t("trips.list.colType")}</th>
              <th>{t("trips.list.colStatus")}</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("common.loading")}</td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("trips.list.empty")}</td></tr>
            ) : trips.map((trip) => (
              <tr key={trip.id} className={styles.clickableRow} onClick={() => router.push(`/dashboard/trips/${trip.id}`)}>
                <td className={styles.routeCell}>
                  <MapPin size={12} />
                  {trip.tripTitle || trip.routeName || <span className={styles.muted}>—</span>}
                </td>
                <td>{trip.busPlate || <span className={styles.muted}>—</span>}</td>
                <td>
                  <div className={styles.driverCell}>
                    <span>{trip.driverName || <span className={styles.muted}>—</span>}</span>
                    {trip.driverConfirmationStatus && trip.driverConfirmationStatus !== "pending" && (
                      <span className={styles.confirmBadge} data-status={trip.driverConfirmationStatus}>
                        {trip.driverConfirmationStatus}
                      </span>
                    )}
                  </div>
                </td>
                <td>{trip.scheduledDate ? formatDate(trip.scheduledDate, lang) : "—"}</td>
                <td className={styles.timeCell}>
                  <Clock size={11} />
                  {trip.scheduledStartTime?.slice(0, 5) || "—"}
                </td>
                <td>
                  <span className={styles.typeTag}>{trip.tripType === "round" ? <>{t("trips.list.roundShort")}{trip.legCount ? ` · ${trip.legCount} ${t("trips.list.legs")}` : ""}</> : t("trips.list.singleShort")}</span>
                </td>
                <td>
                  <span className={styles.statusDot} style={{ background: STATUS_COLORS[trip.status] || "#6b7280" }} />
                  <span className={styles.statusLabel}>{trip.status.replace("_", " ")}</span>
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("trips.list.prev")}</button>
          <span>{t("trips.list.page")} {page} {t("trips.list.of")} {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("trips.list.next")}</button>
        </div>
      )}
    </div>
  );
}
