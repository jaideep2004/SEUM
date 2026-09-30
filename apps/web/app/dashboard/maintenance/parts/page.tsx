"use client";
import { useState, useEffect, useCallback } from "react";
import { Package, Plus, History, AlertTriangle, Wrench, ArrowDownToLine, ArrowUpFromLine, PenLine, Truck } from "lucide-react";
import { useLanguage, formatDate, formatDateTime, formatNumber } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

const TASK_KEYS: Record<string, string> = {
  oil_change: "maintenance.taskTypes.oilChange", tire_replacement: "maintenance.taskTypes.tireReplacement", brake_inspection: "maintenance.taskTypes.brakeInspection",
  engine_service: "maintenance.taskTypes.engineService", ac_service: "maintenance.taskTypes.acService", electrical: "maintenance.taskTypes.electrical",
  body_repair: "maintenance.taskTypes.bodyRepair", general_service: "maintenance.taskTypes.generalService", other: "maintenance.taskTypes.other",
};
const OPEN_STATUS_KEYS: Record<string, string> = {
  scheduled: "maintenance.status.scheduled", in_progress: "maintenance.status.inProgress",
};

export default function PartsPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"inventory" | "add" | "usage">("inventory");

  // Inventory state
  const [parts, setParts] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  // Add part form
  const [form, setForm] = useState({
    part_code: "", part_name: "", category: "", manufacturer: "", unit_of_measure: "unit",
    quantity_in_stock: "0", reorder_level: "5", unit_price: "", supplier_id: "", storage_location: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [stockModal, setStockModal] = useState<{ part: any; type: "in" | "out" } | null>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [refInput, setRefInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Usage state
  const [usageBus, setUsageBus] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchBuses = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/fleet/buses?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const list = (data.data || []).filter((b: any) => b.status !== "retired" && b.status !== "sold");
        setBuses(list);
        setUsageBus(list[0]?.id || "");
        if (!form.quantity_in_stock) setForm((f) => ({ ...f, quantity_in_stock: "0" }));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchBuses(); }, [fetchBuses]);

  async function fetchParts() {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (lowOnly) params.set("lowStock", "true");
      const res = await fetch(`${API}/maintenance/parts?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setParts(data.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (activeTab === "inventory") fetchParts(); }, [activeTab, search, categoryFilter, lowOnly]);

  async function fetchUsage() {
    if (!usageBus) return;
    setUsageLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/parts/usage/${usageBus}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setUsage(data.data);
    } catch {}
    setUsageLoading(false);
  }

  useEffect(() => { if (activeTab === "usage" && usageBus) fetchUsage(); }, [activeTab, usageBus]);

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          part_code: form.part_code, part_name: form.part_name,
          category: form.category || undefined, manufacturer: form.manufacturer || undefined,
          unit_of_measure: form.unit_of_measure,
          quantity_in_stock: Number(form.quantity_in_stock) || 0,
          reorder_level: Number(form.reorder_level) || 0,
          unit_price: form.unit_price ? Number(form.unit_price) : undefined,
          supplier_id: form.supplier_id || undefined,
          storage_location: form.storage_location || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSubmitError(data.error?.message || t("maintenance.parts.failedCreate")); return; }
      setForm({ part_code: "", part_name: "", category: "", manufacturer: "", unit_of_measure: "unit", quantity_in_stock: "0", reorder_level: "5", unit_price: "", supplier_id: "", storage_location: "" });
      setActiveTab("inventory");
      fetchParts();
    } catch { setSubmitError(t("maintenance.common.networkError")); }
    setSubmitting(false);
  }

  function openStock(part: any, type: "in" | "out") {
    setStockModal({ part, type });
    setQtyInput("");
    setPriceInput(part.unitPrice != null ? String(part.unitPrice) : "");
    setSupplierInput("");
    setTaskInput("");
    setNotesInput("");
    setRefInput("");
    setModalError("");
  }

  function openEdit(part: any) {
    setEditModal(part);
    setEditForm({
      part_code: part.partCode, part_name: part.partName, category: part.category || "",
      manufacturer: part.manufacturer || "", unit_of_measure: part.unitOfMeasure,
      reorder_level: String(part.reorderLevel), unit_price: part.unitPrice != null ? String(part.unitPrice) : "",
      supplier_id: part.supplierId || "", storage_location: part.storageLocation || "",
    });
    setModalError("");
  }

  async function submitStock() {
    if (!stockModal) return;
    setModalLoading(true);
    setModalError("");
    const token = getToken();
    const { part, type } = stockModal;
    try {
      const body: any = { quantity: Number(qtyInput) };
      if (type === "in") {
        body.unit_price = priceInput ? Number(priceInput) : undefined;
        body.supplier_id = supplierInput || undefined;
        body.reference_type = "purchase";
        body.notes = notesInput || undefined;
      } else {
        if (taskInput) body.maintenance_task_id = taskInput;
        if (refInput) body.reference_id = refInput;
        body.notes = notesInput || undefined;
      }
      const res = await fetch(`${API}/maintenance/parts/${part.id}/${type === "in" ? "stock-in" : "stock-out"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setModalError(data.error?.message || t("maintenance.taskDetail.actionFailed")); return; }
      setStockModal(null);
      fetchParts();
    } catch { setModalError(t("maintenance.common.networkError")); }
    setModalLoading(false);
  }

  function openEditModal() {
    if (!editModal) return;
    setEditLoading(true);
    setModalError("");
    const token = getToken();
    fetch(`${API}/maintenance/parts/${editModal.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setEditModal(d.data || editModal); })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setEditLoading(true);
    setModalError("");
    const token = getToken();
    try {
      const res = await fetch(`${API}/maintenance/parts/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          part_code: editForm.part_code, part_name: editForm.part_name,
          category: editForm.category || undefined, manufacturer: editForm.manufacturer || undefined,
          unit_of_measure: editForm.unit_of_measure,
          reorder_level: Number(editForm.reorder_level) || 0,
          unit_price: editForm.unit_price ? Number(editForm.unit_price) : undefined,
          supplier_id: editForm.supplier_id || undefined,
          storage_location: editForm.storage_location || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setModalError(data.error?.message || t("maintenance.parts.updateFailed")); return; }
      setEditModal(null);
      fetchParts();
    } catch { setModalError(t("maintenance.common.networkError")); }
    setEditLoading(false);
  }

  const lowCount = parts.filter((p) => p.lowStock).length;
  const categories = [...new Set(parts.map((p) => p.category).filter(Boolean))];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{t("maintenance.parts.title")}</h1>
          <p className={styles.subtitle}>{t("maintenance.parts.sub")}</p>
        </div>
        {activeTab === "inventory" && lowCount > 0 && (
          <span className={styles.lowBanner}><AlertTriangle size={14} /> {lowCount} {t("maintenance.parts.lowBannerPost")}</span>
        )}
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "inventory" ? styles.tabActive : ""}`} onClick={() => setActiveTab("inventory")}><Package size={14} /> {t("maintenance.parts.tabInventory")}</button>
        <button className={`${styles.tab} ${activeTab === "add" ? styles.tabActive : ""}`} onClick={() => setActiveTab("add")}><Plus size={14} /> {t("maintenance.parts.tabAdd")}</button>
        <button className={`${styles.tab} ${activeTab === "usage" ? styles.tabActive : ""}`} onClick={() => setActiveTab("usage")}><History size={14} /> {t("maintenance.parts.tabUsage")}</button>
      </div>

      {activeTab === "inventory" && (
        <>
          <div className={styles.filters}>
            <input className={styles.searchInput} placeholder={t("maintenance.parts.searchPh")} value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">{t("maintenance.parts.filterCat")}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className={styles.lowToggle}>
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              {t("maintenance.parts.lowOnly")}
            </label>
          </div>

          {loading ? <div className={styles.loading}>{t("maintenance.parts.loading")}</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("maintenance.parts.colPart")}</th><th>{t("maintenance.parts.colCategory")}</th><th>{t("maintenance.parts.colStock")}</th><th>{t("maintenance.parts.colReorder")}</th><th>{t("maintenance.parts.colPrice")}</th><th>{t("maintenance.parts.colLocation")}</th><th>{t("maintenance.parts.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={styles.partName}>{p.partName}</span>
                        <div className={styles.cellSub}>{p.partCode}</div>
                        {p.manufacturer && <div className={styles.cellSub}>{p.manufacturer}</div>}
                      </td>
                      <td>{p.category || "—"}</td>
                      <td>
                        <span className={`${p.lowStock ? styles.qtyLow : styles.qtyOk}`}>
                          {p.quantityInStock} {p.unitOfMeasure}
                        </span>
                        {p.lowStock && <span className={styles.lowBadge}>{t("maintenance.parts.lowBadge")}</span>}
                      </td>
                      <td>{p.reorderLevel} {p.unitOfMeasure}</td>
                      <td>{p.unitPrice != null ? formatNumber(Number(p.unitPrice), lang) : "—"}</td>
                      <td>{p.storageLocation || "—"}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button className={styles.stockInBtn} onClick={() => openStock(p, "in")} title={t("maintenance.parts.modalInTitle")}><ArrowDownToLine size={12} /> {t("maintenance.parts.btnIn")}</button>
                          <button className={styles.stockOutBtn} onClick={() => openStock(p, "out")} title={t("maintenance.parts.modalOutTitle")}><ArrowUpFromLine size={12} /> {t("maintenance.parts.btnOut")}</button>
                          <button className={styles.editBtn} onClick={() => openEdit(p)} title={t("common.edit")}><PenLine size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {parts.length === 0 && (
                    <tr><td colSpan={7} className={styles.emptyState}>{t("maintenance.parts.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "add" && (
        <form className={styles.form} onSubmit={handleAddPart}>
          {submitError && <div className={styles.error}>{submitError}</div>}
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formCode")}</label>
              <input type="text" value={form.part_code} onChange={(e) => setForm({ ...form, part_code: e.target.value })} placeholder={t("maintenance.parts.phCode")} required />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formName")}</label>
              <input type="text" value={form.part_name} onChange={(e) => setForm({ ...form, part_name: e.target.value })} placeholder={t("maintenance.parts.phName")} required />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formCategory")}</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t("maintenance.parts.phCategory")} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formManufacturer")}</label>
              <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formUnit")}</label>
              <input type="text" value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formQty")}</label>
              <input type="number" min="0" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.colReorder")}</label>
              <input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.colPrice")}</label>
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formSupplier")}</label>
              <input type="text" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} placeholder={t("maintenance.parts.phSupplier")} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formLocation")}</label>
              <input type="text" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder={t("maintenance.parts.phLocation")} />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.part_code.trim() || !form.part_name.trim()}>
              {submitting ? t("drivers.new.creating") : t("maintenance.parts.createBtn")}
            </button>
          </div>
        </form>
      )}

      {activeTab === "usage" && (
        <div className={styles.usageWrap}>
          <div className={styles.filters}>
            <label className={styles.busLabel}><Truck size={14} /> {t("maintenance.breakdowns.colBus")}</label>
            <select value={usageBus} onChange={(e) => setUsageBus(e.target.value)} className={styles.filterSelect}>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.make} {b.model}</option>)}
            </select>
          </div>
          {usageLoading ? <div className={styles.loading}>{t("maintenance.parts.usageLoading")}</div> : (
            usage && (
              <>
                <div className={styles.usageStats}>
                  <div className={styles.usageStat}><strong>{usage.totalParts}</strong> {t("maintenance.parts.usagePartsUsed")}</div>
                  <div className={styles.usageStatCost}><strong>{formatNumber(Number(usage.totalCost), lang)}</strong> {t("maintenance.parts.usageTotalCost")}</div>
                  <div className={styles.usageStatItems}><strong>{usage.items.length}</strong> {t("maintenance.parts.usageMovements")}</div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>{t("maintenance.parts.colPart")}</th><th>{t("maintenance.parts.uColQty")}</th><th>{t("maintenance.parts.colPrice")}</th><th>{t("maintenance.costs.colTotal")}</th><th>{t("maintenance.parts.uColDate")}</th><th>{t("maintenance.parts.uColTask")}</th></tr>
                    </thead>
                    <tbody>
                      {usage.items.map((item: any) => (
                        <tr key={item.id}>
                          <td>
                            <span className={styles.partName}>{item.partName}</span>
                            <div className={styles.cellSub}>{item.partCode}</div>
                          </td>
                          <td>{item.quantity} {item.unitOfMeasure}</td>
                          <td>{item.unitPrice != null ? formatNumber(Number(item.unitPrice), lang) : "—"}</td>
                          <td>{item.total != null ? formatNumber(Number(item.total), lang) : "—"}</td>
                          <td>{formatDateTime(item.date, lang)}</td>
                          <td>
                            <span className={styles.taskType}><Wrench size={12} /> {t(TASK_KEYS[item.task?.taskType] || item.task?.taskType || "—")}</span>
                            {item.task?.scheduledDate && <div className={styles.cellSub}>{formatDate(item.task.scheduledDate, lang)}</div>}
                          </td>
                        </tr>
                      ))}
                      {usage.items.length === 0 && (
                        <tr><td colSpan={6} className={styles.emptyState}>{t("maintenance.parts.usageEmpty")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Stock in/out modal */}
      {stockModal && (
        <div className={styles.overlay} onClick={() => setStockModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{stockModal.type === "in" ? t("maintenance.parts.modalInTitle") : t("maintenance.parts.modalOutTitle")}</h2>
            <p className={styles.modalSub}>
              {stockModal.part.partName} ({stockModal.part.partCode}) — {stockModal.part.quantityInStock} {t("maintenance.parts.modalSubInStock")}
            </p>
            {modalError && <div className={styles.error}>{modalError}</div>}
            <div className={styles.field}>
              <label>{t("maintenance.parts.mQty")}</label>
              <input type="number" min="1" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} />
            </div>
            {stockModal.type === "in" ? (
              <>
                <div className={styles.field}>
                  <label>{t("maintenance.parts.colPrice")}</label>
                  <input type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>{t("maintenance.parts.formSupplier")}</label>
                  <input type="text" value={supplierInput} onChange={(e) => setSupplierInput(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>{t("maintenance.parts.mRef")}</label>
                  <input type="text" value={refInput} onChange={(e) => setRefInput(e.target.value)} placeholder={t("maintenance.parts.phRefIn")} />
                </div>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label>{t("maintenance.parts.mTaskLink")}</label>
                  <select value={taskInput} onChange={(e) => setTaskInput(e.target.value)}>
                    <option value="">{t("maintenance.parts.noTask")}</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>{task.bus?.plateNumber} — {t(TASK_KEYS[task.taskType] || task.taskType)} ({t(OPEN_STATUS_KEYS[task.status] || task.status)})</option>
                    ))}
                  </select>
                  <button type="button" className={styles.loadTasksBtn} onClick={async () => {
                    const token = getToken();
                    try {
                      const res = await fetch(`${API}/maintenance/tasks?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
                      const data = await res.json();
                      if (data.success) setTasks((data.data || []).filter((task: any) => task.status !== "completed" && task.status !== "cancelled"));
                    } catch {}
                  }}>{t("maintenance.parts.loadTasks")}</button>
                </div>
                <div className={styles.field}>
                  <label>{t("maintenance.parts.mRef")}</label>
                  <input type="text" value={refInput} onChange={(e) => setRefInput(e.target.value)} placeholder={t("maintenance.parts.phRefOut")} />
                </div>
              </>
            )}
            <div className={styles.field}>
              <label>{t("common.notes")}</label>
              <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} rows={2} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setStockModal(null)}>{t("common.back")}</button>
              <button className={stockModal.type === "in" ? styles.stockInBtn : styles.stockOutBtn} onClick={submitStock} disabled={modalLoading || !qtyInput || Number(qtyInput) < 1}>
                {modalLoading ? t("drivers.common.saving") : stockModal.type === "in" ? t("maintenance.parts.modalInTitle") : t("maintenance.parts.modalOutTitle")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submitEdit}>
            <h2>{t("maintenance.parts.editTitle")}</h2>
            {modalError && <div className={styles.error}>{modalError}</div>}
            <div className={styles.field}>
              <label>{t("maintenance.parts.formCode")}</label>
              <input type="text" value={editForm.part_code || ""} onChange={(e) => setEditForm({ ...editForm, part_code: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formName")}</label>
              <input type="text" value={editForm.part_name || ""} onChange={(e) => setEditForm({ ...editForm, part_name: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formCategory")}</label>
              <input type="text" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formManufacturer")}</label>
              <input type="text" value={editForm.manufacturer || ""} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formUnit")}</label>
              <input type="text" value={editForm.unit_of_measure || ""} onChange={(e) => setEditForm({ ...editForm, unit_of_measure: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.colReorder")}</label>
              <input type="number" min="0" value={editForm.reorder_level || "0"} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.colPrice")}</label>
              <input type="number" min="0" step="0.01" value={editForm.unit_price || ""} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formSupplier")}</label>
              <input type="text" value={editForm.supplier_id || ""} onChange={(e) => setEditForm({ ...editForm, supplier_id: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>{t("maintenance.parts.formLocation")}</label>
              <input type="text" value={editForm.storage_location || ""} onChange={(e) => setEditForm({ ...editForm, storage_location: e.target.value })} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setEditModal(null)}>{t("common.back")}</button>
              <button type="submit" className={styles.primaryBtn} disabled={editLoading}>
                {editLoading ? t("drivers.common.saving") : t("drivers.edit.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
