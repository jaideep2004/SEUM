"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Bus } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  active: "#10b981",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(
          `${API}/fleet/assignments/calendar?month=${month}&year=${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) setAssignments(data.data);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group assignments by bus
  const busMap = new Map<string, any[]>();
  for (const a of assignments) {
    const key = a.busId;
    if (!busMap.has(key)) busMap.set(key, []);
    busMap.get(key)!.push(a);
  }

  // Sort buses by plate number
  const busEntries = Array.from(busMap.entries()).sort(([, a], [, b]) =>
    (a[0].plateNumber || "").localeCompare(b[0].plateNumber || "")
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bus Calendar</h1>
          <p className={styles.pageDesc}>Monthly view of bus assignments</p>
        </div>
        <div className={styles.monthNav}>
          <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={18} /></button>
          <span className={styles.monthLabel}>{MONTHS[month - 1]} {year}</span>
          <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} /> Loading calendar...</div>
      ) : busEntries.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={48} style={{ opacity: 0.3 }} />
          <p>No assignments for this month.</p>
        </div>
      ) : (
        <div className={styles.calendarWrap}>
          {/* Day headers */}
          <div className={styles.calendarGrid}>
            <div className={styles.busLabelCol} />
            {Array.from({ length: daysInMonth }, (_, i) => (
              <div key={i} className={styles.dayHeader}>
                <span className={styles.dayName}>{DAYS[(firstDay + i) % 7]}</span>
                <span className={styles.dayNum}>{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Bus rows */}
          {busEntries.map(([busId, busAssignments]) => {
            const first = busAssignments[0];
            return (
              <div key={busId} className={styles.calendarGrid}>
                <div className={styles.busLabelCol}>
                  <span className={styles.plateNumber}>{first.plateNumber || busId.slice(0, 8)}</span>
                  <span className={styles.busModel}>{first.busMake} {first.busModel}</span>
                </div>
                {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayIdx + 1).padStart(2, "0")}`;
                  const dayAssignments = busAssignments.filter((a: any) => {
                    const start = a.startDate;
                    const end = a.endDate || a.startDate;
                    return dateStr >= start && dateStr <= end;
                  });

                  return (
                    <div key={dayIdx} className={styles.dayCell}>
                      {dayAssignments.map((a: any) => (
                        <div
                          key={a.id}
                          className={styles.tripBlock}
                          style={{ background: STATUS_COLORS[a.status] || "#3b82f6" }}
                          title={`${a.routeName || "No route"} (${a.status})`}
                        >
                          {a.routeName || "—"}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
