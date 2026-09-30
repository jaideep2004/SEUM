"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, User, Building2, Clock, Hourglass, RefreshCw, LayoutDashboard } from "lucide-react";
import { waitlistService, tripService, type WaitlistEntry, type TripSummary } from "@/services/bookings";
import { useLanguage, formatDate, formatNumber, formatDateTime } from "@/lib/i18n";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  waiting: "#f59e0b",
  offered: "#059669",
  converted: "#3b82f6",
  expired: "#6b7280",
};

function statusColor(status: string) {
  const hex = STATUS_COLORS[status] || "#6b7280";
  return { color: hex, background: `${hex}18` };
}

function waitTime(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function WaitlistPage() {
  const { lang, t: tr } = useLanguage();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [tripId, setTripId] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");

  function offerCountdown(expiresAt: string | null) {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return tr("bookings.waitlist.offerExpired");
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return `${formatNumber(hours, lang)}h ${formatNumber(mins, lang)}m ${tr("bookings.waitlist.leftW")}`;
  }

  useEffect(() => {
    tripService.bookable({ pageSize: "100" })
      .then((r) => {
        const sorted = [...r.data].sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));
        setTrips(sorted);
      })
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, []);

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: "1", pageSize: "100" };
      if (tripId) params.trip_id = tripId;
      if (status) params.status = status;
      const result = await waitlistService.list(params);
      setEntries(result.data);
      setTotal(result.meta.total);
    } catch {}
    setLoading(false);
  }, [tripId, status]);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  async function handleExpireOffers() {
    setNotice("");
    try {
      await waitlistService.expireOffers();
      setNotice(tr("bookings.waitlist.expired"));
      fetchWaitlist();
    } catch (err) {
      setNotice((err as Error).message || tr("bookings.waitlist.expireFailed"));
    }
  }

  const tripsById = new Map(trips.map((t) => [t.id, t]));

  return (
    <div className={styles.page}>
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> {tr("bookings.waitlist.back")}</Link>
      <div className={styles.header}>
        <div>
          <h1>{tr("bookings.waitlist.title")}</h1>
          <p className={styles.subtitle}>{tr("bookings.waitlist.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/bookings/dashboard" className={styles.secondaryBtn}><LayoutDashboard size={14} /> {tr("bookings.waitlist.dashboard")}</Link>
          <button className={styles.secondaryBtn} onClick={handleExpireOffers} title={tr("bookings.waitlist.expireTitle")}>
            <RefreshCw size={14} /> {tr("bookings.waitlist.expireBtn")}
          </button>
        </div>
      </div>

      {notice && <div className={styles.notice}>{notice}</div>}

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={tripId}
          onChange={(e) => { setTripId(e.target.value); setNotice(""); }}
        >
          <option value="">{tr("bookings.waitlist.allTrips")}</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.origin || "—"} → {t.destination || "—"} · {t.scheduledDate} {t.scheduledStartTime || ""}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{tr("bookings.list.allStatuses")}</option>
          <option value="waiting">{tr("bookings.waitlist.stWaiting")}</option>
          <option value="offered">{tr("bookings.waitlist.stOffered")}</option>
          <option value="converted">{tr("bookings.waitlist.stConverted")}</option>
          <option value="expired">{tr("bookings.waitlist.stExpired")}</option>
        </select>
      </div>

      {tripsLoading && !tripId ? (
        <div className={styles.loading}>{tr("bookings.waitlist.loadingTrips")}</div>
      ) : loading ? (
        <div className={styles.loading}>{tr("bookings.waitlist.loading")}</div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>
          {tripId
            ? <>{tr("bookings.waitlist.emptyForA")}{tripsById.get(tripId)?.origin || "—"} → {tripsById.get(tripId)?.destination || "—"}{tr("bookings.waitlist.emptyForB")}</>
            : tr("bookings.waitlist.empty")}
        </div>
      ) : (
        <>
          <div className={styles.summary}>{formatNumber(total, lang)} {total === 1 ? tr("bookings.waitlist.entrySingular") : tr("bookings.waitlist.entryPlural")}</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{tr("bookings.waitlist.colTrip")}</th>
                  <th>{tr("bookings.waitlist.colCustomer")}</th>
                  <th>{tr("bookings.waitlist.colSeats")}</th>
                  <th>{tr("bookings.waitlist.colWait")}</th>
                  <th>{tr("bookings.waitlist.colStatus")}</th>
                  <th>{tr("bookings.waitlist.colOffered")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const sc = statusColor(e.status);
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className={styles.routeText}>{e.trip.origin || "—"} → {e.trip.destination || "—"}</span>
                        {e.trip.scheduledDate && (
                          <span className={styles.routeMeta}>{formatDate(e.trip.scheduledDate, lang)} {e.trip.scheduledStartTime || ""}</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.customerCell}>
                          <span className={styles.customerIcon}>
                            {e.customer.name ? <User size={13} /> : <Building2 size={13} />}
                          </span>
                          <span className={styles.customerText}>
                            <span className={styles.customerName}>{e.customer.name}</span>
                            {e.customer.phone && <span className={styles.routeMeta}>{e.customer.phone}</span>}
                          </span>
                        </span>
                      </td>
                      <td><span className={styles.seatCount}>{formatNumber(e.numberOfPassengers, lang)}</span></td>
                      <td>
                        <span className={styles.waitCell}>
                          <Clock size={12} />
                          {waitTime(e.createdAt)}
                        </span>
                        <span className={styles.routeMeta}>{tr("bookings.waitlist.since")} {formatDateTime(e.createdAt, lang)}</span>
                      </td>
                      <td>
                        <span className={styles.badge} style={sc}>{e.status}</span>
                        {e.status === "offered" && (
                          <span className={styles.offerCountdown}>
                            <Hourglass size={11} /> {offerCountdown(e.offerExpiresAt)}
                          </span>
                        )}
                      </td>
                      <td>
                        {e.status === "offered" ? formatDateTime(e.offeredAt, lang) : e.status === "converted" && e.convertedBookingId ? (
                          <Link href={`/dashboard/bookings/${e.convertedBookingId}`} className={styles.bookingLink}>
                            {tr("bookings.waitlist.viewBooking")}
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
