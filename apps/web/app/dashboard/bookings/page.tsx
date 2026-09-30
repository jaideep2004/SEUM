"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ArrowRight, ChevronLeft, ChevronRight, ListOrdered, LayoutDashboard, Upload, Download } from "lucide-react";
import { bookingService, type Booking, BOOKING_CHANNELS } from "@/services/bookings";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  draft: "#8b5cf6",
  pending: "#f59e0b",
  pending_approval: "#f97316",
  approved: "#0ea5e9",
  planning: "#6366f1",
  assigned: "#0891b2",
  confirmed: "#059669",
  in_progress: "#eab308",
  completed: "#3b82f6",
  cancelled: "#dc2626",
  refunded: "#6b7280",
  rejected: "#dc2626",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "#dc2626",
  partial: "#f59e0b",
  paid: "#059669",
  refunded: "#6b7280",
};

const CHANNEL_COLORS: Record<string, string> = {
  internal: "#64748b",
  excel: "#059669",
  b2b_portal: "#0ea5e9",
  b2c_website: "#8b5cf6",
  cs_employee: "#f97316",
  whatsapp: "#22c55e",
};

function badgeColor(color: string, status: string) {
  const hex = STATUS_COLORS[status] || PAYMENT_COLORS[status] || CHANNEL_COLORS[status] || color;
  return { color: hex, background: `${hex}18` };
}

