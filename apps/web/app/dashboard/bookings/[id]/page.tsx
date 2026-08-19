"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, Building2, CalendarDays, Clock, Route as RouteIcon,
  Bus, Armchair, Download, CheckCircle2, XCircle, RotateCcw, X, User, Send, MailX, MailCheck,
} from "lucide-react";
import { bookingService, downloadBookingTicket, type Booking, type CommunicationLogEntry, type CommunicationType } from "@/services/bookings";
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

const COMM_TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmation",
  receipt: "Payment receipt",
  refund: "Refund receipt",
  cancellation: "Cancellation",
  reminder: "Trip reminder",
  delay_alert: "Delay alert",
};

function statusStyle(map: Record<string, string>, status: string) {
  const hex = map[status] || "#6b7280";
  return { color: hex, background: `${hex}18` };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n: number | null) {
  return n == null ? "—" : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [acting, setActing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [communications, setCommunications] = useState<CommunicationLogEntry[]>([]);
  const [commLoading, setCommLoading] = useState(false);
  const [sendingType, setSendingType] = useState<CommunicationType | null>(null);

  useEffect(() => {
    bookingService.get(params.id)
      .then(setBooking)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const fetchCommunications = useCallback(async (bookingId: string) => {
    setCommLoading(true);
    try {
      setCommunications(await bookingService.communications(bookingId));
    } catch {}
    setCommLoading(false);
  }, []);

  useEffect(() => {
    if (params.id) fetchCommunications(params.id);
  }, [params.id, fetchCommunications]);

  async function sendManual(type: string) {
    setActionError(""); setActionMsg("");
    setSendingType(type as CommunicationType);
    try {
      const r = await bookingService.resendCommunication(params.id, type as CommunicationType);
      if (r.sent) {
        setActionMsg(`Email sent — ${COMM_TYPE_LABELS[type]} delivered.`);
      } else {
        setActionError(`Email failed (${r.reason || "unknown"}). Check customer email and SMTP settings.`);
      }
      fetchCommunications(params.id);
    } catch (err) {
      setActionError((err as Error).message || "Failed to send email");
    }
    setSendingType(null);
  }

  async function sendManualDelay() {
    setActionError(""); setActionMsg("");
    setSendingType("delay_alert");
    try {
      const r = await bookingService.sendTripDelayAlert(booking!.trip.id, {
        delay_minutes: 0,
        delay_reason: "Manual alert",
      });
      setActionMsg(`Delay alert sent to ${r.sent} passenger${r.sent === 1 ? "" : "s"} on this trip.`);
      fetchCommunications(booking!.id);
    } catch (err) {
      setActionError((err as Error).message || "Failed to send delay alert");
    }
    setSendingType(null);
  }

  async function runAction(action: () => Promise<Booking>, successMsg: string) {
    setActionError(""); setActionMsg(""); setActing(true);
    try {
      const updated = await action();
      setBooking(updated);
      setActionMsg(successMsg);
    } catch (err) {
      setActionError((err as Error).message);
    }
    setActing(false);
  }

  function confirmBooking() {
    runAction(() => bookingService.confirm(params.id), "Booking confirmed.");
  }

  function submitCancel() {
    if (!cancelReason.trim()) { setActionError("A cancellation reason is required."); return; }
    setActionError("");
    setCancelOpen(false);
    runAction(() => bookingService.cancel(params.id, cancelReason.trim()), "Booking cancelled.");
  }

  function refundBooking() {
    if (!window.confirm("Refund this booking? Paid amount will be returned and the booking marked as refunded.")) return;
    runAction(() => bookingService.refund(params.id), "Booking refunded.");
  }

  async function downloadTicket() {
    if (!booking) return;
    setDownloading(true);
    setActionError("");
    try {
      await downloadBookingTicket(booking.id, `${booking.bookingReference}.pdf`);
    } catch (err) {
      setActionError((err as Error).message);
    }
    setDownloading(false);
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading booking...</div></div>;
  if (error || !booking) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>{error || "Booking not found"}</div>
        <Link href="/dashboard/bookings" className={styles.backBtn}><ArrowLeft size={14} /> Back to Bookings</Link>
      </div>
    );
  }

  const canConfirm = booking.status === "pending";
  const canCancel = ["pending", "confirmed"].includes(booking.status);
  const canRefund = ["confirmed", "cancelled"].includes(booking.status);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> Bookings</Link>

      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.monoRef}>{booking.bookingReference}</h1>
            <span className={styles.statusBadge} style={statusStyle(STATUS_COLORS, booking.status)}>{booking.status}</span>
            <span className={styles.statusBadge} style={statusStyle(PAYMENT_COLORS, booking.paymentStatus)}>payment: {booking.paymentStatus}</span>
          </div>
          <p className={styles.subtitle}>Booked {fmtDate(booking.bookingDate)} · {booking.numberOfPassengers} passenger{booking.numberOfPassengers === 1 ? "" : "s"}</p>
        </div>
        <div className={styles.actions}>
          {canConfirm && (
            <button className={styles.actionBtn} onClick={confirmBooking} disabled={acting}>
              <CheckCircle2 size={14} /> Confirm
            </button>
          )}
          {canCancel && (
            <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => { setActionError(""); setCancelOpen(true); }} disabled={acting}>
              <XCircle size={14} /> Cancel
            </button>
          )}
          {canRefund && (
            <button className={styles.actionBtn} onClick={refundBooking} disabled={acting}>
              <RotateCcw size={14} /> Refund
            </button>
          )}
          <button className={styles.actionBtn} onClick={downloadTicket} disabled={downloading}>
            <Download size={14} /> {downloading ? "Downloading..." : "Ticket PDF"}
          </button>
        </div>
      </div>

      {actionError && <div className={styles.error}>{actionError}</div>}
      {actionMsg && <div className={styles.success}>{actionMsg}</div>}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><User size={14} /> Customer</h2>
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name</span>
              <span className={styles.detailValue}>
                {booking.customer.name}
                {booking.customer.isCompany && <span className={styles.companyTag}><Building2 size={11} /> {booking.customer.companyName}</span>}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}><Phone size={12} /> {booking.customer.phone || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}><Mail size={12} /> {booking.customer.email || "—"}</span>
            </div>
            <Link href={`/dashboard/customers/${booking.customer.id}`} className={styles.customerLink}>View customer profile →</Link>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Bus size={14} /> Trip</h2>
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Route</span>
              <span className={styles.detailValue}>
                <RouteIcon size={12} /> {booking.trip.route.origin || "—"} → {booking.trip.route.destination || "—"}
              </span>
            </div>
            {booking.trip.route.name && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Route name</span>
                <span className={styles.detailValue}>{booking.trip.route.name}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}><CalendarDays size={12} /> {fmtDate(booking.trip.scheduledDate)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}><Clock size={12} /> {fmtTime(booking.trip.scheduledStartTime)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Bus</span>
              <span className={styles.detailValue}>
                <Armchair size={12} /> {booking.trip.busPlate || "—"}
                {booking.trip.busMake ? ` (${booking.trip.busMake} ${booking.trip.busModel || ""})` : ""}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Trip status</span>
              <span className={`${styles.detailValue} ${styles.tripStatus}`}>{booking.trip.status || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Seats</span>
              <span className={styles.detailValue}>
                {booking.seatNumbers.length > 0 ? booking.seatNumbers.map((s) => <span key={s} className={styles.seatChip}>#{s}</span>) : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Passengers ({booking.passengers?.length || 0})</h2>
        {booking.passengers && booking.passengers.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Seat</th><th>Name</th><th>ID Number</th><th>Age</th><th>Special Requirements</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p) => (
                <tr key={p.id}>
                  <td className={styles.seatCell}>{p.seatNumber ? `#${p.seatNumber}` : "—"}</td>
                  <td className={styles.passengerName}>{p.passengerName}</td>
                  <td>{p.idNumber || "—"}</td>
                  <td>{p.age || "—"}</td>
                  <td>{p.specialRequirements || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyText}>No passenger details recorded.</p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Payment</h2>
        <div className={styles.paymentGrid}>
          <div className={styles.paymentItem}>
            <span className={styles.paymentLabel}>Total</span>
            <span className={styles.paymentValue}>{fmtMoney(booking.totalAmount)}</span>
          </div>
          <div className={styles.paymentItem}>
            <span className={styles.paymentLabel}>Paid</span>
            <span className={styles.paymentValue}>{fmtMoney(booking.paidAmount)}</span>
          </div>
          <div className={`${styles.paymentItem} ${styles.paymentBalance}`}>
            <span className={styles.paymentLabel}>Balance</span>
            <span className={styles.paymentValue}>{fmtMoney(booking.balance)}</span>
          </div>
        </div>
        {booking.notes && (
          <div className={styles.notes}>
            <span className={styles.detailLabel}>Notes</span>
            <p className={styles.notesText}>{booking.notes}</p>
          </div>
        )}
        {booking.cancelReason && (
          <div className={`${styles.notes} ${styles.cancelNote}`}>
            <span className={styles.detailLabel}>Cancellation reason</span>
            <p className={styles.notesText}>{booking.cancelReason}</p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.commHeader}>
          <div>
            <h2 className={styles.cardTitle}><Send size={14} /> Communication Log</h2>
            <p className={styles.commSub}>Emails sent to {booking.customer.email || "the customer"} · to: {booking.customer.email || "—"}</p>
          </div>
          <div className={styles.commActions}>
            <button className={styles.actionBtn} onClick={() => sendManual("confirmation")} disabled={!!sendingType}>
              <MailCheck size={13} /> {sendingType === "confirmation" ? "Sending..." : "Resend confirmation"}
            </button>
            <button className={styles.actionBtn} onClick={() => sendManual("receipt")} disabled={!!sendingType}>
              <Mail size={13} /> {sendingType === "receipt" ? "Sending..." : "Send receipt"}
            </button>
            <button className={styles.actionBtn} onClick={() => sendManual("reminder")} disabled={!!sendingType}>
              <Send size={13} /> {sendingType === "reminder" ? "Sending..." : "Send reminder"}
            </button>
            <button className={styles.actionBtn} onClick={sendManualDelay} disabled={!!sendingType}>
              <Clock size={13} /> {sendingType === "delay_alert" ? "Sending..." : "Send delay alert"}
            </button>
          </div>
        </div>

        {commLoading ? (
          <p className={styles.emptyText}>Loading communication log...</p>
        ) : communications.length === 0 ? (
          <p className={styles.emptyText}>No emails sent for this booking yet. Auto-emails: confirmation on booking, receipt on payment, cancellation, and 24h trip reminders.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th><th>To</th><th>Subject</th><th>Status</th><th>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {communications.map((c) => (
                <tr key={c.id}>
                  <td className={styles.commType}>{COMM_TYPE_LABELS[c.type] || c.type}</td>
                  <td>{c.recipientEmail}</td>
                  <td className={styles.commSubject}>
                    {c.subject}
                    {c.status === "failed" && c.errorMessage && (
                      <span className={styles.commError}>{c.errorMessage}</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.commStatus} ${styles[c.status]}`}>
                      {c.status === "sent" ? <MailCheck size={12} /> : <MailX size={12} />} {c.status}
                    </span>
                  </td>
                  <td className={styles.commDate}>{fmtDate(c.createdAt)} {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {cancelOpen && (
        <div className={styles.modalOverlay} onClick={() => setCancelOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>Cancel Booking</h2>
              <button className={styles.iconBtn} onClick={() => setCancelOpen(false)}><X size={16} /></button>
            </div>
            <p className={styles.modalText}>Confirm cancellation of <span className={styles.monoInline}>{booking.bookingReference}</span>? A reason is required.</p>
            <div className={styles.field}>
              <label>Reason *</label>
              <textarea rows={4} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer request, trip cancelled..." autoFocus />
            </div>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setCancelOpen(false)}>Keep Booking</button>
              <button type="button" className={`${styles.primaryBtn} ${styles.dangerPrimary}`} onClick={submitCancel} disabled={acting}>
                {acting ? "Cancelling..." : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
