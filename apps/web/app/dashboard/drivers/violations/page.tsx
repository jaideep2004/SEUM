"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, AlertTriangle, List, Shield, XCircle, CheckCircle, Scale } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#f59e0b", major: "#f97316", critical: "#dc2626",
};
const TYPE_COLORS: Record<string, string> = {
  speeding: "#ef4444", phone_usage: "#f97316", fatigue: "#8b5cf6",
  lane_departure: "#f59e0b", seatbelt: "#3b82f6", smoking: "#6b7280",
  route_deviation: "#0891b2", customer_complaint: "#ec4899", accident: "#dc2626",
};
const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b", resolved: "#059669", disputed: "#6366f1",
};
const VIOLATION_TYPES = [
  "speeding", "phone_usage", "fatigue", "lane_departure", "seatbelt",
  "smoking", "route_deviation", "customer_complaint", "accident",
];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

const badge = (value: string, map: Record<string, string>, cls: string) => (
  <span className={styles[cls]} style={{ background: (map[value] || "#6b7280") + "20", color: map[value] || "#6b7280" }}>
    {value.replace(/_/g, " ")}
  </span>
);

export default function DriverViolationsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "record" | "score">("list");

  // List state
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  // Detail modal
  const [detailModal, setDetailModal] = useState<any>(null);

  // Dispute modal
  const [disputeModal, setDisputeModal] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Score state
  const [driverId, setDriverId] = useState("");
  const [scoreData, setScoreData] = useState<any>(null);

  // Record form state
  const [form, setForm] = useState({
    driver_id: "", trip_id: "", violation_type: "speeding", severity: "minor", description: "", action_taken: "",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API}/drivers?page=1&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setDrivers(data.data || []);
      } catch {}
    })();
  }, []);

  async function fetchViolations() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    try {
      let url = `${API}/drivers/violations?pageSize=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (severityFilter) url += `&severity=${severityFilter}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setViolations(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "list") fetchViolations(); }, [activeTab, statusFilter, severityFilter]);

  async function fetchScore() {
    if (!driverId.trim()) return;
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/drivers/violations/safety-score/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setScoreData(data.data);
    } catch {}
    setLoading(false);
  }

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("record");
    const token = getToken();
    try {
      const body: any = {
        driver_id: form.driver_id,
        violation_type: form.violation_type,
        severity: form.severity,
        description: form.description || undefined,
        action_taken: form.action_taken || undefined,
      };
      if (form.trip_id) body.trip_id = form.trip_id;

      const res = await fetch(`${API}/drivers/violations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ driver_id: "", trip_id: "", violation_type: "speeding", severity: "minor", description: "", action_taken: "" });
        setActiveTab("list");
        fetchViolations();
        if (data.data.suspended) alert("Driver has been suspended due to accumulated violation points!");
      }
    } catch {}
    setActionLoading(null);
  }

  async function handleResolve(id: string) {
    setActionLoading(id);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/violations/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      setDetailModal(null);
      fetchViolations();
    } catch {}
    setActionLoading(null);
  }

  async function handleDispute(violationId: string) {
    setActionLoading(violationId);
    const token = getToken();
    try {
      await fetch(`${API}/drivers/violations/${violationId}/dispute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      setDisputeModal(null);
      setDisputeReason("");
      setDetailModal(null);
      fetchViolations();
    } catch {}
    setActionLoading(null);
  }

  const scoreColor = (s: number) => s >= 90 ? "#059669" : s >= 75 ? "#f59e0b" : s >= 50 ? "#f97316" : "#dc2626";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back</Link>
          <h1>Violations & Safety</h1>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "list" ? styles.tabActive : ""}`} onClick={() => setActiveTab("list")}>
          <List size={14} /> Violations
        </button>
        <button className={`${styles.tab} ${activeTab === "record" ? styles.tabActive : ""}`} onClick={() => setActiveTab("record")}>
          <Plus size={14} /> Record
        </button>
        <button className={`${styles.tab} ${activeTab === "score" ? styles.tabActive : ""}`} onClick={() => setActiveTab("score")}>
          <Shield size={14} /> Safety Score
        </button>
      </div>

      {/* ==================== LIST TAB ==================== */}
      {activeTab === "list" && (
        <>
          <div className={styles.filters}>
            <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="disputed">Disputed</option>
            </select>
            <select className={styles.filterSelect} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="">All Severity</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading violations...</div>
          ) : violations.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertTriangle size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No violations found</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Points</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v: any) => (
                    <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => setDetailModal(v)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.driver?.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{v.driver?.employeeCode || ""}</div>
                      </td>
                      <td>{badge(v.violationType, TYPE_COLORS, "typeBadge")}</td>
                      <td>{badge(v.severity, SEVERITY_COLORS, "severityBadge")}</td>
                      <td style={{ fontWeight: 700 }}>{v.points}</td>
                      <td style={{ fontSize: 12 }}>{v.recordedAt?.slice(0, 10)}</td>
                      <td>{badge(v.status, STATUS_COLORS, "statusBadge")}</td>
                      <td>
                        <button className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                          onClick={e => { e.stopPropagation(); setDetailModal(v); }}>
                          <AlertTriangle size={12} /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ==================== RECORD TAB ==================== */}
      {activeTab === "record" && (
        <form className={styles.form} onSubmit={handleRecord}>
          <div className={styles.field}>
            <label>Driver *</label>
            <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} required>
              <option value="">Select driver...</option>
              {drivers.map(dv => <option key={dv.id} value={dv.id}>{dv.name}{dv.employeeCode ? ` (${dv.employeeCode})` : ""}</option>)}
            </select>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>Violation Type</label>
              <select value={form.violation_type} onChange={e => setForm({ ...form, violation_type: e.target.value })}>
                {VIOLATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="minor">Minor (2 pts)</option>
                <option value="major">Major (5 pts)</option>
                <option value="critical">Critical (10 pts)</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Trip ID (optional)</label>
            <input value={form.trip_id} onChange={e => setForm({ ...form, trip_id: e.target.value })} placeholder="Trip UUID" />
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Action Taken</label>
            <input value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} />
          </div>
          <button type="submit" className={`${styles.actionBtn} ${styles.primaryBtn}`} disabled={actionLoading === "record"}>
            {actionLoading === "record" ? "Recording..." : "Record Violation"}
          </button>
        </form>
      )}

      {/* ==================== SAFETY SCORE TAB ==================== */}
      {activeTab === "score" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <select
              style={{ padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: "var(--text-sm)", flex: 1 }}
              value={driverId} onChange={e => { setDriverId(e.target.value); if (e.target.value) fetchScore(); }}>
              <option value="">Select a driver...</option>
              {drivers.map(dv => <option key={dv.id} value={dv.id}>{dv.name}{dv.employeeCode ? ` (${dv.employeeCode})` : ""}</option>)}
            </select>
            <button className={`${styles.actionBtn} ${styles.primaryBtn}`} onClick={fetchScore}>
              <Shield size={14} /> Get Score
            </button>
          </div>

          {scoreData && (
            <>
              <div className={styles.scoreCard}>
                <div className={styles.scoreCircle} style={{ background: scoreColor(scoreData.score) }}>
                  <span className={styles.scoreNumber}>{scoreData.score}</span>
                </div>
                <div className={styles.scoreInfo}>
                  <div className={styles.scoreGrade} style={{ color: scoreColor(scoreData.score) }}>
                    Grade: {scoreData.grade} {scoreData.nearSuspension && <span style={{ color: "#dc2626", fontSize: 12 }}>⚠ Near suspension</span>}
                  </div>
                  <div className={styles.scoreLabel}>Total Points (90 days): {scoreData.totalPoints} / {scoreData.maxPoints} threshold</div>
                  <div className={styles.scoreLabel}>{scoreData.suspended ? "🔴 SUSPENDED" : "✅ Active"}</div>
                  <div className={styles.scoreBar}>
                    <div className={styles.scoreBarFill} style={{ width: `${Math.min(100, (scoreData.totalPoints / scoreData.maxPoints) * 100)}%`, background: scoreColor(scoreData.score) }} />
                  </div>
                </div>
              </div>

              {scoreData.breakdown?.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Type</th><th>Count</th><th>Points</th></tr>
                    </thead>
                    <tbody>
                      {scoreData.breakdown.map((b: any, i: number) => (
                        <tr key={i}>
                          <td>{badge(b.violation_type, TYPE_COLORS, "typeBadge")}</td>
                          <td>{b.count}</td>
                          <td style={{ fontWeight: 700 }}>{b.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {detailModal && (
        <div className={styles.overlay} onClick={() => setDetailModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Violation Detail</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Driver</div>
                <div className={styles.detailValue}>{detailModal.driver?.name || "—"}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Type</div>
                <div className={styles.detailValue}>{badge(detailModal.violationType, TYPE_COLORS, "typeBadge")}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Severity</div>
                <div className={styles.detailValue}>{badge(detailModal.severity, SEVERITY_COLORS, "severityBadge")}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Points</div>
                <div className={styles.detailValue} style={{ color: detailModal.points >= 5 ? "#dc2626" : "#059669" }}>{detailModal.points}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Status</div>
                <div className={styles.detailValue}>{badge(detailModal.status, STATUS_COLORS, "statusBadge")}</div>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Date</div>
                <div className={styles.detailValue}>{detailModal.recordedAt?.slice(0, 10) || "—"}</div>
              </div>
              <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                <div className={styles.detailLabel}>Description</div>
                <div className={styles.detailValue} style={{ fontWeight: 400 }}>{detailModal.description || "—"}</div>
              </div>
              {detailModal.actionTaken && (
                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.detailLabel}>Action Taken</div>
                  <div className={styles.detailValue} style={{ fontWeight: 400 }}>{detailModal.actionTaken}</div>
                </div>
              )}
              {detailModal.disputeReason && (
                <div className={styles.detailItem} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.detailLabel}>Dispute Reason</div>
                  <div className={styles.detailValue} style={{ fontWeight: 400 }}>{detailModal.disputeReason}</div>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              {detailModal.status === "open" && (
                <>
                  <button className={`${styles.actionBtn} ${styles.successBtn}`}
                    onClick={() => handleResolve(detailModal.id)}
                    disabled={actionLoading === detailModal.id}>
                    <CheckCircle size={12} /> Resolve
                  </button>
                  <button className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    onClick={() => { setDisputeModal(detailModal); setDetailModal(null); }}>
                    <Scale size={12} /> Dispute
                  </button>
                </>
              )}
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DISPUTE MODAL ==================== */}
      {disputeModal && (
        <div className={styles.overlay} onClick={() => setDisputeModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Dispute Violation</h2>
            <div className={styles.field}>
              <label>Reason for dispute *</label>
              <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Explain why this violation should be disputed" />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryBtn}`} onClick={() => setDisputeModal(null)}>Cancel</button>
              <button className={`${styles.actionBtn} ${styles.dangerBtn}`}
                onClick={() => handleDispute(disputeModal.id)}
                disabled={!disputeReason.trim() || actionLoading === disputeModal.id}>
                {actionLoading === disputeModal.id ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
