"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Building2, User, CalendarDays, FileText } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#059669", cancelled: "#dc2626", completed: "#3b82f6", refunded: "#6b7280",
};
const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "#dc2626", partial: "#f59e0b", paid: "#059669", refunded: "#6b7280",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const { lang, t } = useLanguage();
  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"bookings" | "details">("bookings");

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API}/bookings/customers/${params.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setCustomer(data.data);
        } else {
          setError(data.error?.message || t("customers.profile.notFound"));
        }
      } catch { setError(t("customers.list.networkError")); }
      setLoading(false);
    })();
  }, [params.id]);

  useEffect(() => {
    if (tab !== "bookings" || !customer) return;
    (async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API}/bookings/customers/${params.id}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setHistory(data.data);
      } catch {}
    })();
  }, [tab, customer, params.id]);

  if (loading) return <div className={styles.page}><div className={styles.loading}>{t("customers.profile.loading")}</div></div>;

  if (error || !customer) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error || t("customers.profile.notFound")}</p>
          <Link href="/dashboard/customers" className={styles.backBtn}><ArrowLeft size={14} /> {t("customers.profile.backTo")}</Link>
        </div>
      </div>
    );
  }

  const c = customer;
  const bookings = history?.bookings || [];

  return (
    <div className={styles.page}>
      <Link href="/dashboard/customers" className={styles.backLink}><ArrowLeft size={14} /> {t("customers.profile.back")}</Link>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {c.isCompany ? <Building2 size={28} /> : <User size={28} />}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1>{c.name}</h1>
            <span className={`${styles.typeBadge} ${c.isCompany ? styles.typeCompany : styles.typeIndividual}`}>
              {c.isCompany ? t("customers.list.typeCompany") : t("customers.list.typeIndividual")}
            </span>
          </div>
          {c.companyName && <p className={styles.companyLine}>{c.companyName}</p>}
          <div className={styles.contactGrid}>
            {c.phone && <span className={styles.contactItem}><Phone size={13} /> {c.phone}</span>}
            {c.email && <span className={styles.contactItem}><Mail size={13} /> {c.email}</span>}
            {c.idNumber && <span className={styles.contactItem}><FileText size={13} /> {t("customers.profile.idPrefix")} {c.idNumber}</span>}
            {c.nationality && <span className={styles.contactItem}><User size={13} /> {c.nationality}</span>}
            {c.address && <span className={styles.contactItem}><MapPin size={13} /> {c.address}</span>}
          </div>
          {c.notes && <p className={styles.notes}>{c.notes}</p>}
        </div>
        <div className={styles.profileActions}>
          <Link href={`/dashboard/customers/${c.id}/edit`} className={styles.editBtn}><Pencil size={14} /> {t("customers.profile.edit")}</Link>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "bookings" ? styles.tabActive : ""}`} onClick={() => setTab("bookings")}>
          <CalendarDays size={14} /> {t("customers.profile.tabHistory")}
        </button>
        <button className={`${styles.tab} ${tab === "details" ? styles.tabActive : ""}`} onClick={() => setTab("details")}>
          <User size={14} /> {t("customers.profile.tabDetails")}
        </button>
      </div>

      {tab === "bookings" && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("customers.profile.colReference")}</th><th>{t("customers.profile.colRoute")}</th><th>{t("customers.profile.colScheduled")}</th><th>{t("customers.profile.colPax")}</th><th>{t("customers.profile.colAmount")}</th><th>{t("customers.profile.colBalance")}</th><th>{t("customers.profile.colPayment")}</th><th>{t("customers.profile.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id}>
                  <td className={styles.mono}>{b.bookingReference}</td>
                  <td>
                    <div className={styles.routeLine}>{b.route.origin} → {b.route.destination}</div>
                    <div className={styles.cellSub}>{b.route.name}</div>
                  </td>
                  <td>{formatDate(b.scheduledDate, lang)}</td>
                  <td>{formatNumber(b.numberOfPassengers, lang)}</td>
                  <td>{formatCurrency(b.totalAmount, lang)}</td>
                  <td>{formatCurrency(b.balance, lang)}</td>
                  <td>
                    <span className={styles.payBadge} style={{ color: PAYMENT_COLORS[b.paymentStatus] || "#6b7280", background: (PAYMENT_COLORS[b.paymentStatus] || "#6b7280") + "18" }}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={{ color: BOOKING_STATUS_COLORS[b.status] || "#6b7280", background: (BOOKING_STATUS_COLORS[b.status] || "#6b7280") + "18" }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyState}>{t("customers.profile.noBookings")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "details" && (
        <div className={styles.detailsCard}>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.fullName")}</span><span>{c.name}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.type")}</span><span>{c.isCompany ? t("customers.list.typeCompany") : t("customers.list.typeIndividual")}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.companyName")}</span><span>{c.companyName || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.phone")}</span><span>{c.phone || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.email")}</span><span>{c.email || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.idNumber")}</span><span>{c.idNumber || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.nationality")}</span><span>{c.nationality || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.address")}</span><span>{c.address || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.notes")}</span><span>{c.notes || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>{t("customers.profile.memberSince")}</span><span>{formatDate(c.createdAt, lang)}</span></div>
        </div>
      )}
    </div>
  );
}
