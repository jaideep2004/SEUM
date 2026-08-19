"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Clock, DollarSign, Search, TrendingDown, TrendingUp, Users, X, Ticket } from "lucide-react";
import { bookingService, type BookingDashboard, type Booking } from "@/services/bookings";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  en_route: "#8b5cf6",
  delayed: "#f59e0b",
  cancelled: "#dc2626",
  completed: "#059669",
};

function fmtMoney(n: number) {
  if (n == null) return "SAR 0.00";
  const v = Math.round(n * 100) / 100;
  return `SAR ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShortMoney(n: number) {
  if (n == null) return "0";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function BookingDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<BookingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Booking[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bookingService.dashboard()
      .then(setData)
      .catch((err) => setError((err as Error).message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await bookingService.list({ search: q.trim(), page: "1", pageSize: "8" });
      setResults(r.data);
      setSearchOpen(true);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const trend = data?.revenueTrend || [];
  const maxTrend = Math.max(1, ...trend.map((d) => d.revenue));

  return (
    <div className={styles.page}>
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> Bookings</Link>
      <div className={styles.header}>
        <div>
          <h1>Booking Dashboard</h1>
          <p className={styles.subtitle}>
            {data ? `Overview for ${new Date(data.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}` : "Bookings overview."}
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Global customer / booking search */}
      <div className={styles.searchWrap} ref={searchRef}>
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings by customer name, phone, ID or reference..."
          />
          {searching && <span className={styles.searchHint}>Searching…</span>}
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => { setQuery(""); setResults([]); }}>
              <X size={14} />
            </button>
          )}
        </div>
        {searchOpen && results.length > 0 && (
          <ul className={styles.resultsList}>
            {results.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => router.push(`/dashboard/bookings/${b.id}`)}>
                  <span className={styles.resultIcon}><Ticket size={14} /></span>
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>{b.customer.name} · <span className={styles.mono}>{b.bookingReference}</span></span>
                    <span className={styles.resultMeta}>
                      {b.trip.route.origin || "—"} → {b.trip.route.destination || "—"} · {fmtDate(b.trip.scheduledDate)} {fmtTime(b.trip.scheduledStartTime)}
                      {b.customer.phone ? ` · ${b.customer.phone}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading dashboard...</div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#eff6ff", color: "#2563eb" }}><ClipboardList size={20} /></div>
              <span className={styles.kpiLabel}>Today's Bookings</span>
              <span className={styles.kpiValue}>{data.today.total}</span>
              <div className={styles.kpiBreakdown}>
                <span className={styles.breakItem} style={{ color: "#f59e0b" }}>{data.today.pending} pending</span>
                <span className={styles.breakItem} style={{ color: "#059669" }}>{data.today.confirmed} confirmed</span>
                <span className={styles.breakItem} style={{ color: "#dc2626" }}>{data.today.cancelled} cancelled</span>
              </div>
              <span className={styles.kpiSub}><Users size={12} /> {data.today.passengers} passengers</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#fef2f2", color: "#dc2626" }}><TrendingDown size={20} /></div>
              <span className={styles.kpiLabel}>Cancellation Rate</span>
              <span className={styles.kpiValue}>{data.cancellationRate.overall}%</span>
              <span className={`${styles.kpiChange} ${data.cancellationRate.today > data.cancellationRate.overall ? styles.kpiDown : styles.kpiUp}`}>
                Today {data.cancellationRate.today}%
              </span>
              <span className={styles.kpiSub}>All-time average</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#ecfdf5", color: "#059669" }}><DollarSign size={20} /></div>
              <span className={styles.kpiLabel}>Revenue Today</span>
              <span className={styles.kpiValue}>{fmtShortMoney(data.revenue.today)}</span>
              <span className={`${styles.kpiChange} ${styles.kpiUp}`}><TrendingUp size={12} /> {fmtMoney(data.revenue.todayPaid)} collected</span>
              <span className={styles.kpiSub}>Booked value</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#faf5ff", color: "#8b5cf6" }}><CalendarDays size={20} /></div>
              <span className={styles.kpiLabel}>Revenue</span>
              <span className={styles.kpiValue}>{fmtShortMoney(data.revenue.thisWeek)}</span>
              <span className={`${styles.kpiChange} ${styles.kpiUp}`}><TrendingUp size={12} /> week · {fmtShortMoney(data.revenue.thisMonth)} month</span>
              <span className={styles.kpiSub}>This week vs this month</span>
            </div>
          </div>

          {/* Revenue trend */}
          <div className={styles.grid2Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Revenue Trend</h2>
                  <p className={styles.cardSubtext}>Last 14 days · booked value (SAR)</p>
                </div>
              </div>
              {trend.length > 0 && (
                <div className={styles.barChart}>
                  {trend.map((d, i) => (
                    <div key={d.day} className={styles.barCol}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ height: `${Math.max(4, (d.revenue / maxTrend) * 100)}%` }}
                        />
                      </div>
                      <span className={styles.barLabel}>
                        {new Date(d.day + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit" })}
                      </span>
                      <span className={styles.barTooltip}>{fmtShortMoney(d.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Revenue Snapshot</h2>
                  <p className={styles.cardSubtext}>Booked value, excluding cancellations</p>
                </div>
              </div>
              <div className={styles.snapshotList}>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>Today</span>
                  <span className={styles.snapshotValue}>{fmtMoney(data.revenue.today)}</span>
                  <span className={styles.snapshotMeta}>{fmtMoney(data.revenue.todayPaid)} paid</span>
                </div>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>This week</span>
                  <span className={styles.snapshotValue}>{fmtMoney(data.revenue.thisWeek)}</span>
                </div>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>This month</span>
                  <span className={styles.snapshotValue}>{fmtMoney(data.revenue.thisMonth)}</span>
                </div>
              </div>
              <div className={styles.refreshNote}>Numbers refresh on each page load.</div>
            </div>
          </div>

          {/* Upcoming trips */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Upcoming Trips</h2>
                <p className={styles.cardSubtext}>Trips with booking occupancy</p>
              </div>
              <Link href="/dashboard/trips" className={styles.viewAll}>View all trips</Link>
            </div>
            {data.upcomingTrips.length === 0 ? (
              <div className={styles.empty}>No upcoming trips scheduled.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Route</th>
                      <th>Time</th>
                      <th>Bus</th>
                      <th>Bookings</th>
                      <th>Occupancy</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingTrips.map((t) => {
                      const pct = t.capacity > 0 ? Math.min(100, Math.round((t.bookedSeats / t.capacity) * 100)) : 0;
                      const sc = STATUS_COLORS[t.status] || "#6b7280";
                      return (
                        <tr key={t.id}>
                          <td><span className={styles.tripDate}>{fmtDate(t.scheduledDate)}</span></td>
                          <td>
                            <span className={styles.routeText}>{t.origin || "—"} → {t.destination || "—"}</span>
                            {t.routeName && <span className={styles.cellSub}>{t.routeName}</span>}
                          </td>
                          <td><span className={styles.timeCell}><Clock size={12} /> {fmtTime(t.scheduledStartTime)}</span></td>
                          <td>{t.busPlate || <span className={styles.cellSub}>—</span>}</td>
                          <td>
                            <span className={styles.bookingsCount}>{t.totalBookings}</span>
                            <span className={styles.cellSub}>{t.bookedSeats} of {t.capacity} seats</span>
                          </td>
                          <td>
                            <div className={styles.occBar}><div className={styles.occFill} style={{ width: `${pct}%`, background: sc }} /></div>
                            <span className={styles.occPct}>{pct}%</span>
                          </td>
                          <td>
                            <Link href={`/dashboard/trips/${t.id}`} className={styles.viewTripBtn}>View</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}