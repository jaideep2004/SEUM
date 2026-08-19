"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, X, Building2, User, Phone, Mail, MapPin } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("seum_access_token");
}

const EMPTY_FORM = {
  name: "", phone: "", email: "", id_number: "", nationality: "",
  address: "", is_company: false, company_name: "", notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (typeFilter === "company") params.set("is_company", "true");
      if (typeFilter === "individual") params.set("is_company", "false");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`${API}/bookings/customers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCustomers(data.data || []);
    } catch {}
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSubmitError("");
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setEditing(c);
    setForm({
      name: c.name, phone: c.phone || "", email: c.email || "", id_number: c.idNumber || "",
      nationality: c.nationality || "", address: c.address || "",
      is_company: c.isCompany, company_name: c.companyName || "", notes: c.notes || "",
    });
    setSubmitError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!form.name.trim()) { setSubmitError("Customer name is required"); return; }
    if (form.is_company && !form.company_name.trim()) { setSubmitError("Company name is required for company customers"); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setSubmitError("Enter a valid email address"); return; }
    setSubmitting(true);
    const token = getToken();
    try {
      const payload: any = {
        name: form.name.trim(), is_company: form.is_company,
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.id_number.trim()) payload.id_number = form.id_number.trim();
      if (form.nationality.trim()) payload.nationality = form.nationality.trim();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.is_company) payload.company_name = form.company_name.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      const res = await fetch(`${API}/bookings/customers${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        const detail = data.error?.details?.[0]?.message;
        setSubmitError(detail || data.error?.message || "Failed to save customer");
        return;
      }
      setModalOpen(false);
      fetchCustomers();
    } catch { setSubmitError("Network error"); }
    setSubmitting(false);
  }

  async function handleDelete(c: any) {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return;
    const token = getToken();
    try {
      const res = await fetch(`${API}/bookings/customers/${c.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchCustomers();
      else window.alert(data.error?.message || "Failed to delete customer");
    } catch { window.alert("Network error"); }
  }

  const filtered = customers.filter((c) =>
    !search.trim() || (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Customers</h1>
          <p className={styles.subtitle}>Manage individual and company customers for bookings.</p>
        </div>
        <button className={styles.addBtn} onClick={openCreate}><Plus size={15} /> Add Customer</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, ID or company..." />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.filterSelect}>
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>

      {loading ? <div className={styles.loading}>Loading customers...</div> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th><th>Contact</th><th>ID / Nationality</th><th>Type</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/dashboard/customers/${c.id}`} className={styles.nameLink}>
                      {c.isCompany ? <Building2 size={14} /> : <User size={14} />}
                      {c.name}
                    </Link>
                    {c.companyName && <div className={styles.cellSub}>{c.companyName}</div>}
                  </td>
                  <td>
                    {c.phone && <div className={styles.contactRow}><Phone size={12} /> {c.phone}</div>}
                    {c.email && <div className={styles.contactRow}><Mail size={12} /> {c.email}</div>}
                  </td>
                  <td>
                    {c.idNumber || "—"}
                    {c.nationality && <div className={styles.cellSub}>{c.nationality}</div>}
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${c.isCompany ? styles.typeCompany : styles.typeIndividual}`}>
                      {c.isCompany ? "Company" : "Individual"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button className={styles.iconBtn} title="Edit" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                      <button className={styles.iconBtn} title="Delete" onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className={styles.emptyState}>No customers found — add one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{editing ? "Edit Customer" : "Add Customer"}</h2>
              <button className={styles.iconBtn} onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {submitError && <div className={styles.error}>{submitError}</div>}
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
                </div>
                <div className={styles.field}>
                  <label>Type</label>
                  <select value={form.is_company ? "company" : "individual"} onChange={(e) => setForm({ ...form, is_company: e.target.value === "company" })}>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                {form.is_company && (
                  <div className={styles.field}>
                    <label>Company Name *</label>
                    <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Company name" />
                  </div>
                )}
                <div className={styles.field}>
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 05xxxxxxxx" />
                </div>
                <div className={styles.field}>
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
                </div>
                <div className={styles.field}>
                  <label>ID Number</label>
                  <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="National / Iqama ID" />
                </div>
                <div className={styles.field}>
                  <label>Nationality</label>
                  <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Saudi" />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label>Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, district..." />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Preferences, VIP status, special requirements..." />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                  {submitting ? "Saving..." : (editing ? "Save Changes" : "Create Customer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}