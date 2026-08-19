"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Bus, Route } from "lucide-react";
import styles from "./DriverSchedule.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", en_route: "#059669", completed: "#6b7280",
  cancelled: "#dc2626", delayed: "#f59e0b",
};

const CONFIRM_COLORS: Record<string, string> = {
  accepted: "#059669", rejected: "#dc2626", pending: "#f59e0b",
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function startOfWeek(d: Date) {
  const c = new Date(d);
  const dow = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

interface Trip {
  id: string;
  routeName: string | null;
  origin: string | null;
  destination: string | null;
  busPlate: string | null;
  status: string | null;
  driverConfirmationStatus: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
}

export default function DriverScheduleView({ userId }: { userId: string }) {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const startDate = view === "day" ? toISODate(anchor) : toISODate(startOfWeek(anchor));
  const endDate = view === "day" ? toISODate(anchor) : toISODate(addDays(startOfWeek(anchor), 6));

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(
        `${API}/operations/drivers/schedule?driverId=${userId}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load schedule");
      setTrips(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load schedule");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  function navigate(dir: number) {
    setAnchor(view === "day" ? addDays(anchor, dir) : addDays(anchor, dir * 7));
  }

  function goToday() { setAnchor(new Date()); }

  const tripsByDate = trips.reduce<Record<string, Trip[]>>((acc, t) => {
    (acc[t.scheduledDate] = acc[t.scheduledDate] || []).push(t);
    return acc;
  }, {});

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const headerLabel =
    view === "day"
      ? anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${weekDates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  function renderTripCard(t: Trip) {
    return (
      <div key={t.id} className={styles.card} onClick={() => router.push(`/dashboard/trips/${t.id}`)}>
        <div className={styles.cardTime}>{fmtTime(t.scheduledStartTime)}</div>
        <div className={styles.cardBody}>
          <div className={styles.cardRoute}>
            <Route size={12} className={styles.cardIcon} />
            <span className={styles.cardRouteName}>{t.routeName || `${t.origin || "?"} → ${t.destination || "?"}`}</span>
          </div>
          {t.busPlate && (
            <div className={styles.cardMeta}><Bus size={11} /> {t.busPlate}</div>
          )}
        </div>
        <div className={styles.cardStatuses}>
          <span className={styles.statusText} style={{ color: STATUS_COLORS[t.status || ""] || "#6b7280" }}>{t.status || "—"}</span>
          {t.driverConfirmationStatus && (
            <span className={styles.confirmBadge} style={{ background: (CONFIRM_COLORS[t.driverConfirmationStatus] || "#6b7280") + "18", color: CONFIRM_COLORS[t.driverConfirmationStatus] || "#6b7280" }}>
              {t.driverConfirmationStatus}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${view === "day" ? styles.viewBtnActive : ""}`} onClick={() => setView("day")}>Day</button>
          <button className={`${styles.viewBtn} ${view === "week" ? styles.viewBtnActive : ""}`} onClick={() => setView("week")}>Week</button>
        </div>
        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate(-1)} title="Previous"><ChevronLeft size={15} /></button>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
          <button className={styles.navBtn} onClick={() => navigate(1)} title="Next"><ChevronRight size={15} /></button>
        </div>
        <span className={styles.headerLabel}>{headerLabel}</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.empty}>Loading schedule...</div>}

      {!loading && !error && view === "day" && (
        <div className={styles.dayList}>
          {(tripsByDate[startDate] || []).map(renderTripCard)}
          {!(tripsByDate[startDate] || []).length && (
            <div className={styles.empty}>
              <Clock size={20} />
              No trips scheduled for this day
            </div>
          )}
        </div>
      )}

      {!loading && !error && view === "week" && (
        <div className={styles.weekGrid}>
          {weekDates.map((d) => {
            const iso = toISODate(d);
            const dayTrips = tripsByDate[iso] || [];
            const today = toISODate(new Date()) === iso;
            return (
              <div key={iso} className={`${styles.weekCol} ${today ? styles.weekColToday : ""}`}>
                <div className={styles.weekColHeader}>
                  <span className={styles.weekDay}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  <span className={`${styles.weekDate} ${today ? styles.weekDateToday : ""}`}>{d.getDate()}</span>
                </div>
                <div className={styles.weekColBody}>
                  {dayTrips.length === 0 ? (
                    <span className={styles.weekEmpty}>—</span>
                  ) : (
                    dayTrips.map(renderTripCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
