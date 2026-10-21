"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileText, Pencil, Trash2, MapPin, Phone, User, Wrench, X } from "lucide-react";
import { useLanguage, formatDate, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const SERVICE_KEYS: Record<string, string> = {
  oil_change: "maintenance.taskTypes.oilChange",
  tire_replacement: "maintenance.taskTypes.tireReplacement",
  brake_inspection: "maintenance.taskTypes.brakeInspection",
  engine_service: "maintenance.taskTypes.engineService",
  ac_service: "maintenance.taskTypes.acService",
  electrical: "maintenance.taskTypes.electrical",
  body_repair: "maintenance.taskTypes.bodyRepair",
  general_service: "maintenance.taskTypes.generalService",
  other: "maintenance.taskTypes.other",
};
const AVAILABLE_SERVICES = Object.keys(SERVICE_KEYS);

const STATUS_KEYS: Record<string, string> = {
  scheduled: "maintenance.status.scheduled", in_progress: "maintenance.status.inProgress", completed: "maintenance.status.completed", cancelled: "maintenance.status.cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", in_progress: "#8b5cf6", completed: "#059669", cancelled: "#6b7280",
};
const PRIORITY_KEYS: Record<string, string> = {
  low: "maintenance.priority.low", medium: "maintenance.priority.medium", high: "maintenance.priority.high", critical: "maintenance.priority.critical",
};
const TASK_KEYS: Record<string, string> = {
  oil_change: "maintenance.taskTypes.oilChange", tire_replacement: "maintenance.taskTypes.tireReplacement", brake_inspection: "maintenance.taskTypes.brakeInspection",
  engine_service: "maintenance.taskTypes.engineService", ac_service: "maintenance.taskTypes.acService", electrical: "maintenance.taskTypes.electrical",
  body_repair: "maintenance.taskTypes.bodyRepair", general_service: "maintenance.taskTypes.generalService", other: "maintenance.taskTypes.other",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

const EMPTY_FORM = {
  name: "", location: "", contact: "", supervisor: "", is_internal: true, services: [] as string[],
};

export default function WorkshopsPage() {
  const { lang, t: tr } = useLanguage();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [internalFilter, setInternalFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Task detail (work order) state
  const [detail, setDetail] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<"pending" | "completed">("pending");
  const [detailLoading, setDetailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchWorkshops = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (internalFilter === "internal") params.set("is_internal", "true");
      if (internalFilter === "external") params.set("is_internal", "false");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`${API}/maintenance/workshops?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setWorkshops(data.data || []);
    } catch {}
    setLoading(false);
  }, [search, internalFilter]);

  useEffect(() => { fetchWorkshops(); }, [fetchWorkshops]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(w: any) {
    setEditing(w);
    setForm({
      name: w.name, location: w.location || "", contact: w.contact || "",
      supervisor: w.supervisor || "", is_internal: w.isInternal, services: w.services || [],
    });
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!form.name.trim()) { setSubmitError(tr("maintenance.workshops.reqName")); return; }
    setSubmitting(true);
    const token = getToken();
    try {
      const payload = {
        name: form.name.trim(), location: form.location.trim() || undefined,
        contact: form.contact.trim() || undefined, supervisor: form.supervisor.trim() || undefined,
        is_internal: form.is_internal, services: form.services,
      };
      const res = await fetch(`${API}/maintenance/workshops${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setSubmitError(data.error?.message || tr("maintenance.workshops.failedSave")); return; }
      setModalOpen(false);
      fetchWorkshops();
    } catch { setSubmitError(tr("maintenance.common.networkError")); }
    setSubmitting(false);
  }

  async function handleDelete(w: any) {
    if (!window.confirm(`${tr("maintenance.workshops.deleteConfirmPre")} "${w.name}"?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/workshops/${w.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchWorkshops();
      else window.alert(data.error?.message || tr("maintenance.workshops.deleteFailed"));
    } catch { window.alert(tr("maintenance.common.networkError")); }
  }

  async function openDetail(w: any) {
    setDetail(w);
    setDetailTab("pending");
    setDetailLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/workshops/${w.id}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDetail(data.data);
    } catch {}
    setDetailLoading(false);
  }

  function toggleService(v: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(v) ? f.services.filter((s) => s !== v) : [...f.services, v],
    }));
  }

  async function downloadPdf() {
    if (!detail) return;
    setPdfLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/workshops/${detail.workshop.id}/work-order.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-order-${detail.workshop.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setPdfLoading(false);
  }

  const filtered = workshops.filter((w) =>
    !search.trim() || (w.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const pendingTasks = (detail?.tasks || []).filter((task: any) => task.status === "scheduled" || task.status === "in_progress");
  const doneTasks = (detail?.tasks || []).filter((task: any) => task.status !== "scheduled" && task.status !== "in_progress");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{tr("maintenance.workshops.title")}</h1>
          <p className={styles.subtitle}>{tr("maintenance.workshops.sub")}</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}><Plus size={15} /> {tr("maintenance.workshops.addBtn")}</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("maintenance.workshops.searchPh")} />
        </div>
        <select value={internalFilter} onChange={(e) => setInternalFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">{tr("maintenance.workshops.filterAll")}</option>
          <option value="internal">{tr("maintenance.workshops.optInternal")}</option>
          <option value="external">{tr("maintenance.workshops.optExternal")}</option>
        </select>
      </div>

      {loading ? <div className={styles.loading}>{tr("maintenance.workshops.loading")}</div> : (
        <div className={styles.grid}>
          {filtered.map((w) => (
            <div key={w.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                  <span className={`${styles.typeBadge} ${w.isInternal ? styles.typeInternal : styles.typeExternal}`}>
                    {w.isInternal ? tr("maintenance.workshops.optInternal") : tr("maintenance.workshops.optExternal")}
                  </span>
                  <div className={styles.cardActions}>
                    <button className={styles.iconBtn} title={tr("maintenance.workshops.titlePdf")} onClick={() => openDetail(w)}><FileText size={15} /></button>
                    <button className={styles.iconBtn} title={tr("common.edit")} onClick={() => openEdit(w)}><Pencil size={15} /></button>
                    <button className={styles.iconBtn} title={tr("common.delete")} onClick={() => handleDelete(w)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <h3 className={styles.cardName}>{w.name}</h3>
              </div>
              <div className={styles.cardBody}>
                {w.location && <div className={styles.infoRow}><MapPin size={14} /> {w.location}</div>}
                {w.contact && <div className={styles.infoRow}><Phone size={14} /> {w.contact}</div>}
                {w.supervisor && <div className={styles.infoRow}><User size={14} /> {w.supervisor}</div>}
                {w.services.length > 0 && (
                  <div className={styles.services}>
                    <Wrench size={13} />
                    <span>{w.services.map((s: string) => tr(SERVICE_KEYS[s] || s)).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={styles.emptyState}>{tr("maintenance.workshops.empty")}</div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{editing ? tr("maintenance.workshops.modalEditTitle") : tr("maintenance.workshops.addBtn")}</h2>
              <button className={styles.iconBtn} onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {submitError && <div className={styles.error}>{submitError}</div>}
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>{tr("maintenance.workshops.formName")}</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("maintenance.workshops.phName")} />
                </div>
                <div className={styles.field}>
                  <label>{tr("maintenance.workshops.formType")}</label>
                  <select value={form.is_internal ? "internal" : "external"} onChange={(e) => setForm({ ...form, is_internal: e.target.value === "internal" })}>
                    <option value="internal">{tr("maintenance.workshops.optInternal")}</option>
                    <option value="external">{tr("maintenance.workshops.optExternal")}</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>{tr("maintenance.workshops.formLocation")}</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={tr("maintenance.workshops.phLocation")} />
                </div>
                <div className={styles.field}>
                  <label>{tr("maintenance.workshops.formContact")}</label>
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder={tr("maintenance.workshops.phContact")} />
                </div>
                <div className={styles.field}>
                  <label>{tr("maintenance.workshops.formSupervisor")}</label>
                  <input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} placeholder={tr("maintenance.workshops.phSupervisor")} />
                </div>
              </div>
              <div className={styles.field}>
                <label>{tr("maintenance.workshops.formServices")}</label>
                <div className={styles.serviceGrid}>
                  {AVAILABLE_SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.serviceChip} ${form.services.includes(s) ? styles.serviceChipOn : ""}`}
                      onClick={() => toggleService(s)}
                    >
                      {tr(SERVICE_KEYS[s])}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>{tr("common.cancel")}</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? tr("drivers.common.saving") : (editing ? tr("drivers.edit.saveChanges") : tr("maintenance.workshops.createBtn"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <h2>{detail.workshop.name} {tr("maintenance.workshops.detailWorkOrder")}</h2>
                <p className={styles.modalSub}>
                  {formatDate(new Date().toISOString(), lang)} · {detail.tasks.length} {tr("maintenance.workshops.tasksTotalPost")}
                </p>
              </div>
              <div className={styles.detailActions}>
                <button className={styles.pdfBtn} onClick={downloadPdf} disabled={pdfLoading}>
                  <FileText size={14} /> {pdfLoading ? tr("drivers.payroll.generating") : tr("maintenance.workshops.pdfBtn")}
                </button>
                <button className={styles.iconBtn} onClick={() => setDetail(null)}><X size={16} /></button>
              </div>
            </div>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${detailTab === "pending" ? styles.tabActive : ""}`}
                onClick={() => setDetailTab("pending")}
              >
                {tr("maintenance.taskDetail.pending")}
                <span className={styles.tabCount}>{pendingTasks.length}</span>
              </button>
              <button
                className={`${styles.tab} ${detailTab === "completed" ? styles.tabActive : ""}`}
                onClick={() => setDetailTab("completed")}
              >
                {tr("maintenance.workshops.tabCompleted")}
                <span className={styles.tabCount}>{doneTasks.length}</span>
              </button>
            </div>
            {detailLoading ? <div className={styles.loading}>{tr("maintenance.list.loading")}</div> : (
              <div className={styles.taskList}>
                {(detailTab === "pending" ? pendingTasks : doneTasks)
                  .map((task: any) => (
                    <div key={task.id} className={styles.taskItem}>
                      <div className={styles.taskMain}>
                        <span className={styles.taskType}>{tr(TASK_KEYS[task.taskType] || task.taskType)}</span>
                        <span className={styles.taskBus}>{task.bus.plateNumber} · {task.bus.make} {task.bus.model}</span>
                      </div>
                      <div className={styles.taskMeta}>
                        <span className={styles.priorityBadge} style={{ textTransform: "capitalize" }}>{tr(PRIORITY_KEYS[task.priority] || task.priority)}</span>
                        <span className={styles.statusBadge} style={{ color: STATUS_COLORS[task.status] || "#6b7280", background: (STATUS_COLORS[task.status] || "#6b7280") + "18" }}>
                          {tr(STATUS_KEYS[task.status] || task.status)}
                        </span>
                        <span className={styles.taskDate}>{formatDate(task.scheduledDate, lang)}</span>
                        {task.assignedMechanic && <span className={styles.taskMechanic}><User size={12} /> {task.assignedMechanic}</span>}
                        {task.cost != null && <span className={styles.taskCost}>{formatCurrency(task.cost, lang)}</span>}
                      </div>
                      {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                    </div>
                  ))}
                {(detailTab === "pending" ? pendingTasks : doneTasks).length === 0 && (
                  <div className={styles.emptyState}>{tr("maintenance.workshops.noPre")} {detailTab === "pending" ? tr("maintenance.workshops.emptyPendingTab") : tr("maintenance.workshops.emptyCompletedTab")} {tr("maintenance.workshops.noPost")}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
