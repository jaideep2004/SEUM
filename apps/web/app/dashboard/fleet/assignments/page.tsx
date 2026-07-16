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
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  active: { label: "Active", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  completed: { label: "Completed", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AssignmentsPage() {
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
        setError(data.error?.message || "Failed to save assignment");
      }
    } catch { setError("Network error"); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Assignments</h1>
          <p className={styles.pageDesc}>Bus route and driver scheduling</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}>
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <input type="text" className={styles.filterInput} placeholder="Bus ID..."
            value={busFilter} onChange={(e) => { setBusFilter(e.target.value); setPage(1); }} />
          <select className={styles.filterInput} value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <span className={styles.totalLabel}>{total} assignments</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}><div className={styles.spinner} /> Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={48} style={{ opacity: 0.3 }} />
          <p>No assignments found.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bus</th>
                <th>Route</th>
                <th>Depot</th>
                <th>Driver</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Notes</th>
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
                    <td>{formatDate(a.startDate)}</td>
                    <td>{a.endDate ? formatDate(a.endDate) : "—"}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
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
          <span>{total} records — Page {page} of {totalPages}</span>
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
              <h3>{editing ? "Edit Assignment" : "New Assignment"}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {error && <div className={styles.formError}><AlertTriangle size={14} />{error}</div>}
                <div className={styles.formGrid}>
                  <label className={styles.formFieldFull}>
                    <span>Bus ID *</span>
                    <input required value={form.busId} disabled={!!editing}
                      onChange={(e) => setForm({ ...form, busId: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Route Name</span>
                    <input value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Depot Name</span>
                    <input value={form.depotName} onChange={(e) => setForm({ ...form, depotName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Driver Name</span>
                    <input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Driver ID</span>
                    <input value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Start Date *</span>
                    <input type="date" required value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>End Date</span>
                    <input type="date" value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Status</span>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label className={styles.formFieldFull}>
                    <span>Notes</span>
                    <textarea rows={2} value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>{editing ? "Update" : "Create"} Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