function channelLabel(ch: string | null | undefined) {
  if (!ch) return "internal";
  return ch.replace('_', ' ');
}

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function BookingsPage() {
  const { lang, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: "25" };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (paymentStatus) params.payment_status = paymentStatus;
      if (channel) params.channel = channel;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const result = await bookingService.list(params);
      setBookings(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch {}
    setLoading(false);
  }, [page, search, status, paymentStatus, channel, startDate, endDate]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  function resetFilters() {
    setSearch(""); setStatus(""); setPaymentStatus(""); setChannel(""); setStartDate(""); setEndDate(""); setPage(1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{t("bookings.list.title")}</h1>
          <p className={styles.subtitle}>{t("bookings.list.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/bookings/dashboard" className={styles.secondaryBtn}><LayoutDashboard size={15} /> {t("bookings.list.dashboard")}</Link>
          <Link href="/dashboard/bookings/import" className={styles.secondaryBtn}><Upload size={15} /> {t("bookings.list.excelImport")}</Link>
          <Link href="/dashboard/bookings/waitlist" className={styles.secondaryBtn}><ListOrdered size={15} /> {t("bookings.list.waitlist")}</Link>
          <Link href="/dashboard/bookings/new" className={styles.addBtn}><Plus size={15} /> {t("bookings.list.newBooking")}</Link>
        </div>
      </div>

      {/* Queue shortcuts — Phase 7.6 */}
      <div className={styles.queueTabs} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          className={styles.filterSelect}
          style={{ background: status === 'pending_approval' ? '#fff7ed' : undefined, borderColor: status === 'pending_approval' ? '#f97316' : undefined, color: status === 'pending_approval' ? '#c2410c' : undefined, fontWeight: 600 }}
          onClick={() => { setStatus('pending_approval'); setPage(1); }}
        >{t("bookings.list.pendingApproval")}</button>
        <button
          className={styles.filterSelect}
          style={{ background: status === 'approved' ? '#f0f9ff' : undefined, borderColor: status === 'approved' ? '#0ea5e9' : undefined, color: status === 'approved' ? '#0369a1' : undefined, fontWeight: 600 }}
          onClick={() => { setStatus('approved'); setPage(1); }}
        >{t("bookings.list.planningQueue")}</button>
        <button
          className={styles.filterSelect}
          style={{ background: status === '' ? '#f1f5f9' : undefined, fontWeight: status === '' ? 600 : 400 }}
          onClick={() => { setStatus(''); setPage(1); }}
        >{t("bookings.list.allBookings")}</button>
        {status && <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{t("bookings.list.filtered")} {status.replace('_', ' ')}</span>}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("bookings.list.searchPh")} />
        </div>
        <select className={styles.filterSelect} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t("bookings.list.allStatuses")}</option>
          <option value="draft">{t("bookings.list.stDraft")}</option>
          <option value="pending">{t("bookings.list.stPendingLegacy")}</option>
          <option value="pending_approval">{t("bookings.list.stPendingApproval")}</option>
          <option value="approved">{t("bookings.list.stApprovedQueue")}</option>
          <option value="planning">{t("bookings.list.stPlanning")}</option>
          <option value="assigned">{t("bookings.list.stAssigned")}</option>
          <option value="confirmed">{t("bookings.list.stConfirmed")}</option>
          <option value="in_progress">{t("bookings.list.stInProgress")}</option>
          <option value="completed">{t("bookings.list.stCompleted")}</option>
          <option value="cancelled">{t("bookings.list.stCancelled")}</option>
          <option value="refunded">{t("bookings.list.stRefunded")}</option>
        </select>
        <select className={styles.filterSelect} value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
          <option value="">{t("bookings.list.allPayments")}</option>
          <option value="unpaid">{t("bookings.list.payUnpaid")}</option>
          <option value="partial">{t("bookings.list.payPartial")}</option>
          <option value="paid">{t("bookings.list.payPaid")}</option>
          <option value="refunded">{t("bookings.list.payRefunded")}</option>
        </select>
        <select className={styles.filterSelect} value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
          <option value="">{t("bookings.list.allChannels")}</option>
          <option value="internal">{t("bookings.list.chInternal")}</option>
          <option value="excel">{t("bookings.list.chExcel")}</option>
          <option value="b2b_portal">{t("bookings.list.chB2b")}</option>
          <option value="b2c_website">{t("bookings.list.chB2c")}</option>
          <option value="cs_employee">{t("bookings.list.chCs")}</option>
          <option value="whatsapp">{t("bookings.list.chWhatsapp")}</option>
        </select>
        <input type="date" className={styles.filterSelect} value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} title={t("bookings.list.fromDate")} />
        <input type="date" className={styles.filterSelect} value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} title={t("bookings.list.toDate")} />
        {(search || status || paymentStatus || channel || startDate || endDate) && (
          <button className={styles.resetBtn} onClick={resetFilters}>{t("bookings.list.clear")}</button>
        )}
      </div>

      {loading ? <div className={styles.loading}>{t("bookings.list.loading")}</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("bookings.list.colReference")}</th>
                <th>{t("bookings.list.colCustomer")}</th>
                <th>{t("bookings.list.colRoute")}</th>
                <th>{t("bookings.list.colTripDate")}</th>
                <th>{t("bookings.list.colSeats")}</th>
                <th>{t("bookings.list.colAmount")}</th>
                <th>{t("bookings.list.colPayment")}</th>
                <th>{t("bookings.list.colStatus")}</th>
                <th>{t("bookings.list.colChannel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/dashboard/bookings/${b.id}`} className={styles.nameLink}>
                      <span className={styles.mono}>{b.bookingReference}</span>
                    </Link>
                    <div className={styles.cellSub}>{formatDate(b.bookingDate, lang)}</div>
                  </td>
                  <td>
                    <span className={styles.customerName}>{b.customer.name}</span>
                    {b.customer.isCompany && b.customer.companyName && (
                      <div className={styles.cellSub}>{b.customer.companyName}</div>
                    )}
                  </td>
                  <td>
                    <span>{b.trip.route.origin || "—"} → {b.trip.route.destination || "—"}</span>
                    {b.trip.route.name && <div className={styles.cellSub}>{b.trip.route.name}</div>}
                  </td>
                  <td>
                    <span>{formatDate(b.trip.scheduledDate, lang)}</span>
                    <div className={styles.cellSub}>{fmtTime(b.trip.scheduledStartTime)}</div>
                  </td>
                  <td>
                    <span>{formatNumber(b.numberOfPassengers, lang)}</span>
                    <div className={styles.cellSub}>{(b.seatNumbers || []).join(", ") || "—"}</div>
                  </td>
                  <td>
                    <span className={styles.money}>{formatCurrency(b.totalAmount, lang)}</span>
                    <div className={styles.cellSub}>{t("bookings.list.balance")} {formatCurrency(b.balance, lang)}</div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={badgeColor("#6b7280", b.paymentStatus)}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={badgeColor("#6b7280", b.status)}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={badgeColor("#6b7280", (b as any).channel || 'internal')}>
                      {channelLabel((b as any).channel)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/bookings/${b.id}`} className={styles.iconBtn} title={t("bookings.list.viewBooking")}>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={10} className={styles.emptyState}>{t("bookings.list.empty")}</td></tr>
              )}
            </tbody>
          </table>

          {total > 0 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>{formatNumber(total, lang)} {t("bookings.list.countUnit")} — {t("bookings.list.page")} {formatNumber(page, lang)} {t("bookings.list.of")} {formatNumber(totalPages, lang)}</span>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /> {t("bookings.list.prev")}</button>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("bookings.list.next")} <ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
