"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, FileText, Pencil, Trash2, MapPin, Phone, User, Wrench, X } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const AVAILABLE_SERVICES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "tire_replacement", label: "Tire Replacement" },
  { value: "brake_inspection", label: "Brake Inspection" },
  { value: "engine_service", label: "Engine Service" },
  { value: "ac_service", label: "AC Service" },
  { value: "electrical", label: "Electrical" },
  { value: "body_repair", label: "Body Repair" },
  { value: "general_service", label: "General Service" },
  { value: "other", label: "Other" },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", in_progress: "#8b5cf6", completed: "#059669", cancelled: "#6b7280",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const EMPTY_FORM = {
  name: "", location: "", contact: "", supervisor: "", is_internal: true, services: [] as string[],
};

export default function WorkshopsPage() {
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
    if (!token) { setLoading(false); return; }
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
    if (!form.name.trim()) { setSubmitError("Workshop name is required"); return; }
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
      if (!data.success) { setSubmitError(data.error?.message || "Failed to save workshop"); return; }
      setModalOpen(false);
      fetchWorkshops();
    } catch { setSubmitError("Network error"); }
    setSubmitting(false);
  }

  async function handleDelete(w: any) {
    if (!window.confirm(`Delete workshop "${w.name}"?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/workshops/${w.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchWorkshops();
      else window.alert(data.error?.message || "Failed to delete workshop");
    } catch { window.alert("Network error"); }
  }

  async function openDetail(w: any) {
    setDetail(w);
    setDetailTab("pending");
    setDetailLoading(true);
    const token = getToken();
    if (!token) { setDetailLoading(false); return; }
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Workshops</h1>
          <p className={styles.subtitle}>Manage internal and external workshops for maintenance work.</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}><Plus size={15} /> Add Workshop</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, location or supervisor..." />
        </div>
        <select value={internalFilter} onChange={(e) => setInternalFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">All workshops</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
      </div>

      {loading ? <div className={styles.loading}>Loading workshops...</div> : (
        <div className={styles.grid}>
          {filtered.map((w) => (
            <div key={w.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                  <span className={`${styles.typeBadge} ${w.isInternal ? styles.typeInternal : styles.typeExternal}`}>
                    {w.isInternal ? "Internal" : "External"}
                  </span>
                  <div className={styles.cardActions}>
                    <button className={styles.iconBtn} title="Work Order PDF" onClick={() => openDetail(w)}><FileText size={15} /></button>
                    <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(w)}><Pencil size={15} /></button>
                    <button className={styles.iconBtn} title="Delete" onClick={() => handleDelete(w)}><Trash2 size={15} /></button>
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
                    <span>{w.services.map((s: string) => AVAILABLE_SERVICES.find((x) => x.value === s)?.label || s).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={styles.emptyState}>No workshops found — add one to get started.</div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{editing ? "Edit Workshop" : "Add Workshop"}</h2>
              <button className={styles.iconBtn} onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {submitError && <div className={styles.error}>{submitError}</div>}
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Al Wadi Garage" />
                </div>
                <div className={styles.field}>
                  <label>Type</label>
                  <select value={form.is_internal ? "internal" : "external"} onChange={(e) => setForm({ ...form, is_internal: e.target.value === "internal" })}>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, district..." />
                </div>
                <div className={styles.field}>
                  <label>Contact</label>
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Phone / email" />
                </div>
                <div className={styles.field}>
                  <label>Supervisor</label>
                  <input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} placeholder="Supervisor name" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Services Offered</label>
                <div className={styles.serviceGrid}>
                  {AVAILABLE_SERVICES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`${styles.serviceChip} ${form.services.includes(s.value) ? styles.serviceChipOn : ""}`}
                      onClick={() => toggleService(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? "Saving..." : (editing ? "Save Changes" : "Create Workshop")}
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
                <h2>{detail.workshop.name} — Work Order</h2>
                <p className={styles.modalSub}>
                  {fmtDate(new Date().toISOString())} · {detail.tasks.length} task(s) total
                </p>
              </div>
              <div className={styles.detailActions}>
                <button className={styles.pdfBtn} onClick={downloadPdf} disabled={pdfLoading}>
                  <FileText size={14} /> {pdfLoading ? "Generating..." : "Download PDF"}
                </button>
                <button className={styles.iconBtn} onClick={() => setDetail(null)}><X size={16} /></button>
              </div>
            </div>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${detailTab === "pending" ? styles.tabActive : ""}`}
                onClick={() => setDetailTab("pending")}
              >
                Pending
                <span className={styles.tabCount}>{detail.tasks.filter((t: any) => t.status === "scheduled" || t.status === "in_progress").length}</span>
              </button>
              <button
                className={`${styles.tab} ${detailTab === "completed" ? styles.tabActive : ""}`}
                onClick={() => setDetailTab("completed")}
              >
                Completed / Cancelled
                <span className={styles.tabCount}>{detail.tasks.filter((t: any) => t.status !== "scheduled" && t.status !== "in_progress").length}</span>
              </button>
            </div>
            {detailLoading ? <div className={styles.loading}>Loading tasks...</div> : (
              <div className={styles.taskList}>
                {detail.tasks
                  .filter((t: any) => detailTab === "pending"
                    ? t.status === "scheduled" || t.status === "in_progress"
                    : t.status !== "scheduled" && t.status !== "in_progress")
                  .map((t: any) => (
                    <div key={t.id} className={styles.taskItem}>
                      <div className={styles.taskMain}>
                        <span className={styles.taskType}>{t.taskType.replace(/_/g, " ")}</span>
                        <span className={styles.taskBus}>{t.bus.plateNumber} · {t.bus.make} {t.bus.model}</span>
                      </div>
                      <div className={styles.taskMeta}>
                        <span className={styles.priorityBadge} style={{ textTransform: "capitalize" }}>{t.priority}</span>
                        <span className={styles.statusBadge} style={{ color: STATUS_COLORS[t.status] || "#6b7280", background: (STATUS_COLORS[t.status] || "#6b7280") + "18" }}>
                          {STATUS_LABELS[t.status] || t.status}
                        </span>
                        <span className={styles.taskDate}>{fmtDate(t.scheduledDate)}</span>
                        {t.assignedMechanic && <span className={styles.taskMechanic}><User size={12} /> {t.assignedMechanic}</span>}
                        {t.cost != null && <span className={styles.taskCost}>{Number(t.cost).toLocaleString()} SAR</span>}
                      </div>
                      {t.description && <p className={styles.taskDesc}>{t.description}</p>}
                    </div>
                  ))}
                {detail.tasks.filter((t: any) => detailTab === "pending"
                  ? t.status === "scheduled" || t.status === "in_progress"
                  : t.status !== "scheduled" && t.status !== "in_progress").length === 0 && (
                  <div className={styles.emptyState}>No {detailTab} tasks for this workshop.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}