"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, Building2, CalendarDays, Clock, Route as RouteIcon,
  Bus, Armchair, Download, CheckCircle2, XCircle, RotateCcw, X, User, Send, MailX, MailCheck,
  ShieldCheck, FileText, History, Edit3, Save, AlertTriangle, Clock3, Check,
} from "lucide-react";
import { bookingService, downloadBookingTicket, type Booking, type CommunicationLogEntry, type CommunicationType, type BookingHistoryEntry } from "@/services/bookings";
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

const COMM_TYPE_KEYS: Record<string, string> = {
  confirmation: "bookings.detail.commConfirmation",
  receipt: "bookings.detail.commReceipt",
  refund: "bookings.detail.commRefund",
  cancellation: "bookings.detail.commCancellation",
  reminder: "bookings.detail.commReminder",
  delay_alert: "bookings.detail.commDelay",
};

function statusStyle(map: Record<string, string>, status: string) {
  const hex = map[status] || "#6b7280";
  return { color: hex, background: `${hex}18` };
}

function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function getUserRoles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("seum_user");
    if (!stored) return [];
    const u = JSON.parse(stored);
    return u.roles || [];
  } catch { return []; }
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const { lang, t } = useLanguage();
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

  // Phase 7.6: approval workflow
  const [history, setHistory] = useState<BookingHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    setUserRoles(getUserRoles());
  }, []);

  const isSupervisor = userRoles.some((r) => ["company_admin", "operations_manager", "super_admin"].includes(r));
  const isPlanning = userRoles.some((r) => ["operations_manager", "fleet_manager", "company_admin", "super_admin"].includes(r));

  useEffect(() => {
    bookingService.get(params.id)
      .then((b) => {
        setBooking(b);
        setEditPrice(String(b.totalAmount ?? ""));
        setEditInvoice(b.invoiceReference || "");
      })
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

  const fetchHistory = useCallback(async (bookingId: string) => {
    setHistoryLoading(true);
    try {
      const h = await bookingService.history(bookingId);
      setHistory(h);
    } catch {}
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchCommunications(params.id);
      fetchHistory(params.id);
    }
  }, [params.id, fetchCommunications, fetchHistory]);

  useEffect(() => {
    if (booking) {
      setEditPrice(String(booking.totalAmount ?? ""));
      setEditInvoice(booking.invoiceReference || "");
    }
  }, [booking?.id]);

  async function sendManual(type: string) {
    setActionError(""); setActionMsg("");
    setSendingType(type as CommunicationType);
    try {
      const r = await bookingService.resendCommunication(params.id, type as CommunicationType);
      if (r.sent) {
        setActionMsg(`${t("bookings.detail.emailSentA")}${t(COMM_TYPE_KEYS[type] || type)} ${t("bookings.detail.deliveredB")}`);
      } else {
        setActionError(`${t("bookings.detail.emailFailedA")}${r.reason || t("bookings.detail.unknown")}${t("bookings.detail.emailFailedB")}`);
      }
      fetchCommunications(params.id);
    } catch (err) {
      setActionError((err as Error).message || t("bookings.detail.errSendEmail"));
    }
    setSendingType(null);
  }

  async function sendManualDelay() {
    setActionError(""); setActionMsg("");
    if (!booking?.trip?.id) {
      setActionError(t("bookings.detail.errDelayTrip"));
      return;
    }
    setSendingType("delay_alert");
    try {
      const r = await bookingService.sendTripDelayAlert(booking!.trip.id as string, {
        delay_minutes: 0,
        delay_reason: "Manual alert",
      });
      setActionMsg(`${t("bookings.detail.delaySentA")}${formatNumber(r.sent, lang)} ${r.sent === 1 ? t("bookings.detail.passenger") : t("bookings.detail.passengers")} ${t("bookings.detail.delaySentB")}`);
      fetchCommunications(booking!.id);
    } catch (err) {
      setActionError((err as Error).message || t("bookings.detail.errDelay"));
    }
    setSendingType(null);
  }

  async function runAction(action: () => Promise<Booking>, successMsg: string) {
    setActionError(""); setActionMsg(""); setActing(true);
    try {
      const updated = await action();
      setBooking(updated);
      setActionMsg(successMsg);
      fetchHistory(params.id);
    } catch (err) {
      setActionError((err as Error).message);
    }
    setActing(false);
  }

  function confirmBooking() {
    runAction(() => bookingService.confirm(params.id), t("bookings.detail.confirmedMsg"));
  }

  function submitForApproval() {
    runAction(() => bookingService.submit(params.id), t("bookings.detail.submittedMsg"));
  }

  function approveBooking() {
    runAction(() => bookingService.approve(params.id), t("bookings.detail.approvedMsg"));
  }

  function submitReject() {
    if (!rejectReason.trim()) { setActionError(t("bookings.detail.rejectReasonRequired")); return; }
    setRejectOpen(false);
    const reason = rejectReason.trim();
    setRejectReason("");
    runAction(() => bookingService.reject(params.id, reason), t("bookings.detail.rejectedMsg"));
  }

  async function savePriceInvoice() {
    setActionError(""); setActionMsg(""); setSavingPrice(true);
    try {
      const body: Record<string, unknown> = {};
      const priceNum = Number(editPrice);
      if (editPrice !== "" && !Number.isNaN(priceNum)) {
        body.total_amount = priceNum;
      }
      body.invoice_reference = editInvoice.trim() || null;
      const updated = await bookingService.update(params.id, body);
      setBooking(updated);
      setActionMsg(t("bookings.detail.priceUpdated"));
      fetchHistory(params.id);
    } catch (err) {
      setActionError((err as Error).message);
    }
    setSavingPrice(false);
  }

  function submitCancel() {
    if (!cancelReason.trim()) { setActionError(t("bookings.detail.cancelReasonRequired")); return; }
    setActionError("");
    setCancelOpen(false);
    runAction(() => bookingService.cancel(params.id, cancelReason.trim()), t("bookings.detail.cancelledMsg"));
  }

  function refundBooking() {
    if (!window.confirm(t("bookings.detail.refundConfirm"))) return;
    runAction(() => bookingService.refund(params.id), t("bookings.detail.refundedMsg"));
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

  if (loading) return <div className={styles.page}><div className={styles.loading}>{t("bookings.detail.loading")}</div></div>;
  if (error || !booking) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>{error || t("bookings.detail.notFound")}</div>
        <Link href="/dashboard/bookings" className={styles.backBtn}><ArrowLeft size={14} /> {t("bookings.detail.backToBookings")}</Link>
      </div>
    );
  }

  const canConfirm = ["pending", "pending_approval", "approved", "planning", "assigned"].includes(booking.status);
  const canCancel = ["pending", "confirmed", "draft", "pending_approval", "approved", "planning", "assigned", "in_progress"].includes(booking.status);
  const canRefund = ["confirmed", "cancelled", "completed"].includes(booking.status);
  const canSubmit = ["draft", "pending"].includes(booking.status);
  const canApproveReject = ["pending_approval", "pending"].includes(booking.status) && isSupervisor;
  const showSupervisorPanel = (booking.status === "pending_approval" || booking.status === "pending") && isSupervisor;
  const showPlanningHint = booking.status === "approved" && isPlanning;

  return (
    <div className={styles.page}>
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> {t("bookings.detail.back")}</Link>

      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.monoRef}>{booking.bookingReference}</h1>
            <span className={styles.statusBadge} style={statusStyle(STATUS_COLORS, booking.status)}>{booking.status.replace('_', ' ')}</span>
            <span className={styles.statusBadge} style={statusStyle(PAYMENT_COLORS, booking.paymentStatus)}>{t("bookings.detail.paymentPrefix")} {booking.paymentStatus}</span>
            <span className={styles.statusBadge} style={statusStyle(CHANNEL_COLORS, (booking as any).channel || 'internal')}>{t("bookings.detail.channelPrefix")} {String((booking as any).channel || 'internal').replace('_',' ')}</span>
            {booking.invoiceReference && <span className={styles.statusBadge} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}><FileText size={11} /> {booking.invoiceReference}</span>}
          </div>
          <p className={styles.subtitle}>{t("bookings.detail.booked")} {formatDate(booking.bookingDate, lang)} · {formatNumber(booking.numberOfPassengers, lang)} {booking.numberOfPassengers === 1 ? t("bookings.detail.passenger") : t("bookings.detail.passengers")} {booking.trip.tripType ? `· ${booking.trip.tripType}` : (booking as any).tripTypeRequested ? `· ${(booking as any).tripTypeRequested}` : ""} {booking.trip.route.origin ? `· ${booking.trip.route.origin} → ${booking.trip.route.destination}` : (booking as any).pickupLocation ? `· ${(booking as any).pickupLocation} → ${(booking as any).destinationLocation}` : ""} {(booking as any).requestedDate ? `· ${formatDate((booking as any).requestedDate, lang)} ${(booking as any).requestedTime || ''}` : ''}</p>
        </div>
        <div className={styles.actions}>
          {canSubmit && (
            <button className={styles.actionBtn} onClick={submitForApproval} disabled={acting} style={{ borderColor: '#f97316', color: '#c2410c' }}>
              <Send size={14} /> {t("bookings.detail.submitApproval")}
            </button>
          )}
          {canApproveReject && (
            <>
              <button className={styles.actionBtn} onClick={approveBooking} disabled={acting} style={{ background: '#059669', color: '#fff', borderColor: '#059669' }}>
                <ShieldCheck size={14} /> {t("bookings.detail.approve")}
              </button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => { setActionError(""); setRejectOpen(true); }} disabled={acting}>
                <XCircle size={14} /> {t("bookings.detail.reject")}
              </button>
            </>
          )}
          {canConfirm && !canApproveReject && (
            <button className={styles.actionBtn} onClick={confirmBooking} disabled={acting}>
              <CheckCircle2 size={14} /> {t("bookings.detail.confirm")}
            </button>
          )}
          {canCancel && (
            <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={() => { setActionError(""); setCancelOpen(true); }} disabled={acting}>
              <XCircle size={14} /> {t("bookings.detail.cancel")}
            </button>
          )}
          {canRefund && (
            <button className={styles.actionBtn} onClick={refundBooking} disabled={acting}>
              <RotateCcw size={14} /> {t("bookings.detail.refund")}
            </button>
          )}
          <button className={styles.actionBtn} onClick={downloadTicket} disabled={downloading}>
            <Download size={14} /> {downloading ? t("bookings.detail.downloading") : t("bookings.detail.ticketPdf")}
          </button>
        </div>
      </div>

      {showPlanningHint && (
        <div className={styles.success} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bus size={14} /> {t("bookings.detail.planHintA")}<strong>{t("bookings.detail.approved")}</strong>{t("bookings.detail.planHintB")}<strong>{t("bookings.detail.planningQueue")}</strong>{t("bookings.detail.planHintC")}
          {booking.trip.id ? <Link href={`/dashboard/trips/${booking.trip.id}`} style={{ marginLeft: 'auto', fontWeight: 600, color: '#0369a1' }}>{t("bookings.detail.openTrip")}</Link> : <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{t("bookings.detail.noTrip")}</span>}
        </div>
      )}

      {actionError && <div className={styles.error}>{actionError}</div>}
      {actionMsg && <div className={styles.success}>{actionMsg}</div>}

      {/* Supervisor review panel — Phase 7.6 */}
      {showSupervisorPanel && (
        <section className={styles.card} style={{ borderColor: '#f97316', background: '#fff7ed' }}>
          <h2 className={styles.cardTitle} style={{ color: '#9a3412' }}><ShieldCheck size={14} /> {t("bookings.detail.reviewTitle")}</h2>
          <p style={{ fontSize: 12.5, color: '#7c2d12', margin: '0 0 12px' }}>{t("bookings.detail.reviewDesc")}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>{t("bookings.detail.quotationLabel")}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder={t("bookings.detail.pricePh")}
                style={{ padding: '8px 10px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>{t("bookings.detail.invoiceLabel")}</label>
              <input
                value={editInvoice}
                onChange={(e) => setEditInvoice(e.target.value)}
                placeholder={t("bookings.detail.invoicePh")}
                style={{ padding: '8px 10px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <button className={styles.primaryBtn} onClick={savePriceInvoice} disabled={savingPrice} style={{ background: '#ea580c', height: 36 }}>
              <Save size={14} /> {savingPrice ? t("bookings.detail.saving") : t("bookings.detail.save")}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className={styles.primaryBtn} onClick={approveBooking} disabled={acting} style={{ background: '#059669', flex: 1 }}>
              <Check size={14} /> {t("bookings.detail.approveBooking")}
            </button>
            <button className={`${styles.primaryBtn} ${styles.dangerPrimary}`} onClick={() => setRejectOpen(true)} disabled={acting} style={{ flex: 1 }}>
              <X size={14} /> {t("bookings.detail.reject")}
            </button>
          </div>
        </section>
      )}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><User size={14} /> {t("bookings.detail.customerCard")}</h2>
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.nameLabel")}</span>
              <span className={styles.detailValue}>
                {booking.customer.name}
                {booking.customer.isCompany && <span className={styles.companyTag}><Building2 size={11} /> {booking.customer.companyName}</span>}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.phoneLabel")}</span>
              <span className={styles.detailValue}><Phone size={12} /> {booking.customer.phone || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.emailLabel")}</span>
              <span className={styles.detailValue}><Mail size={12} /> {booking.customer.email || "—"}</span>
            </div>
            <Link href={`/dashboard/customers/${booking.customer.id}`} className={styles.customerLink}>{t("bookings.detail.viewProfile")}</Link>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Bus size={14} /> {t("bookings.detail.tripCard")} {booking.trip.id ? '' : t("bookings.detail.tripRequest")}</h2>
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.channelLabel")}</span>
              <span className={styles.detailValue}><span className={styles.statusBadge} style={statusStyle(CHANNEL_COLORS, (booking as any).channel || 'internal')}>{String((booking as any).channel || 'internal').replace('_',' ')}</span></span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.routeLabel")}</span>
              <span className={styles.detailValue}>
                <RouteIcon size={12} /> {booking.trip.route.origin || (booking as any).pickupLocation || "—"} → {booking.trip.route.destination || (booking as any).destinationLocation || "—"}
              </span>
            </div>
            {booking.trip.route.name && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("bookings.detail.routeNameLabel")}</span>
                <span className={styles.detailValue}>{booking.trip.route.name}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.pickupLabel")}</span>
              <span className={styles.detailValue}>{booking.trip.route.origin || (booking as any).pickupLocation || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.destLabel")}</span>
              <span className={styles.detailValue}>{booking.trip.route.destination || (booking as any).destinationLocation || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.dateLabel")}</span>
              <span className={styles.detailValue}><CalendarDays size={12} /> {(booking as any).requestedDate ? formatDate((booking as any).requestedDate, lang) : formatDate(booking.trip.scheduledDate, lang)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.timeLabel")}</span>
              <span className={styles.detailValue}><Clock size={12} /> {(booking as any).requestedTime ? (booking as any).requestedTime : fmtTime(booking.trip.scheduledStartTime)}{booking.trip.scheduledEndTime ? ` — ${fmtTime(booking.trip.scheduledEndTime)}` : ""}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.tripTypeLabel")}</span>
              <span className={styles.detailValue}>{booking.trip.tripType || (booking as any).tripTypeRequested || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.paxLabel")}</span>
              <span className={styles.detailValue}><Armchair size={12} /> {formatNumber(booking.numberOfPassengers, lang)} · {t("bookings.detail.seatsLabel")} {(booking.seatNumbers || []).join(", ") || "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.busLabel")}</span>
              <span className={styles.detailValue}>
                <Armchair size={12} /> {booking.trip.busPlate || "—"}
                {booking.trip.busMake ? ` (${booking.trip.busMake} ${booking.trip.busModel || ""})` : ""}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.vehicleReq")}</span>
              <span className={styles.detailValue}>{booking.trip.busPlate ? `${booking.trip.busMake || ""} ${booking.trip.busModel || ""}`.trim() || booking.trip.busPlate : t("bookings.detail.toAssign")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.tripStatus")}</span>
              <span className={`${styles.detailValue} ${styles.tripStatus}`}>{booking.trip.status || (booking.trip.id ? "—" : "pending_approval")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("bookings.detail.seatsLabel")}</span>
              <span className={styles.detailValue}>
                {booking.seatNumbers.length > 0 ? booking.seatNumbers.map((s) => <span key={s} className={styles.seatChip}>#{s}</span>) : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("bookings.detail.passengersTitle")} ({formatNumber(booking.passengers?.length || 0, lang)})</h2>
        {booking.passengers && booking.passengers.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("bookings.new.colSeat")}</th><th>{t("bookings.new.colName")}</th><th>{t("bookings.new.colId")}</th><th>{t("bookings.new.colAge")}</th><th>{t("bookings.new.colSpecial")}</th>
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
          <p className={styles.emptyText}>{t("bookings.detail.noPassengers")}</p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t("bookings.detail.paymentTitle")}</h2>
        <div className={styles.paymentGrid}>
          <div className={styles.paymentItem}>
            <span className={styles.paymentLabel}>{t("bookings.detail.quotationTotal")}</span>
            <span className={styles.paymentValue}>{formatCurrency(booking.totalAmount, lang)}</span>
            {booking.quotationAmount != null && booking.quotationAmount !== booking.totalAmount && (
              <span style={{ fontSize: 11, color: '#6b7280' }}>{t("bookings.detail.quoted")} {formatCurrency(booking.quotationAmount, lang)}</span>
            )}
          </div>
          <div className={styles.paymentItem}>
            <span className={styles.paymentLabel}>{t("bookings.detail.paidLabel")}</span>
            <span className={styles.paymentValue}>{formatCurrency(booking.paidAmount, lang)}</span>
          </div>
          <div className={`${styles.paymentItem} ${styles.paymentBalance}`}>
            <span className={styles.paymentLabel}>{t("bookings.detail.balanceLabel")}</span>
            <span className={styles.paymentValue}>{formatCurrency(booking.balance, lang)}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className={styles.detailLabel}>{t("bookings.detail.invoiceRef")}</span>
            <span className={styles.detailValue}><FileText size={12} /> {booking.invoiceReference || t("bookings.detail.noInvoice")}</span>
          </div>
          <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className={styles.detailLabel}>{t("bookings.detail.paymentStatus")}</span>
            <span className={styles.statusBadge} style={statusStyle(PAYMENT_COLORS, booking.paymentStatus)}>{booking.paymentStatus}</span>
          </div>
        </div>
        {booking.notes && (
          <div className={styles.notes}>
            <span className={styles.detailLabel}>{t("bookings.detail.notesLabel")}</span>
            <p className={styles.notesText}>{booking.notes}</p>
          </div>
        )}
        {booking.cancelReason && (
          <div className={`${styles.notes} ${styles.cancelNote}`}>
            <span className={styles.detailLabel}>{t("bookings.detail.cancelReasonLabel")}</span>
            <p className={styles.notesText}>{booking.cancelReason}</p>
          </div>
        )}
        {booking.rejectionReason && booking.rejectionReason !== booking.cancelReason && (
          <div className={`${styles.notes} ${styles.cancelNote}`}>
            <span className={styles.detailLabel}>{t("bookings.detail.rejectionLabel")}</span>
            <p className={styles.notesText}>{booking.rejectionReason}</p>
          </div>
        )}
      </section>

      {/* Status timeline — Phase 7.6 */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}><History size={14} /> {t("bookings.detail.timelineTitle")}</h2>
        {historyLoading ? (
          <p className={styles.emptyText}>{t("bookings.detail.loadingTimeline")}</p>
        ) : history.length === 0 ? (
          <p className={styles.emptyText}>{t("bookings.detail.noHistory")}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((h, idx) => (
              <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS[h.toStatus] || '#6b7280', marginTop: 4 }} />
                  {idx < history.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: '#e5e7eb' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span className={styles.statusBadge} style={statusStyle(STATUS_COLORS, h.fromStatus || '—')}>{h.fromStatus ? h.fromStatus.replace('_', ' ') : '—'}</span>
                    <span style={{ color: '#9ca3af' }}>→</span>
                    <span className={styles.statusBadge} style={statusStyle(STATUS_COLORS, h.toStatus)}>{h.toStatus.replace('_', ' ')}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(h.changedAt, lang)}</span>
                    {h.changedByName && <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{t("bookings.detail.by")} {h.changedByName}</span>}
                  </div>
                  {h.notes && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#4b5563', background: '#f9fafb', padding: '4px 8px', borderRadius: 6 }}>{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.commHeader}>
          <div>
            <h2 className={styles.cardTitle}><Send size={14} /> {t("bookings.detail.commTitle")}</h2>
            <p className={styles.commSub}>{t("bookings.detail.commSubA")}{booking.customer.email || t("bookings.detail.theCustomer")} {t("bookings.detail.commSubB")} {booking.customer.email || "—"}</p>
          </div>
          <div className={styles.commActions}>
            <button className={styles.actionBtn} onClick={() => sendManual("confirmation")} disabled={!!sendingType}>
              <MailCheck size={13} /> {sendingType === "confirmation" ? t("bookings.detail.sending") : t("bookings.detail.resendConfirm")}
            </button>
            <button className={styles.actionBtn} onClick={() => sendManual("receipt")} disabled={!!sendingType}>
              <Mail size={13} /> {sendingType === "receipt" ? t("bookings.detail.sending") : t("bookings.detail.sendReceipt")}
            </button>
            <button className={styles.actionBtn} onClick={() => sendManual("reminder")} disabled={!!sendingType}>
              <Send size={13} /> {sendingType === "reminder" ? t("bookings.detail.sending") : t("bookings.detail.sendReminder")}
            </button>
            <button className={styles.actionBtn} onClick={sendManualDelay} disabled={!!sendingType}>
              <Clock size={13} /> {sendingType === "delay_alert" ? t("bookings.detail.sending") : t("bookings.detail.sendDelay")}
            </button>
          </div>
        </div>

        {commLoading ? (
          <p className={styles.emptyText}>{t("bookings.detail.loadingComm")}</p>
        ) : communications.length === 0 ? (
          <p className={styles.emptyText}>{t("bookings.detail.noComm")}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("bookings.detail.colType")}</th><th>{t("bookings.detail.colTo")}</th><th>{t("bookings.detail.colSubject")}</th><th>{t("bookings.detail.colStatus")}</th><th>{t("bookings.detail.colSentAt")}</th>
              </tr>
            </thead>
            <tbody>
              {communications.map((c) => (
                <tr key={c.id}>
                  <td className={styles.commType}>{t(COMM_TYPE_KEYS[c.type] || c.type)}</td>
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
                  <td className={styles.commDate}>{formatDate(c.createdAt, lang)} {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
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
              <h2>{t("bookings.detail.cancelTitle")}</h2>
              <button className={styles.iconBtn} onClick={() => setCancelOpen(false)}><X size={16} /></button>
            </div>
            <p className={styles.modalText}>{t("bookings.detail.cancelTextA")}<span className={styles.monoInline}>{booking.bookingReference}</span>{t("bookings.detail.cancelTextB")}</p>
            <div className={styles.field}>
              <label>{t("bookings.detail.reasonLabel")}</label>
              <textarea rows={4} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("bookings.detail.cancelReasonPh")} autoFocus />
            </div>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setCancelOpen(false)}>{t("bookings.detail.keepBooking")}</button>
              <button type="button" className={`${styles.primaryBtn} ${styles.dangerPrimary}`} onClick={submitCancel} disabled={acting}>
                {acting ? t("bookings.detail.cancelling") : t("bookings.detail.cancelTitle")}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className={styles.modalOverlay} onClick={() => setRejectOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2><AlertTriangle size={16} style={{ color: '#dc2626' }} /> {t("bookings.detail.rejectTitle")}</h2>
              <button className={styles.iconBtn} onClick={() => setRejectOpen(false)}><X size={16} /></button>
            </div>
            <p className={styles.modalText}>{t("bookings.detail.rejectTextA")}<span className={styles.monoInline}>{booking.bookingReference}</span>{t("bookings.detail.rejectTextB")}<strong>{t("bookings.detail.required")}</strong>{t("bookings.detail.rejectTextC")}</p>
            <div className={styles.field}>
              <label>{t("bookings.detail.rejectReasonLabel")}</label>
              <textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t("bookings.detail.rejectReasonPh")} autoFocus />
            </div>
            {actionError && <div className={styles.error}>{actionError}</div>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setRejectOpen(false)}>{t("bookings.detail.keepPending")}</button>
              <button type="button" className={`${styles.primaryBtn} ${styles.dangerPrimary}`} onClick={submitReject} disabled={acting || !rejectReason.trim()}>
                {acting ? t("bookings.detail.rejecting") : t("bookings.detail.rejectTitle")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
