"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Building2, User, CalendarDays, FileText } from "lucide-react";
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

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: number | null) {
  return n == null ? "—" : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
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
          setError(data.error?.message || "Customer not found");
        }
      } catch { setError("Network error"); }
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

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading customer...</div></div>;

  if (error || !customer) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error || "Customer not found"}</p>
          <Link href="/dashboard/customers" className={styles.backBtn}><ArrowLeft size={14} /> Back to Customers</Link>
        </div>
      </div>
    );
  }

  const c = customer;
  const bookings = history?.bookings || [];

  return (
    <div className={styles.page}>
      <Link href="/dashboard/customers" className={styles.backLink}><ArrowLeft size={14} /> Customers</Link>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {c.isCompany ? <Building2 size={28} /> : <User size={28} />}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1>{c.name}</h1>
            <span className={`${styles.typeBadge} ${c.isCompany ? styles.typeCompany : styles.typeIndividual}`}>
              {c.isCompany ? "Company" : "Individual"}
            </span>
          </div>
          {c.companyName && <p className={styles.companyLine}>{c.companyName}</p>}
          <div className={styles.contactGrid}>
            {c.phone && <span className={styles.contactItem}><Phone size={13} /> {c.phone}</span>}
            {c.email && <span className={styles.contactItem}><Mail size={13} /> {c.email}</span>}
            {c.idNumber && <span className={styles.contactItem}><FileText size={13} /> ID: {c.idNumber}</span>}
            {c.nationality && <span className={styles.contactItem}><User size={13} /> {c.nationality}</span>}
            {c.address && <span className={styles.contactItem}><MapPin size={13} /> {c.address}</span>}
          </div>
          {c.notes && <p className={styles.notes}>{c.notes}</p>}
        </div>
        <div className={styles.profileActions}>
          <Link href={`/dashboard/customers/${c.id}/edit`} className={styles.editBtn}><Pencil size={14} /> Edit</Link>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "bookings" ? styles.tabActive : ""}`} onClick={() => setTab("bookings")}>
          <CalendarDays size={14} /> Booking History
        </button>
        <button className={`${styles.tab} ${tab === "details" ? styles.tabActive : ""}`} onClick={() => setTab("details")}>
          <User size={14} /> Details
        </button>
      </div>

      {tab === "bookings" && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th><th>Route</th><th>Scheduled</th><th>Passengers</th><th>Amount</th><th>Balance</th><th>Payment</th><th>Status</th>
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
                  <td>{fmtDate(b.scheduledDate)}</td>
                  <td>{b.numberOfPassengers}</td>
                  <td>{fmtMoney(b.totalAmount)}</td>
                  <td>{fmtMoney(b.balance)}</td>
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
                <tr><td colSpan={8} className={styles.emptyState}>No bookings yet — booking management arrives with Phase 7.2.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "details" && (
        <div className={styles.detailsCard}>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Full name</span><span>{c.name}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Type</span><span>{c.isCompany ? "Company" : "Individual"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Company name</span><span>{c.companyName || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Phone</span><span>{c.phone || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Email</span><span>{c.email || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>ID number</span><span>{c.idNumber || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Nationality</span><span>{c.nationality || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Address</span><span>{c.address || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Notes</span><span>{c.notes || "—"}</span></div>
          <div className={styles.detailRow}><span className={styles.detailLabel}>Member since</span><span>{fmtDate(c.createdAt)}</span></div>
        </div>
      )}
    </div>
  );
}