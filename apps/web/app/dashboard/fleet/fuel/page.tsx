"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Fuel,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Image,
  ExternalLink,
  Download,
  AlertTriangle,
} from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const FUEL_TYPES = ["diesel", "petrol", "electric", "hybrid", "cng"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FuelLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busFilter, setBusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    busId: "", liters: "", costPerLiter: "", totalCost: "",
    date: new Date().toISOString().split("T")[0],
    odometerReading: "", stationName: "", fuelType: "diesel", receiptUrl: "",
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("seum_access_token");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (busFilter) params.set("busId", busFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`${API}/fleet/fuel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotal(data.meta?.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, busFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const body = {
        busId: form.busId,
        liters: parseFloat(form.liters),
        costPerLiter: parseFloat(form.costPerLiter),
        totalCost: parseFloat(form.totalCost),
        date: form.date || undefined,
        odometerReading: form.odometerReading ? parseInt(form.odometerReading) : undefined,
        stationName: form.stationName || undefined,
        fuelType: form.fuelType,
        receiptUrl: form.receiptUrl || undefined,
      };
      const res = await fetch(`${API}/fleet/fuel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ busId: "", liters: "", costPerLiter: "", totalCost: "", date: new Date().toISOString().split("T")[0], odometerReading: "", stationName: "", fuelType: "diesel", receiptUrl: "" });
        fetchLogs();
      } else {
        setError(data.error?.message || "Failed to create fuel log");
      }
    } catch { setError("Network error"); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fuel Logs</h1>
          <p className={styles.pageDesc}>Track fuel consumption and costs</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Log Fuel Fill
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <input
            type="text" className={styles.filterInput} placeholder="Bus ID..."
            value={busFilter} onChange={(e) => { setBusFilter(e.target.value); setPage(1); }}
          />
          <input
            type="date" className={styles.filterInput}
            value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          />
          <input
            type="date" className={styles.filterInput}
            value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          />
        </div>
        <span className={styles.totalLabel}>{total} records</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} /> Loading fuel logs...
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>
          <Fuel size={48} style={{ opacity: 0.3 }} />
          <p>No fuel logs found.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bus ID</th>
                <th>Liters</th>
                <th>Cost/L</th>
                <th>Total Cost</th>
                <th>Odometer</th>
                <th>Station</th>
                <th>Fuel Type</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td>{formatDate(log.date)}</td>
                  <td><span className={styles.busId}>{log.busId.slice(0, 8)}</span></td>
                  <td>{log.liters} L</td>
                  <td>SAR {log.costPerLiter}</td>
                  <td><strong>SAR {log.totalCost}</strong></td>
                  <td>{log.odometerReading?.toLocaleString() || "—"}</td>
                  <td>{log.stationName || "—"}</td>
                  <td><span className={styles.fuelTypeBadge}>{log.fuelType}</span></td>
                  <td>
                    {log.receiptUrl ? (
                      <button className={styles.receiptBtn} onClick={() => setPreviewUrl(log.receiptUrl)}>
                        <Image size={14} /> View
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
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

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Log Fuel Fill</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {error && <div className={styles.formError}><AlertTriangle size={14} />{error}</div>}
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>Bus ID *</span>
                    <input required value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Date</span>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Liters *</span>
                    <input type="number" step="0.01" min="0" required value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Cost/Liter *</span>
                    <input type="number" step="0.01" min="0" required value={form.costPerLiter} onChange={(e) => setForm({ ...form, costPerLiter: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Total Cost *</span>
                    <input type="number" step="0.01" min="0" required value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Odometer (km)</span>
                    <input type="number" min="0" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Station Name</span>
                    <input value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>Fuel Type</span>
                    <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                      {FUEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>Receipt URL</span>
                    <input type="url" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} />
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Fuel Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewUrl && (
        <div className={styles.modalOverlay} onClick={() => setPreviewUrl(null)}>
          <div className={styles.receiptModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Receipt Preview</h3>
              <button className={styles.modalClose} onClick={() => setPreviewUrl(null)}><X size={18} /></button>
            </div>
            <div className={styles.receiptBody}>
              <img src={previewUrl} alt="Receipt" className={styles.receiptImg} />
              <div className={styles.receiptActions}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={styles.receiptActionBtn}>
                  <ExternalLink size={14} /> Open
                </a>
                <a href={previewUrl} download className={styles.receiptActionBtn}>
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
