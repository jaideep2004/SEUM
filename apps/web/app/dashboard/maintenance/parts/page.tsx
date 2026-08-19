"use client";
import { useState, useEffect, useCallback } from "react";
import { Package, Plus, History, AlertTriangle, Wrench, ArrowDownToLine, ArrowUpFromLine, PenLine, Truck } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TASK_TYPES: Record<string, string> = {
  oil_change: "Oil Change", tire_replacement: "Tire Replacement", brake_inspection: "Brake Inspection",
  engine_service: "Engine Service", ac_service: "AC Service", electrical: "Electrical",
  body_repair: "Body Repair", general_service: "General Service", other: "Other",
};

export default function PartsPage() {
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
      if (!data.success) { setSubmitError(data.error?.message || "Failed to create part"); return; }
      setForm({ part_code: "", part_name: "", category: "", manufacturer: "", unit_of_measure: "unit", quantity_in_stock: "0", reorder_level: "5", unit_price: "", supplier_id: "", storage_location: "" });
      setActiveTab("inventory");
      fetchParts();
    } catch { setSubmitError("Network error"); }
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
      if (!data.success) { setModalError(data.error?.message || "Action failed"); return; }
      setStockModal(null);
      fetchParts();
    } catch { setModalError("Network error"); }
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
      if (!data.success) { setModalError(data.error?.message || "Update failed"); return; }
      setEditModal(null);
      fetchParts();
    } catch { setModalError("Network error"); }
    setEditLoading(false);
  }

  const lowCount = parts.filter((p) => p.lowStock).length;
  const categories = [...new Set(parts.map((p) => p.category).filter(Boolean))];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Spare Parts Inventory</h1>
          <p className={styles.subtitle}>Track stock levels, record movements and see part usage per bus.</p>
        </div>
        {activeTab === "inventory" && lowCount > 0 && (
          <span className={styles.lowBanner}><AlertTriangle size={14} /> {lowCount} part(s) below reorder level</span>
        )}
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "inventory" ? styles.tabActive : ""}`} onClick={() => setActiveTab("inventory")}><Package size={14} /> Inventory</button>
        <button className={`${styles.tab} ${activeTab === "add" ? styles.tabActive : ""}`} onClick={() => setActiveTab("add")}><Plus size={14} /> Add Part</button>
        <button className={`${styles.tab} ${activeTab === "usage" ? styles.tabActive : ""}`} onClick={() => setActiveTab("usage")}><History size={14} /> Usage per Bus</button>
      </div>

      {activeTab === "inventory" && (
        <>
          <div className={styles.filters}>
            <input className={styles.searchInput} placeholder="Search code, name, manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className={styles.lowToggle}>
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              Low stock only
            </label>
          </div>

          {loading ? <div className={styles.loading}>Loading inventory...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Part</th><th>Category</th><th>In Stock</th><th>Reorder Level</th><th>Unit Price</th><th>Location</th><th>Actions</th>
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
                        {p.lowStock && <span className={styles.lowBadge}>LOW</span>}
                      </td>
                      <td>{p.reorderLevel} {p.unitOfMeasure}</td>
                      <td>{p.unitPrice != null ? Number(p.unitPrice).toLocaleString() : "—"}</td>
                      <td>{p.storageLocation || "—"}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button className={styles.stockInBtn} onClick={() => openStock(p, "in")} title="Add stock"><ArrowDownToLine size={12} /> In</button>
                          <button className={styles.stockOutBtn} onClick={() => openStock(p, "out")} title="Remove stock"><ArrowUpFromLine size={12} /> Out</button>
                          <button className={styles.editBtn} onClick={() => openEdit(p)} title="Edit part"><PenLine size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {parts.length === 0 && (
                    <tr><td colSpan={7} className={styles.emptyState}>No parts — add one to start tracking inventory.</td></tr>
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
              <label>Part Code *</label>
              <input type="text" value={form.part_code} onChange={(e) => setForm({ ...form, part_code: e.target.value })} placeholder="e.g. OIL-F-5W30" required />
            </div>
            <div className={styles.field}>
              <label>Part Name *</label>
              <input type="text" value={form.part_name} onChange={(e) => setForm({ ...form, part_name: e.target.value })} placeholder="e.g. Engine Oil 5W-30" required />
            </div>
            <div className={styles.field}>
              <label>Category</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Lubricants, Filters, Brakes" />
            </div>
            <div className={styles.field}>
              <label>Manufacturer</label>
              <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Unit of Measure</label>
              <input type="text" value={form.unit_of_measure} onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Initial Quantity</label>
              <input type="number" min="0" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Reorder Level</label>
              <input type="number" min="0" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Unit Price</label>
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Supplier</label>
              <input type="text" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} placeholder="Supplier name or ID" />
            </div>
            <div className={styles.field}>
              <label>Storage Location</label>
              <input type="text" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder="e.g. Shelf A-3" />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={submitting || !form.part_code.trim() || !form.part_name.trim()}>
              {submitting ? "Creating..." : "Create Part"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "usage" && (
        <div className={styles.usageWrap}>
          <div className={styles.filters}>
            <label className={styles.busLabel}><Truck size={14} /> Bus</label>
            <select value={usageBus} onChange={(e) => setUsageBus(e.target.value)} className={styles.filterSelect}>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.plateNumber} — {b.make} {b.model}</option>)}
            </select>
          </div>
          {usageLoading ? <div className={styles.loading}>Loading usage...</div> : (
            usage && (
              <>
                <div className={styles.usageStats}>
                  <div className={styles.usageStat}><strong>{usage.totalParts}</strong> parts used</div>
                  <div className={styles.usageStatCost}><strong>{Number(usage.totalCost).toLocaleString()}</strong> total cost</div>
                  <div className={styles.usageStatItems}><strong>{usage.items.length}</strong> movements</div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Part</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Date</th><th>Maintenance Task</th></tr>
                    </thead>
                    <tbody>
                      {usage.items.map((item: any) => (
                        <tr key={item.id}>
                          <td>
                            <span className={styles.partName}>{item.partName}</span>
                            <div className={styles.cellSub}>{item.partCode}</div>
                          </td>
                          <td>{item.quantity} {item.unitOfMeasure}</td>
                          <td>{item.unitPrice != null ? Number(item.unitPrice).toLocaleString() : "—"}</td>
                          <td>{item.total != null ? Number(item.total).toLocaleString() : "—"}</td>
                          <td>{fmtDateTime(item.date)}</td>
                          <td>
                            <span className={styles.taskType}><Wrench size={12} /> {TASK_TYPES[item.task?.taskType] || item.task?.taskType || "—"}</span>
                            {item.task?.scheduledDate && <div className={styles.cellSub}>{item.task.scheduledDate}</div>}
                          </td>
                        </tr>
                      ))}
                      {usage.items.length === 0 && (
                        <tr><td colSpan={6} className={styles.emptyState}>No parts used for this bus yet.</td></tr>
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
            <h2>{stockModal.type === "in" ? "Add Stock" : "Remove Stock"}</h2>
            <p className={styles.modalSub}>
              {stockModal.part.partName} ({stockModal.part.partCode}) — {stockModal.part.quantityInStock} in stock
            </p>
            {modalError && <div className={styles.error}>{modalError}</div>}
            <div className={styles.field}>
              <label>Quantity *</label>
              <input type="number" min="1" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} />
            </div>
            {stockModal.type === "in" ? (
              <>
                <div className={styles.field}>
                  <label>Unit Price</label>
                  <input type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>Supplier</label>
                  <input type="text" value={supplierInput} onChange={(e) => setSupplierInput(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label>Reference</label>
                  <input type="text" value={refInput} onChange={(e) => setRefInput(e.target.value)} placeholder="PO / invoice number" />
                </div>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label>Link to Maintenance Task</label>
                  <select value={taskInput} onChange={(e) => setTaskInput(e.target.value)}>
                    <option value="">No task (other usage)</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.bus?.plateNumber} — {TASK_TYPES[t.taskType] || t.taskType} ({t.status})</option>
                    ))}
                  </select>
                  <button type="button" className={styles.loadTasksBtn} onClick={async () => {
                    const token = getToken();
                    try {
                      const res = await fetch(`${API}/maintenance/tasks?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
                      const data = await res.json();
                      if (data.success) setTasks((data.data || []).filter((t: any) => t.status !== "completed" && t.status !== "cancelled"));
                    } catch {}
                  }}>Load open tasks</button>
                </div>
                <div className={styles.field}>
                  <label>Reference</label>
                  <input type="text" value={refInput} onChange={(e) => setRefInput(e.target.value)} placeholder="e.g. Work order ref" />
                </div>
              </>
            )}
            <div className={styles.field}>
              <label>Notes</label>
              <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} rows={2} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setStockModal(null)}>Back</button>
              <button className={stockModal.type === "in" ? styles.stockInBtn : styles.stockOutBtn} onClick={submitStock} disabled={modalLoading || !qtyInput || Number(qtyInput) < 1}>
                {modalLoading ? "Saving..." : stockModal.type === "in" ? "Add Stock" : "Remove Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={submitEdit}>
            <h2>Edit Part</h2>
            {modalError && <div className={styles.error}>{modalError}</div>}
            <div className={styles.field}>
              <label>Part Code *</label>
              <input type="text" value={editForm.part_code || ""} onChange={(e) => setEditForm({ ...editForm, part_code: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>Part Name *</label>
              <input type="text" value={editForm.part_name || ""} onChange={(e) => setEditForm({ ...editForm, part_name: e.target.value })} required />
            </div>
            <div className={styles.field}>
              <label>Category</label>
              <input type="text" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Manufacturer</label>
              <input type="text" value={editForm.manufacturer || ""} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Unit of Measure</label>
              <input type="text" value={editForm.unit_of_measure || ""} onChange={(e) => setEditForm({ ...editForm, unit_of_measure: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Reorder Level</label>
              <input type="number" min="0" value={editForm.reorder_level || "0"} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Unit Price</label>
              <input type="number" min="0" step="0.01" value={editForm.unit_price || ""} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Supplier</label>
              <input type="text" value={editForm.supplier_id || ""} onChange={(e) => setEditForm({ ...editForm, supplier_id: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Storage Location</label>
              <input type="text" value={editForm.storage_location || ""} onChange={(e) => setEditForm({ ...editForm, storage_location: e.target.value })} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setEditModal(null)}>Back</button>
              <button type="submit" className={styles.primaryBtn} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}