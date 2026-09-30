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
import { API_URL } from "@/services/api";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

const FUEL_TYPES = ["diesel", "petrol", "electric", "hybrid", "cng"];

export default function FuelLogsPage() {
  const { lang, t } = useLanguage();
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
  const [buses, setBuses] = useState<any[]>([]);

  const [form, setForm] = useState({
    busId: "", liters: "", costPerLiter: "", totalCost: "",
    date: new Date().toISOString().split("T")[0],
    odometerReading: "", stationName: "", fuelType: "diesel", receiptUrl: "",
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (busFilter) params.set("busId", busFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`${API_URL}/fleet/fuel?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        setTotal(json.meta?.total || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, pageSize, busFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API_URL}/fleet/buses?page=1&pageSize=100`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        const json = await res.json();
        if (json.success) setBuses((json.data || []).sort((a: any, b: any) => a.plateNumber.localeCompare(b.plateNumber)));
      } catch {}
    })();
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
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
      const res = await fetch(`${API_URL}/fleet/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ busId: "", liters: "", costPerLiter: "", totalCost: "", date: new Date().toISOString().split("T")[0], odometerReading: "", stationName: "", fuelType: "diesel", receiptUrl: "" });
        fetchLogs();
      } else {
        setError(data.error?.message || t("fleet.fuel.createFailed"));
      }
    } catch { setError(t("fleet.fuel.networkError")); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("fleet.fuel.title")}</h1>
          <p className={styles.pageDesc}>{t("fleet.fuel.desc")}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Plus size={14} /> {t("fleet.fuel.logFill")}
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <select className={styles.filterInput} value={busFilter}
            onChange={(e) => { setBusFilter(e.target.value); setPage(1); }}>
            <option value="">{t("fleet.fuel.allBuses")}</option>
            {buses.map((b: any) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
          </select>
          <input
            type="date" className={styles.filterInput}
            value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          />
          <input
            type="date" className={styles.filterInput}
            value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          />
        </div>
        <span className={styles.totalLabel}>{total} {t("fleet.fuel.records")}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} /> {t("fleet.fuel.loading")}
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>
          <Fuel size={48} style={{ opacity: 0.3 }} />
          <p>{t("fleet.fuel.empty")}</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("fleet.fuel.colDate")}</th>
                <th>{t("fleet.fuel.colBus")}</th>
                <th>{t("fleet.fuel.colLiters")}</th>
                <th>{t("fleet.fuel.colCostL")}</th>
                <th>{t("fleet.fuel.colTotal")}</th>
                <th>{t("fleet.fuel.colOdometer")}</th>
                <th>{t("fleet.fuel.colStation")}</th>
                <th>{t("fleet.fuel.colFuelType")}</th>
                <th>{t("fleet.fuel.colReceipt")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td>{formatDate(log.date, lang)}</td>
                  <td><span className={styles.busId}>{buses.find((b: any) => b.id === log.busId)?.plateNumber || log.busId.slice(0, 8)}</span></td>
                  <td>{log.liters} {t("fleet.fuel.litersUnit")}</td>
                  <td>{t("fleet.fuel.sar")} {log.costPerLiter}</td>
                  <td><strong>{t("fleet.fuel.sar")} {log.totalCost}</strong></td>
                  <td>{log.odometerReading?.toLocaleString() || "—"}</td>
                  <td>{log.stationName || "—"}</td>
                  <td><span className={styles.fuelTypeBadge}>{log.fuelType}</span></td>
                  <td>
                    {log.receiptUrl ? (
                      <button className={styles.receiptBtn} onClick={() => setPreviewUrl(log.receiptUrl)}>
                        <Image size={14} /> {t("fleet.fuel.view")}
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
          <span>{total} {t("fleet.fuel.records")} — {t("fleet.fuel.page")} {page} {t("fleet.fuel.of")} {totalPages}</span>
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
              <h3>{t("fleet.fuel.logFill")}</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {error && <div className={styles.formError}><AlertTriangle size={14} />{error}</div>}
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fBus")}</span>
                    <select required value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })}>
                      <option value="">{t("fleet.fuel.selectBus")}</option>
                      {buses.map((b: any) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.model}</option>)}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fDate")}</span>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fLiters")}</span>
                    <input type="number" step="0.01" min="0" required value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fCostL")}</span>
                    <input type="number" step="0.01" min="0" required value={form.costPerLiter} onChange={(e) => setForm({ ...form, costPerLiter: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fTotal")}</span>
                    <input type="number" step="0.01" min="0" required value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fOdometer")}</span>
                    <input type="number" min="0" value={form.odometerReading} onChange={(e) => setForm({ ...form, odometerReading: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fStation")}</span>
                    <input value={form.stationName} onChange={(e) => setForm({ ...form, stationName: e.target.value })} />
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fType")}</span>
                    <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                      {FUEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className={styles.formField}>
                    <span>{t("fleet.fuel.fReceipt")}</span>
                    <input type="url" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} />
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>{t("common.cancel")}</button>
                <button type="submit" className={styles.saveBtn}>{t("fleet.fuel.save")}</button>
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
              <h3>{t("fleet.fuel.receiptTitle")}</h3>
              <button className={styles.modalClose} onClick={() => setPreviewUrl(null)}><X size={18} /></button>
            </div>
            <div className={styles.receiptBody}>
              <img src={previewUrl} alt={t("fleet.fuel.receiptAlt")} className={styles.receiptImg} />
              <div className={styles.receiptActions}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={styles.receiptActionBtn}>
                  <ExternalLink size={14} /> {t("fleet.fuel.open")}
                </a>
                <a href={previewUrl} download className={styles.receiptActionBtn}>
                  <Download size={14} /> {t("fleet.fuel.download")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
