"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Circle, PenLine, XCircle, Wrench, User2, Building2, DollarSign, MapPin } from "lucide-react";
import { useLanguage, formatDate, formatDateTime } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const TASK_TYPES: Record<string, string> = {
  oil_change: "maintenance.taskTypes.oilChange", tire_replacement: "maintenance.taskTypes.tireReplacement", brake_inspection: "maintenance.taskTypes.brakeInspection",
  engine_service: "maintenance.taskTypes.engineService", ac_service: "maintenance.taskTypes.acService", electrical: "maintenance.taskTypes.electrical",
  body_repair: "maintenance.taskTypes.bodyRepair", general_service: "maintenance.taskTypes.generalService", other: "maintenance.taskTypes.other",
};
const PRIORITY_KEYS: Record<string, string> = {
  low: "maintenance.priority.low", medium: "maintenance.priority.medium", high: "maintenance.priority.high", critical: "maintenance.priority.critical",
};
const STATUS_KEYS: Record<string, string> = {
  scheduled: "maintenance.status.scheduled", in_progress: "maintenance.status.inProgress", completed: "maintenance.status.completed", cancelled: "maintenance.status.cancelled",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#dc2626",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

export default function TaskDetailPage() {
  const { lang, t } = useLanguage();
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
      if (!data.success) { setError(data.error?.message || t("maintenance.taskDetail.actionFailed")); setActionLoading(null); return; }
      setCompleteModal(false);
      setCancelModal(false);
      setCompleteNotes("");
      setCompleteCost("");
      setCancelReason("");
      await fetchTask();
    } catch { setError(t("maintenance.taskDetail.networkError")); }
    setActionLoading(null);
  }

  if (loading) return <div className={styles.loading}>{t("maintenance.taskDetail.loading")}</div>;
  if (!task) return <div className={styles.loading}>{t("maintenance.taskDetail.notFound")}</div>;

  const steps = [
    { key: "scheduled", label: t("maintenance.status.scheduled"), desc: task.scheduledDate ? `${t("maintenance.taskDetail.scheduledFor")} ${formatDate(task.scheduledDate, lang)}` : "", done: true },
    { key: "in_progress", label: t("maintenance.status.inProgress"), desc: task.startedAt ? formatDateTime(task.startedAt, lang) : "", done: task.status === "in_progress" || task.status === "completed" },
    { key: "completed", label: t("maintenance.status.completed"), desc: task.completedAt ? formatDateTime(task.completedAt, lang) : "", done: task.status === "completed" },
  ];

  return (
    <div className={styles.page}>
      <Link href="/dashboard/maintenance" className={styles.backLink}><ArrowLeft size={14} /> {t("maintenance.taskDetail.back")}</Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>{t(TASK_TYPES[task.taskType] || task.taskType)}</h1>
          <span className={styles.priorityBadge} style={{ background: (PRIORITY_COLORS[task.priority] || "#6b7280") + "18", color: PRIORITY_COLORS[task.priority] || "#6b7280" }}>
            {t(PRIORITY_KEYS[task.priority] || task.priority)} {t("maintenance.taskDetail.priorityWord")}
          </span>
          <span className={`${styles.statusBadge} ${styles[`status_${task.status}`]}`}>{t(STATUS_KEYS[task.status] || task.status)}</span>
        </div>
        <div className={styles.headerActions}>
          {task.status === "scheduled" && (
            <button className={styles.startBtn} onClick={() => doAction("start")} disabled={actionLoading !== null}>
              <PenLine size={14} /> {actionLoading === "start" ? t("maintenance.taskDetail.starting") : t("maintenance.taskDetail.start")}
            </button>
          )}
          {task.status === "in_progress" && (
            <button className={styles.completeBtn} onClick={() => setCompleteModal(true)} disabled={actionLoading !== null}>
              <CheckCircle2 size={14} /> {t("maintenance.taskDetail.complete")}
            </button>
          )}
          {task.status !== "completed" && task.status !== "cancelled" && (
            <button className={styles.cancelBtn} onClick={() => setCancelModal(true)} disabled={actionLoading !== null}>
              <XCircle size={14} /> {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3><Wrench size={14} /> {t("maintenance.taskDetail.details")}</h3>
          <div className={styles.row}><span>{t("maintenance.taskDetail.bus")}</span><span className={styles.strong}>{task.bus?.plateNumber}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.makeModel")}</span><span>{task.bus?.make} {task.bus?.model}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.busKm")}</span><span>{task.bus?.currentKm?.toLocaleString()} {t("maintenance.taskDetail.km")}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.nextKm")}</span><span>{task.bus?.nextKmThreshold != null ? task.bus.nextKmThreshold.toLocaleString() + " " + t("maintenance.taskDetail.km") : "—"}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.schedDate")}</span><span>{task.scheduledDate ? formatDate(task.scheduledDate, lang) : "—"}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.schedKm")}</span><span>{task.scheduledKm != null ? task.scheduledKm.toLocaleString() + " " + t("maintenance.taskDetail.km") : "—"}</span></div>
          <div className={styles.row}><span>{t("maintenance.taskDetail.recurring")}</span><span>{task.recurringIntervalDays ? `${t("maintenance.taskDetail.every")} ${task.recurringIntervalDays} ${t("maintenance.taskDetail.days")}` : task.recurringIntervalKm ? `${t("maintenance.taskDetail.every")} ${task.recurringIntervalKm} ${t("maintenance.taskDetail.km")}` : t("maintenance.taskDetail.no")}</span></div>
          {task.description && <div className={styles.desc}>{task.description}</div>}
        </div>

        <div className={styles.card}>
          <h3>{t("maintenance.taskDetail.assignment")}</h3>
          <div className={styles.row}><span><Building2 size={12} /> {t("maintenance.taskDetail.workshop")}</span><span>{task.assignedWorkshop || "—"}</span></div>
          <div className={styles.row}><span><User2 size={12} /> {t("maintenance.taskDetail.mechanic")}</span><span>{task.assignedMechanic || "—"}</span></div>
          {task.status === "completed" && (
            <>
              <div className={styles.row}><span><DollarSign size={12} /> {t("maintenance.taskDetail.cost")}</span><span className={styles.strong}>{task.cost != null ? Number(task.cost).toLocaleString() : "—"}</span></div>
              {task.completionNotes && <div className={styles.desc}>{task.completionNotes}</div>}
              <div className={styles.row}><span>{t("maintenance.taskDetail.completedAt")}</span><span>{task.completedAt ? formatDateTime(task.completedAt, lang) : ""}</span></div>
            </>
          )}
          {task.status === "cancelled" && (
            <>
              <div className={styles.row}><span><XCircle size={12} /> {t("maintenance.taskDetail.reason")}</span><span>{task.cancellationReason || "—"}</span></div>
              <div className={styles.row}><span>{t("maintenance.taskDetail.cancelledAt")}</span><span>{task.cancelledAt ? formatDateTime(task.cancelledAt, lang) : ""}</span></div>
            </>
          )}
        </div>

        <div className={`${styles.card} ${styles.cardFull}`}>
          <h3><CalendarIcon size={14} /> {t("maintenance.taskDetail.timeline")}</h3>
          <div className={styles.timeline}>
            {steps.map((s, i) => (
              <div key={s.key} className={`${styles.step} ${s.done ? styles.stepDone : ""} ${task.status === "cancelled" && i === 0 ? styles.stepCancelled : ""}`}>
                <div className={styles.stepIcon}>
                  {task.status === "cancelled" ? <XCircle size={16} /> : s.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepLabel}>{task.status === "cancelled" && i === 0 ? t("maintenance.status.cancelled") : s.label}</div>
                  {task.status === "cancelled" && i === 0 && <div className={styles.stepDesc}>{task.cancellationReason || t("maintenance.taskDetail.workCancelled")}</div>}
                  {task.status !== "cancelled" && <div className={styles.stepDesc}>{s.desc || t("maintenance.taskDetail.pending")}</div>}
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
            <h2>{t("maintenance.taskDetail.completeTitle")}</h2>
            <div className={styles.field}>
              <label>{t("maintenance.taskDetail.compNotes")}</label>
              <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.taskDetail.costLabel")}</label>
              <input type="number" min="0" step="0.01" value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setCompleteModal(false)}>{t("maintenance.taskDetail.back")}</button>
              <button className={styles.completeBtn} onClick={() => doAction("complete", { notes: completeNotes || undefined, cost: completeCost ? Number(completeCost) : undefined })} disabled={actionLoading === "complete"}>
                {actionLoading === "complete" ? t("maintenance.taskDetail.completing") : t("maintenance.taskDetail.confirmComplete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div className={styles.overlay} onClick={() => setCancelModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{t("maintenance.taskDetail.cancelTitle")}</h2>
            <div className={styles.field}>
              <label>{t("maintenance.taskDetail.cancelReason")}</label>
              <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setCancelModal(false)}>{t("maintenance.taskDetail.back")}</button>
              <button className={styles.cancelBtn} onClick={() => doAction("cancel", { reason: cancelReason })} disabled={actionLoading === "cancel" || !cancelReason.trim()}>
                {actionLoading === "cancel" ? t("maintenance.taskDetail.cancelling") : t("maintenance.taskDetail.confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.metaFooter}><MapPin size={12} /> {t("maintenance.taskDetail.taskId")} {task.id}</div>
    </div>
  );
}