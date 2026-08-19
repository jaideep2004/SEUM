"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ArrowRight, ChevronLeft, ChevronRight, ListOrdered, LayoutDashboard } from "lucide-react";
import { bookingService, type Booking } from "@/services/bookings";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#059669",
  cancelled: "#dc2626",
  completed: "#3b82f6",
  refunded: "#6b7280",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "#dc2626",
  partial: "#f59e0b",
  paid: "#059669",
  refunded: "#6b7280",
};

function badgeColor(color: string, status: string) {
  const hex = STATUS_COLORS[status] || PAYMENT_COLORS[status] || color;
  return { color: hex, background: `${hex}18` };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n: number | null) {
  return n == null ? "—" : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: "25" };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (paymentStatus) params.payment_status = paymentStatus;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const result = await bookingService.list(params);
      setBookings(result.data);
      setTotalPages(result.meta.totalPages);
      setTotal(result.meta.total);
    } catch {}
    setLoading(false);
  }, [page, search, status, paymentStatus, startDate, endDate]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  function resetFilters() {
    setSearch(""); setStatus(""); setPaymentStatus(""); setStartDate(""); setEndDate(""); setPage(1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Bookings</h1>
          <p className={styles.subtitle}>Manage passenger bookings across trips.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/bookings/dashboard" className={styles.secondaryBtn}><LayoutDashboard size={15} /> Dashboard</Link>
          <Link href="/dashboard/bookings/waitlist" className={styles.secondaryBtn}><ListOrdered size={15} /> Waitlist</Link>
          <Link href="/dashboard/bookings/new" className={styles.addBtn}><Plus size={15} /> New Booking</Link>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search reference, customer, route..." />
        </div>
        <select className={styles.filterSelect} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <select className={styles.filterSelect} value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
          <option value="">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <input type="date" className={styles.filterSelect} value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} title="From date" />
        <input type="date" className={styles.filterSelect} value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} title="To date" />
        {(search || status || paymentStatus || startDate || endDate) && (
          <button className={styles.resetBtn} onClick={resetFilters}>Clear</button>
        )}
      </div>

      {loading ? <div className={styles.loading}>Loading bookings...</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Trip date</th>
                <th>Seats</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
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
                    <div className={styles.cellSub}>{fmtDate(b.bookingDate)}</div>
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
                    <span>{fmtDate(b.trip.scheduledDate)}</span>
                    <div className={styles.cellSub}>{fmtTime(b.trip.scheduledStartTime)}</div>
                  </td>
                  <td>
                    <span>{b.numberOfPassengers}</span>
                    <div className={styles.cellSub}>{(b.seatNumbers || []).join(", ") || "—"}</div>
                  </td>
                  <td>
                    <span className={styles.money}>{fmtMoney(b.totalAmount)}</span>
                    <div className={styles.cellSub}>Balance {fmtMoney(b.balance)}</div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={badgeColor("#6b7280", b.paymentStatus)}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={badgeColor("#6b7280", b.status)}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/bookings/${b.id}`} className={styles.iconBtn} title="View booking">
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={9} className={styles.emptyState}>No bookings found — create one to get started.</td></tr>
              )}
            </tbody>
          </table>

          {total > 0 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>{total} bookings — Page {page} of {totalPages}</span>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
