"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Clock, DollarSign, Search, TrendingDown, TrendingUp, Users, X, Ticket } from "lucide-react";
import { bookingService, type BookingDashboard, type Booking } from "@/services/bookings";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  en_route: "#8b5cf6",
  delayed: "#f59e0b",
  cancelled: "#dc2626",
  completed: "#059669",
};

function fmtShortMoney(n: number) {
  if (n == null) return "0";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
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
  const { lang, t: tr } = useLanguage();
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
      .catch((err) => setError((err as Error).message || tr("bookings.dashboard.loadError")))
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
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> {tr("bookings.dashboard.back")}</Link>
      <div className={styles.header}>
        <div>
          <h1>{tr("bookings.dashboard.title")}</h1>
          <p className={styles.subtitle}>
            {data ? <>{tr("bookings.dashboard.overviewFor")}{new Date(data.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</> : tr("bookings.dashboard.overviewFallback")}
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
            placeholder={tr("bookings.dashboard.searchPh")}
          />
          {searching && <span className={styles.searchHint}>{tr("bookings.dashboard.searching")}</span>}
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
                      {b.trip.route.origin || "—"} → {b.trip.route.destination || "—"} · {formatDate(b.trip.scheduledDate ? b.trip.scheduledDate + "T00:00:00" : null, lang)} {fmtTime(b.trip.scheduledStartTime)}
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
        <div className={styles.loading}>{tr("bookings.dashboard.loading")}</div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#eff6ff", color: "#2563eb" }}><ClipboardList size={20} /></div>
              <span className={styles.kpiLabel}>{tr("bookings.dashboard.todayBookings")}</span>
              <span className={styles.kpiValue}>{formatNumber(data.today.total, lang)}</span>
              <div className={styles.kpiBreakdown}>
                <span className={styles.breakItem} style={{ color: "#f59e0b" }}>{formatNumber(data.today.pending, lang)} {tr("bookings.dashboard.pendingW")}</span>
                <span className={styles.breakItem} style={{ color: "#059669" }}>{formatNumber(data.today.confirmed, lang)} {tr("bookings.dashboard.confirmedW")}</span>
                <span className={styles.breakItem} style={{ color: "#dc2626" }}>{formatNumber(data.today.cancelled, lang)} {tr("bookings.dashboard.cancelledW")}</span>
              </div>
              <span className={styles.kpiSub}><Users size={12} /> {formatNumber(data.today.passengers, lang)} {tr("bookings.dashboard.passengersW")}</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#fef2f2", color: "#dc2626" }}><TrendingDown size={20} /></div>
              <span className={styles.kpiLabel}>{tr("bookings.dashboard.cancelRate")}</span>
              <span className={styles.kpiValue}>{data.cancellationRate.overall}%</span>
              <span className={`${styles.kpiChange} ${data.cancellationRate.today > data.cancellationRate.overall ? styles.kpiDown : styles.kpiUp}`}>
                {tr("bookings.dashboard.todayW")} {data.cancellationRate.today}%
              </span>
              <span className={styles.kpiSub}>{tr("bookings.dashboard.allTime")}</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#ecfdf5", color: "#059669" }}><DollarSign size={20} /></div>
              <span className={styles.kpiLabel}>{tr("bookings.dashboard.revenueToday")}</span>
              <span className={styles.kpiValue}>{fmtShortMoney(data.revenue.today)}</span>
              <span className={`${styles.kpiChange} ${styles.kpiUp}`}><TrendingUp size={12} /> {formatCurrency(data.revenue.todayPaid, lang)} {tr("bookings.dashboard.collected")}</span>
              <span className={styles.kpiSub}>{tr("bookings.dashboard.bookedValue")}</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: "#faf5ff", color: "#8b5cf6" }}><CalendarDays size={20} /></div>
              <span className={styles.kpiLabel}>{tr("bookings.dashboard.revenue")}</span>
              <span className={styles.kpiValue}>{fmtShortMoney(data.revenue.thisWeek)}</span>
              <span className={`${styles.kpiChange} ${styles.kpiUp}`}><TrendingUp size={12} /> {tr("bookings.dashboard.weekW")} {fmtShortMoney(data.revenue.thisMonth)} {tr("bookings.dashboard.monthW")}</span>
              <span className={styles.kpiSub}>{tr("bookings.dashboard.weekVsMonth")}</span>
            </div>
          </div>

          {/* Revenue trend */}
          <div className={styles.grid2Col}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{tr("bookings.dashboard.revenueTrend")}</h2>
                  <p className={styles.cardSubtext}>{tr("bookings.dashboard.trendSub")}</p>
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
                  <h2 className={styles.cardTitle}>{tr("bookings.dashboard.snapshot")}</h2>
                  <p className={styles.cardSubtext}>{tr("bookings.dashboard.snapshotSub")}</p>
                </div>
              </div>
              <div className={styles.snapshotList}>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>{tr("bookings.dashboard.snapToday")}</span>
                  <span className={styles.snapshotValue}>{formatCurrency(data.revenue.today, lang)}</span>
                  <span className={styles.snapshotMeta}>{formatCurrency(data.revenue.todayPaid, lang)} {tr("bookings.dashboard.paidW")}</span>
                </div>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>{tr("bookings.dashboard.snapWeek")}</span>
                  <span className={styles.snapshotValue}>{formatCurrency(data.revenue.thisWeek, lang)}</span>
                </div>
                <div className={styles.snapshotRow}>
                  <span className={styles.snapshotLabel}>{tr("bookings.dashboard.snapMonth")}</span>
                  <span className={styles.snapshotValue}>{formatCurrency(data.revenue.thisMonth, lang)}</span>
                </div>
              </div>
              <div className={styles.refreshNote}>{tr("bookings.dashboard.refreshNote")}</div>
            </div>
          </div>

          {/* Channel breakdown — Phase 7.8 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{tr("bookings.dashboard.byChannel")}</h2>
                <p className={styles.cardSubtext}>{tr("bookings.dashboard.channelSub")}</p>
              </div>
            </div>
            {(!data.channelBreakdown || data.channelBreakdown.length === 0) ? (
              <div className={styles.empty}>{tr("bookings.dashboard.noChannel")}</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tr("bookings.dashboard.colChannel")}</th>
                      <th>{tr("bookings.dashboard.colBookings")}</th>
                      <th>{tr("bookings.dashboard.colShare")}</th>
                      <th>{tr("bookings.dashboard.colRevenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalCh = data.channelBreakdown.reduce((s: number, r: any) => s + r.count, 0) || 1;
                      const CHANNEL_COLORS: Record<string, string> = { internal: '#64748b', excel: '#059669', b2b_portal: '#0ea5e9', b2c_website: '#8b5cf6', cs_employee: '#f97316', whatsapp: '#22c55e' };
                      return data.channelBreakdown.map((ch: any) => {
                        const pct = Math.round((ch.count / totalCh) * 100);
                        const hex = CHANNEL_COLORS[ch.channel] || '#6b7280';
                        return (
                          <tr key={ch.channel}>
                            <td><span className={styles.statusBadge} style={{ color: hex, background: `${hex}18` }}>{ch.channel.replace('_',' ')}</span></td>
                            <td>{formatNumber(ch.count, lang)}</td>
                            <td>
                              <div className={styles.occBar}><div className={styles.occFill} style={{ width: `${pct}%`, background: hex }} /></div>
                              <span className={styles.occPct}>{pct}%</span>
                            </td>
                            <td>{formatCurrency(ch.revenue, lang)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming trips */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{tr("bookings.dashboard.upcoming")}</h2>
                <p className={styles.cardSubtext}>{tr("bookings.dashboard.upcomingSub")}</p>
              </div>
              <Link href="/dashboard/trips" className={styles.viewAll}>{tr("bookings.dashboard.viewAllTrips")}</Link>
            </div>
            {data.upcomingTrips.length === 0 ? (
              <div className={styles.empty}>{tr("bookings.dashboard.noUpcoming")}</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tr("bookings.dashboard.colDate")}</th>
                      <th>{tr("bookings.dashboard.colRoute")}</th>
                      <th>{tr("bookings.dashboard.colTime")}</th>
                      <th>{tr("bookings.dashboard.colBus")}</th>
                      <th>{tr("bookings.dashboard.colBookings")}</th>
                      <th>{tr("bookings.dashboard.colOcc")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingTrips.map((t) => {
                      const pct = t.capacity > 0 ? Math.min(100, Math.round((t.bookedSeats / t.capacity) * 100)) : 0;
                      const sc = STATUS_COLORS[t.status] || "#6b7280";
                      return (
                        <tr key={t.id}>
                          <td><span className={styles.tripDate}>{formatDate(t.scheduledDate ? t.scheduledDate + "T00:00:00" : null, lang)}</span></td>
                          <td>
                            <span className={styles.routeText}>{t.origin || "—"} → {t.destination || "—"}</span>
                            {t.routeName && <span className={styles.cellSub}>{t.routeName}</span>}
                          </td>
                          <td><span className={styles.timeCell}><Clock size={12} /> {fmtTime(t.scheduledStartTime)}</span></td>
                          <td>{t.busPlate || <span className={styles.cellSub}>—</span>}</td>
                          <td>
                            <span className={styles.bookingsCount}>{formatNumber(t.totalBookings, lang)}</span>
                            <span className={styles.cellSub}>{formatNumber(t.bookedSeats, lang)} {tr("bookings.dashboard.ofW")} {formatNumber(t.capacity, lang)} {tr("bookings.dashboard.seatsW")}</span>
                          </td>
                          <td>
                            <div className={styles.occBar}><div className={styles.occFill} style={{ width: `${pct}%`, background: sc }} /></div>
                            <span className={styles.occPct}>{pct}%</span>
                          </td>
                          <td>
                            <Link href={`/dashboard/trips/${t.id}`} className={styles.viewTripBtn}>{tr("bookings.dashboard.view")}</Link>
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
