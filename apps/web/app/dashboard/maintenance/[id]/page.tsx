"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Circle, PenLine, XCircle, Wrench, User2, Building2, DollarSign, MapPin } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TASK_TYPES: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_inspection: "Brake Inspection",
  engine_service: "Engine Service", ac_service: "AC Service", electrical: "Electrical",
  body_repair: "Body Repair", general_service: "General Service", other: "Other",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#dc2626",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmtDateTime(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const taskId = String(id || "");
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [completeModal, setCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeCost, setCompleteCost] = useState("");
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  async function fetchTask() {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTask(data.data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchTask(); }, [taskId]);

  async function doAction(type: string, body?: any) {
    setActionLoading(type);
    setError("");
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/tasks/${taskId}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message || "Action failed"); setActionLoading(null); return; }
      setCompleteModal(false);
      setCancelModal(false);
      setCompleteNotes("");
      setCompleteCost("");
      setCancelReason("");
      await fetchTask();
    } catch { setError("Network error"); }
    setActionLoading(null);
  }

  if (loading) return <div className={styles.loading}>Loading task...</div>;
  if (!task) return <div className={styles.loading}>Task not found</div>;

  const steps = [
    { key: "scheduled", label: "Scheduled", desc: task.scheduledDate ? `Scheduled for ${new Date(task.scheduledDate).toLocaleDateString("en-GB")}` : "", done: true },
    { key: "in_progress", label: "In Progress", desc: task.startedAt ? fmtDateTime(task.startedAt) : "", done: task.status === "in_progress" || task.status === "completed" },
    { key: "completed", label: "Completed", desc: task.completedAt ? fmtDateTime(task.completedAt) : "", done: task.status === "completed" },
  ];

  return (
    <div className={styles.page}>
      <Link href="/dashboard/maintenance" className={styles.backLink}><ArrowLeft size={14} /> Back to Maintenance</Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>{TASK_TYPES[task.taskType] || task.taskType}</h1>
          <span className={styles.priorityBadge} style={{ background: (PRIORITY_COLORS[task.priority] || "#6b7280") + "18", color: PRIORITY_COLORS[task.priority] || "#6b7280" }}>
            {task.priority} priority
          </span>
          <span className={`${styles.statusBadge} ${styles[`status_${task.status}`]}`}>{task.status.replace("_", " ")}</span>
        </div>
        <div className={styles.headerActions}>
          {task.status === "scheduled" && (
            <button className={styles.startBtn} onClick={() => doAction("start")} disabled={actionLoading !== null}>
              <PenLine size={14} /> {actionLoading === "start" ? "Starting..." : "Start Work"}
            </button>
          )}
          {task.status === "in_progress" && (
            <button className={styles.completeBtn} onClick={() => setCompleteModal(true)} disabled={actionLoading !== null}>
              <CheckCircle2 size={14} /> Complete Task
            </button>
          )}
          {task.status !== "completed" && task.status !== "cancelled" && (
            <button className={styles.cancelBtn} onClick={() => setCancelModal(true)} disabled={actionLoading !== null}>
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3><Wrench size={14} /> Task Details</h3>
          <div className={styles.row}><span>Assigned Bus</span><span className={styles.strong}>{task.bus?.plateNumber}</span></div>
          <div className={styles.row}><span>Bus Make / Model</span><span>{task.bus?.make} {task.bus?.model}</span></div>
          <div className={styles.row}><span>Bus KM</span><span>{task.bus?.currentKm?.toLocaleString()} km</span></div>
          <div className={styles.row}><span>Next KM Threshold</span><span>{task.bus?.nextKmThreshold != null ? task.bus.nextKmThreshold.toLocaleString() + " km" : "—"}</span></div>
          <div className={styles.row}><span>Scheduled Date</span><span>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString("en-GB") : "—"}</span></div>
          <div className={styles.row}><span>Scheduled KM</span><span>{task.scheduledKm != null ? task.scheduledKm.toLocaleString() + " km" : "—"}</span></div>
          <div className={styles.row}><span>Recurring</span><span>{task.recurringIntervalDays ? `Every ${task.recurringIntervalDays} days` : task.recurringIntervalKm ? `Every ${task.recurringIntervalKm} km` : "No"}</span></div>
          {task.description && <div className={styles.desc}>{task.description}</div>}
        </div>

        <div className={styles.card}>
          <h3>Assignment</h3>
          <div className={styles.row}><span><Building2 size={12} /> Workshop</span><span>{task.assignedWorkshop || "—"}</span></div>
          <div className={styles.row}><span><User2 size={12} /> Mechanic</span><span>{task.assignedMechanic || "—"}</span></div>
          {task.status === "completed" && (
            <>
              <div className={styles.row}><span><DollarSign size={12} /> Cost</span><span className={styles.strong}>{task.cost != null ? Number(task.cost).toLocaleString() : "—"}</span></div>
              {task.completionNotes && <div className={styles.desc}>{task.completionNotes}</div>}
              <div className={styles.row}><span>Completed At</span><span>{fmtDateTime(task.completedAt)}</span></div>
            </>
          )}
          {task.status === "cancelled" && (
            <>
              <div className={styles.row}><span><XCircle size={12} /> Reason</span><span>{task.cancellationReason || "—"}</span></div>
              <div className={styles.row}><span>Cancelled At</span><span>{fmtDateTime(task.cancelledAt)}</span></div>
            </>
          )}
        </div>

        <div className={`${styles.card} ${styles.cardFull}`}>
          <h3><CalendarIcon size={14} /> Timeline</h3>
          <div className={styles.timeline}>
            {steps.map((s, i) => (
              <div key={s.key} className={`${styles.step} ${s.done ? styles.stepDone : ""} ${task.status === "cancelled" && i === 0 ? styles.stepCancelled : ""}`}>
                <div className={styles.stepIcon}>
                  {task.status === "cancelled" ? <XCircle size={16} /> : s.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepLabel}>{task.status === "cancelled" && i === 0 ? "Cancelled" : s.label}</div>
                  {task.status === "cancelled" && i === 0 && <div className={styles.stepDesc}>{task.cancellationReason || "Work cancelled"}</div>}
                  {task.status !== "cancelled" && <div className={styles.stepDesc}>{s.desc || "Pending"}</div>}
                </div>
                {i < steps.length - 1 && <div className={styles.stepLine} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {completeModal && (
        <div className={styles.overlay} onClick={() => setCompleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Complete Task</h2>
            <div className={styles.field}>
              <label>Completion Notes</label>
              <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3} />
            </div>
            <div className={styles.field}>
              <label>Cost</label>
              <input type="number" min="0" step="0.01" value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setCompleteModal(false)}>Back</button>
              <button className={styles.completeBtn} onClick={() => doAction("complete", { notes: completeNotes || undefined, cost: completeCost ? Number(completeCost) : undefined })} disabled={actionLoading === "complete"}>
                {actionLoading === "complete" ? "Completing..." : "Confirm Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div className={styles.overlay} onClick={() => setCancelModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Cancel Task</h2>
            <div className={styles.field}>
              <label>Cancellation Reason *</label>
              <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setCancelModal(false)}>Back</button>
              <button className={styles.cancelBtn} onClick={() => doAction("cancel", { reason: cancelReason })} disabled={actionLoading === "cancel" || !cancelReason.trim()}>
                {actionLoading === "cancel" ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.metaFooter}><MapPin size={12} /> Task ID: {task.id}</div>
    </div>
  );
}