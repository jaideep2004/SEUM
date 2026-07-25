"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CalendarDays, List, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", approved: "#059669", rejected: "#dc2626",
};
const TYPE_COLORS: Record<string, string> = {
  annual: "#3b82f6", sick: "#ef4444", emergency: "#f97316", unpaid: "#6b7280",
};
const LEAVE_TYPES = ["annual", "sick", "emergency", "unpaid"];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function DriverLeavesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState<"list" | "apply" | "calendar">("list");

  // List state
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Balance state
  const [balance, setBalance] = useState<any>(null);

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<any>(null);

  // Apply form state
  const [form, setForm] = useState({
    driver_id: "", leave_type: "annual", start_date: today, end_date: today, reason: "",
  });

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchLeaves() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    try {
      let url = `${API}/drivers/leaves?pageSize=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&leave_type=${typeFilter}`;

      const [leavesRes, balanceRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/drivers/leaves/balance/00000000-0000-0000-0000-000000000000`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      const leavesData = await leavesRes.json();
      if (leavesData.success) setLeaves(leavesData.data || []);

      if (balanceRes) {
        const balData = await balanceRes.json();
        if (balData.success) setBalance(balData.data);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchLeaves(); }, [activeTab, statusFilter, typeFilter]);

  async function fetchCalendar() {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/drivers/leaves/calendar?year=${calYear}&month=${calMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCalendar(data.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "calendar") fetchCalendar(); }, [activeTab, calYear, calMonth]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("apply");
    const token = getToken();
    try {
      await fetch(`${API}/drivers/leaves`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ driver_id: "", leave_type: "annual", start_date: today, end_date: today, reason: "" });
      setActiveTab("list");
      fetchLeaves();
    } catch {}
    setActionLoading(null);
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      const stored = localStorage.getItem("seum_user");
      const user = stored ? JSON.parse(stored) : {};
      await fetch(`${API}/drivers/leaves/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: user.id || "00000000-0000-0000-0000-000000000000" }),
      });
      fetchLeaves();
    } catch {}
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/leaves/${id}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectModal(null);
      setRejectReason("");
      fetchLeaves();
    } catch {}
    setActionLoading(null);
  }

  const badge = (value: string, map: Record<string, string>) => (
    <span className={styles.statusBadge} style={{ background: (map[value] || "#6b7280") + "20", color: map[value] || "#6b7280" }}>
      {value.replace("_", " ")}
    </span>
  );

  const typeBadge = (value: string) => (
    <span className={styles.typeBadge} style={{ background: (TYPE_COLORS[value] || "#6b7280") + "20", color: TYPE_COLORS[value] || "#6b7280" }}>
      {value}
    </span>
  );

  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back</Link>
          <h1>Leave Management</h1>
        </div>
      </div>

      {balance && (
        <div className={styles.balanceCards}>
          {Object.entries(balance.allowances || {}).map(([type, info]: [string, any]) => (
            <div key={type} className={styles.balanceCard}>
              <div className={styles.balanceType}>{type}</div>
              <div className={styles.balanceValue} style={{ color: TYPE_COLORS[type] || "#6b7280" }}>
                {info.remaining === Infinity ? info.used : info.remaining}
              </div>
              <div className={styles.balanceUsed}>
                {info.used} used {info.total !== Infinity ? `/ ${info.total}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}>
          <List size={14} /> Leave List
        </button>
        <button className={`${styles.tab} ${activeTab === "apply" ? styles.tabActive : ""}`} onClick={() => setActiveTab("apply")}>
          <Plus size={14} /> Apply Leave
        </button>
        <button className={`${styles.tab} ${activeTab === "calendar" ? styles.tabActive : ""}`} onClick={() => setActiveTab("calendar")}>
          <CalendarDays size={14} /> Calendar
        </button>
      </div>

      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className={styles.filterSelect} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading leaves...</div>
          ) : leaves.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No leave records found</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l: any) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.driver?.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{l.driver?.employeeCode || ""}</div>
                      </td>
                      <td>{typeBadge(l.leaveType)}</td>
                      <td>{l.startDate}</td>
                      <td>{l.endDate}</td>
                      <td>{Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason || "—"}</td>
                      <td>{badge(l.status, STATUS_COLORS)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {l.status === "pending" && (
                            <>
                              <button className={`${styles.actionBtn} ${styles.approveBtn}`}
                                onClick={() => handleApprove(l.id)}
                                disabled={actionLoading === l.id}>
                                <CheckCircle size={12} />
                              </button>
                              <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={() => setRejectModal({ id: l.id })}
                                disabled={actionLoading === l.id}>
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "apply" && (
        <form className={styles.form} onSubmit={handleApply}>
          <div className={styles.field}>
            <label>Driver ID</label>
            <input
              value={form.driver_id}
              onChange={e => setForm({ ...form, driver_id: e.target.value })}
              placeholder="UUID from drivers table"
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Leave Type</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Reason</label>
              <input
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Optional reason"
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Start Date</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>End Date</label>
              <input type="date" value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "apply"}>
            {actionLoading === "apply" ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      )}

      {activeTab === "calendar" && (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarHeader}>
            <div className={styles.calendarTitle}>
              {new Date(calYear, calMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
            </div>
            <div className={styles.calendarNav}>
              <button onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => { const n = new Date(); setCalMonth(n.getMonth() + 1); setCalYear(n.getFullYear()); }}>Today</button>
              <button onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className={styles.loading}>Loading calendar...</div>
          ) : !calendar ? null : (
            <table className={styles.calendarTable}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Driver</th>
                  {dayHeaders.map((d, i) => <th key={i}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {calendar.drivers?.map((driver: any) => {
                  const leavesForDriver = (calendar.leaves || []).filter((l: any) => l.driverId === driver.id);
                  return (
                    <tr key={driver.id}>
                      <td className={styles.driverNameCell}>
                        <div style={{ fontWeight: 600, fontSize: 11 }}>{driver.name || driver.employeeCode}</div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayLeaves = leavesForDriver.filter((l: any) => l.startDate <= dateStr && l.endDate >= dateStr);
                        return (
                          <td key={i} style={{ background: dayLeaves.length > 0 ? (TYPE_COLORS[dayLeaves[0].leaveType] || "#6b7280") + "15" : undefined }}>
                            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{day}</div>
                            {dayLeaves.map((l: any) => (
                              <div key={l.id} className={styles.leaveBlock} style={{
                                background: (TYPE_COLORS[l.leaveType] || "#6b7280") + "30",
                                color: TYPE_COLORS[l.leaveType] || "#6b7280",
                              }}>
                                {l.leaveType}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {rejectModal && (
        <div className={styles.overlay} onClick={() => setRejectModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Reject Leave</h2>
            <div className={styles.field}>
              <label>Rejection Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Required reason for rejection" />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setRejectModal(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.rejectBtn}`}
                onClick={() => handleReject(rejectModal.id)}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id}>
                {actionLoading === rejectModal.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
