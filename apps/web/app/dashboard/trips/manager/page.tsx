"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Play, AlertTriangle, XCircle, UserCheck, ArrowLeft, Pencil } from "lucide-react";
import DriverAssignModal from "@/components/DriverAssignModal";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#10b981", completed: "#6b7280",
  cancelled: "#ef4444", delayed: "#f59e0b",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function TripsManagerInner() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");
  const { lang, t } = useLanguage();
  const [trips, setTrips] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayStr());
  const [statusF, setStatusF] = useState("");
  const [needsDriver, setNeedsDriver] = useState(false);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [modalTrip, setModalTrip] = useState<any | null>(null);
  const [busAssigning, setBusAssigning] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: "1", pageSize: "100", startDate: date, endDate: date });
      if (statusF) params.set("status", statusF);
      if (submittedSearch) params.set("search", submittedSearch);
      const res = await fetch(`${API}/operations/trips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setTrips(json.data || []);
      else setError(json.message || json.error?.message || t("trips.manager.failedAction"));
    } catch {
      setError(t("trips.manager.networkError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, statusF, submittedSearch]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/fleet/buses?pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          setBuses((json.data || [])
            .filter((b: any) => b.status === "active")
            .sort((x: any, y: any) => String(x.plateNumber || "").localeCompare(String(y.plateNumber || ""))));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!highlight || loading) return;
    const el = rowRefs.current[highlight];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight, loading]);

  function handleSearch() {
    setSubmittedSearch(search);
  }

  const visible = trips.filter((tr) => {
    if (needsDriver && tr.driverId) return false;
    if (submittedSearch) {
      const q = submittedSearch.toLowerCase();
      const hay = `${tr.tripNumber || ""} ${tr.tripTitle || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  async function postAction(tripId: string, action: string, body: any) {
    setActionLoading(`${tripId}:${action}`);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${tripId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || json.error?.message || `${t("trips.manager.failedAction")}: ${action}`);
        return;
      }
      await fetchTrips();
    } catch {
      setError(t("trips.manager.networkError"));
    } finally {
      setActionLoading("");
    }
  }

  function handleDelay(trip: any) {
    const mins = window.prompt(t("trips.manager.delayMinutesPrompt"), "15");
    if (mins === null) return;
    const reason = window.prompt(t("trips.manager.delayReasonPrompt"), "");
    if (reason === null || !reason.trim()) return;
    postAction(trip.id, "delay", { delayMinutes: Number(mins) || 15, delayReason: reason.trim() });
  }

  function handleCancel(trip: any) {
    const reason = window.prompt(t("trips.manager.cancelReasonPrompt"), "");
    if (reason === null || !reason.trim()) return;
    postAction(trip.id, "cancel", { rejectionReason: reason.trim() });
  }

  async function handleAssignBus(tripId: string, busId: string) {
    if (!busId) return;
    setBusAssigning(tripId);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ busId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || json.error?.message || t("trips.manager.failedAction"));
        return;
      }
      await fetchTrips();
    } catch {
      setError(t("trips.manager.networkError"));
    } finally {
      setBusAssigning(null);
    }
  }

  function legsLabel(trip: any) {
    const count = trip.legCount ?? 0;
    const route = trip.origin && trip.destination ? ` · ${trip.origin} → ${trip.destination}` : "";
    return `${count}${route}`;
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}>
        <ArrowLeft size={14} /> {t("trips.new.back")}
      </Link>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("trips.manager.title")}</h1>
          <p className={styles.pageDesc}>{t("trips.manager.desc")}</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filters}>
        <input
          type="date"
          className={styles.dateInput}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title={t("trips.manager.date")}
        />
        <div className={styles.filterSelect}>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">{t("trips.manager.allStatus")}</option>
            <option value="scheduled">{t("trips.manager.scheduled")}</option>
            <option value="en_route">{t("trips.manager.enRoute")}</option>
            <option value="delayed">{t("trips.manager.delayed")}</option>
            <option value="completed">{t("trips.manager.completed")}</option>
            <option value="cancelled">{t("trips.manager.cancelled")}</option>
          </select>
        </div>
        <label className={styles.toggle}>
          <input type="checkbox" checked={needsDriver} onChange={(e) => setNeedsDriver(e.target.checked)} />
          {t("trips.manager.needsDriver")}
        </label>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("trips.manager.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("trips.manager.colTripNo")}</th>
              <th>{t("trips.manager.colTitle")}</th>
              <th>{t("trips.manager.colDateTime")}</th>
              <th>{t("trips.manager.colLegs")}</th>
              <th>{t("trips.manager.colBus")}</th>
              <th>{t("trips.manager.colDriver")}</th>
              <th>{t("trips.manager.colStatus")}</th>
              <th>{t("trips.manager.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("common.loading")}</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} className={styles.tableEmpty}>{t("trips.manager.empty")}</td></tr>
            ) : visible.map((trip) => {
              const isHighlight = highlight === trip.id;
              const locked = trip.status === "completed" || trip.status === "cancelled";
              return (
                <tr
                  key={trip.id}
                  ref={(el) => { rowRefs.current[trip.id] = el; }}
                  className={isHighlight ? styles.highlightRow : undefined}
                >
                  <td>
                    <Link href={`/dashboard/trips/${trip.id}`} className={styles.mono}>
                      {trip.tripNumber || trip.id?.slice(0, 8)}
                    </Link>
                  </td>
                  <td>{trip.tripTitle || trip.routeName || <span className={styles.muted}>—</span>}</td>
                  <td className={styles.dateCell}>
                    {trip.scheduledDate ? formatDate(trip.scheduledDate, lang) : "—"}
                    {trip.scheduledStartTime ? ` · ${String(trip.scheduledStartTime).slice(0, 5)}` : ""}
                  </td>
                  <td>{legsLabel(trip)}</td>
                  <td>
                    <select
                      className={styles.busSelect}
                      value={trip.busId || ""}
                      disabled={busAssigning === trip.id || locked}
                      title={t("trips.manager.assignBus")}
                      onChange={(e) => handleAssignBus(trip.id, e.target.value)}
                    >
                      <option value="" disabled>{trip.busPlate || t("trips.manager.assignBus")}</option>
                      {buses.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.plateNumber}{b.make || b.model ? ` · ${[b.make, b.model].filter(Boolean).join(" ")}` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {trip.driverName || <span className={styles.unassigned}>{t("trips.manager.unassigned")}</span>}
                  </td>
                  <td>
                    <span className={styles.statusDot} style={{ background: STATUS_COLORS[trip.status] || "#6b7280" }} />
                    <span className={styles.statusLabel}>{String(trip.status || "").replace("_", " ")}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {!locked && (
                        <Link
                          href={`/dashboard/trips/${trip.id}/edit`}
                          className={styles.iconBtn}
                          title={t("trips.manager.edit")}
                          style={{ textDecoration: "none" }}
                        >
                          <Pencil size={13} />
                        </Link>
                      )}
                      <button
                        className={styles.assignBtn}
                        title={t("trips.manager.assignDriver")}
                        disabled={locked}
                        onClick={() => setModalTrip(trip)}
                      >
                        <UserCheck size={12} /> {t("trips.manager.assignDriver")}
                      </button>
                      {!locked && trip.status === "scheduled" && (
                        <button
                          className={styles.iconBtn}
                          title={t("trips.manager.start")}
                          disabled={actionLoading === `${trip.id}:start`}
                          onClick={() => postAction(trip.id, "start", {})}
                        >
                          <Play size={13} />
                        </button>
                      )}
                      {!locked && (
                        <button
                          className={styles.iconBtn}
                          title={t("trips.manager.delay")}
                          disabled={actionLoading === `${trip.id}:delay`}
                          onClick={() => handleDelay(trip)}
                        >
                          <AlertTriangle size={13} />
                        </button>
                      )}
                      {!locked && (
                        <button
                          className={`${styles.iconBtn} ${styles.iconDanger}`}
                          title={t("trips.manager.cancel")}
                          disabled={actionLoading === `${trip.id}:cancel`}
                          onClick={() => handleCancel(trip)}
                        >
                          <XCircle size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalTrip && (
        <DriverAssignModal
          tripId={modalTrip.id}
          currentDriverId={modalTrip.driverId}
          currentDriverName={modalTrip.driverName}
          currentConfirmationStatus={modalTrip.driverConfirmationStatus}
          onClose={() => setModalTrip(null)}
          onAssigned={async () => { setModalTrip(null); await fetchTrips(); }}
        />
      )}
    </div>
  );
}

export default function TripsManagerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <TripsManagerInner />
    </Suspense>
  );
}
