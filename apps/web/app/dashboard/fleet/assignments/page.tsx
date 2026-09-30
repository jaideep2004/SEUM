"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "fleet.assignments.st.scheduled", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  active: { label: "fleet.assignments.st.active", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  completed: { label: "fleet.assignments.st.completed", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  cancelled: { label: "fleet.assignments.st.cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function AssignmentsPage() {
  const { lang, t } = useLanguage();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [busFilter, setBusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState("");
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const emptyForm = {
    busId: "", routeName: "", depotName: "", driverId: "", driverName: "",
    startDate: "", endDate: "", status: "scheduled" as const, notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set("status", statusFilter);
      if (busFilter) params.set("busId", busFilter);
      const res = await fetch(`${API}/fleet/assignments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAssignments(data.data);
        setTotal(data.meta?.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, busFilter]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("seum_access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      try {
        const [b, d] = await Promise.all([
          fetch(`${API}/fleet/buses?page=1&pageSize=100`, { headers }).then(r => r.json()),
          fetch(`${API}/drivers?page=1&pageSize=100`, { headers }).then(r => r.json()),
        ]);
        if (b.success) setBuses((b.data || []).sort((x: any, y: any) => x.plateNumber.localeCompare(y.plateNumber)));
        if (d.success) setDrivers(d.data || []);
      } catch {}
    })();
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({
      busId: a.busId, routeName: a.routeName || "", depotName: a.depotName || "",
      driverId: a.driverId || "", driverName: a.driverName || "",
      startDate: a.startDate, endDate: a.endDate || "", status: a.status, notes: a.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const body = {
        busId: form.busId,
        routeName: form.routeName || undefined,
        depotName: form.depotName || undefined,
        driverId: form.driverId || undefined,
        driverName: form.driverName || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };

      const url = editing
        ? `${API}/fleet/assignments/${editing.id}`
        : `${API}/fleet/assignments`;
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setEditing(null);
        fetchAssignments();
      } else {
        setError(data.error?.message || t("fleet.assignments.saveFailed"));
      }
    } catch { setError(t("fleet.assignments.networkError")); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("fleet.assignments.title")}</h1>
          <p className={styles.pageDesc}>{t("fleet.assignments.desc")}</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}>
          <Plus size={14} /> {t("fleet.assignments.new")}
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <select className={styles.filterInput} value={busFilter}
            onChange={(e) => { setBusFilter(e.target.value); setPage(1); }}>
            <option value="">{t("fleet.assignments.allBuses")}</option>
            {buses.map((b: any) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
          </select>
          <select className={styles.filterInput} value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">{t("fleet.assignments.allStatuses")}</option>
            <option value="scheduled">{t("fleet.assignments.st.scheduled")}</option>
            <option value="active">{t("fleet.assignments.st.active")}</option>
            <option value="completed">{t("fleet.assignments.st.completed")}</option>
            <option value="cancelled">{t("fleet.assignments.st.cancelled")}</option>
          </select>
        </div>
        <span className={styles.totalLabel}>{total} {t("fleet.assignments.count")}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} /> {t("fleet.assignments.loading")}</div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={48} style={{ opacity: 0.3 }} />
          <p>{t("fleet.assignments.empty")}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("fleet.assignments.colBus")}</th>
                <th>{t("fleet.assignments.colRoute")}</th>
                <th>{t("fleet.assignments.colDepot")}</th>
                <th>{t("fleet.assignments.colDriver")}</th>
                <th>{t("fleet.assignments.colStart")}</th>
                <th>{t("fleet.assignments.colEnd")}</th>
                <th>{t("fleet.assignments.colStatus")}</th>
                <th>{t("fleet.assignments.colNotes")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => {
                const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.scheduled;
                return (
                  <tr key={a.id}>
                    <td>
                      <span className={styles.busCell}>
                        <span className={styles.plateNumber}>{a.plateNumber}</span>
                        <span className={styles.busModel}>{a.busMake} {a.busModel}</span>
                      </span>
                    </td>
                    <td>{a.routeName || "—"}</td>
                    <td>{a.depotName || "—"}</td>
                    <td>{a.driverName || a.driverId?.slice(0, 8) || "—"}</td>
                    <td>{formatDate(a.startDate, lang)}</td>
                    <td>{a.endDate ? formatDate(a.endDate, lang) : "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
                        {t(cfg.label)}
                      </span>
                    </td>
                    <td className={styles.notesCell}>{a.notes || "—"}</td>
                    <td>
                      <button className={styles.editBtn} onClick={() => openEdit(a)}>
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span>{total} {t("fleet.assignments.records")} — {t("fleet.assignments.page")} {page} {t("fleet.assignments.of")} {totalPages}</span>
          <div className={styles.paginationBtns}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editing ? t("fleet.assignments.editTitle") : t("fleet.assignments.newTitle")}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {error && <div className={styles.formError}><AlertTriangle size={14} />{error}</div>}
                <div className={styles.formGrid}>
                  <label className={styles.formFieldFull}>
                    <span>{t("fleet.assignments.fBus")}</span>
                    <select required value={form.busId} disabled={!!editing}
                      onChange={(e) => setForm({ ...form, busId: e.target.value })}>
                      <option value="">{t("fleet.assignments.selectBus")}</option>
                      {buses.map((b: any) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.assignments.fRoute")}</span>
                    <input value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.assignments.fDepot")}</span>
                    <input value={form.depotName} onChange={(e) => setForm({ ...form, depotName: e.target.value })} />
                  </label>
                  <label className={styles.formFieldFull}>
                    <span>{t("fleet.assignments.fDriver")}</span>
                    <select value={form.driverId} onChange={(e) => {
                      const dv = drivers.find((x: any) => x.id === e.target.value);
                      setForm({ ...form, driverId: e.target.value, driverName: dv?.name || "" });
                    }}>
                      <option value="">{t("fleet.assignments.noDriver")}</option>
                      {editing && form.driverId && !drivers.some((x: any) => x.id === form.driverId) && (
                        <option value={form.driverId}>{form.driverName || form.driverId.slice(0, 8)}</option>
                      )}
                      {drivers.map((dv: any) => <option key={dv.id} value={dv.id}>{dv.name}{dv.employeeCode ? ` (${dv.employeeCode})` : ""}</option>)}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.assignments.fStart")}</span>
                    <input type="date" required value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.assignments.fEnd")}</span>
                    <input type="date" value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.assignments.fStatus")}</span>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                      <option value="scheduled">{t("fleet.assignments.st.scheduled")}</option>
                      <option value="active">{t("fleet.assignments.st.active")}</option>
                      <option value="completed">{t("fleet.assignments.st.completed")}</option>
                      <option value="cancelled">{t("fleet.assignments.st.cancelled")}</option>
                    </select>
                  </label>
                  <label className={styles.formFieldFull}>
                    <span>{t("fleet.assignments.fNotes")}</span>
                    <textarea rows={2} value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>{t("common.cancel")}</button>
                <button type="submit" className={styles.saveBtn}>{editing ? t("fleet.assignments.updateBtn") : t("fleet.assignments.createBtn")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
