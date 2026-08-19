"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DEPARTMENTS = [
  { value: "operations", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "fleet", label: "Fleet" },
  { value: "maintenance", label: "Maintenance" },
  { value: "customer_service", label: "Customer Service" },
  { value: "executive", label: "Executive" },
  { value: "admin", label: "Admin" },
];

export default function EditEmployeePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", employeeCode: "", department: "operations",
    designation: "", phone: "", joinDate: "", contractEndDate: "",
    nationality: "", idNumber: "", status: "active",
  });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/hr/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          const e = json.data;
          setForm({
            name: e.name || "", email: e.email || "", employeeCode: e.employeeCode || "",
            department: e.department || "operations", designation: e.designation || "",
            phone: e.phone || "", joinDate: e.joinDate || "", contractEndDate: e.contractEndDate || "",
            nationality: e.nationality || "", idNumber: e.idNumber || "", status: e.status || "active",
          });
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [id]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/hr/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to update"); return; }
      router.push(`/dashboard/hr/employees/${id}`);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/hr/employees/${id}`} className={styles.backLink}><ArrowLeft size={14} /> Back to Profile</Link>
      <h1 className={styles.pageTitle}>Edit Employee</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Info</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Full Name</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Employee Code</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employment Details</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Department</label>
              <select value={form.department} onChange={(e) => update("department", e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Designation</label>
              <input value={form.designation} onChange={(e) => update("designation", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Join Date</label>
              <input type="date" value={form.joinDate} onChange={(e) => update("joinDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Contract End Date</label>
              <input type="date" value={form.contractEndDate} onChange={(e) => update("contractEndDate", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Identity</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Nationality</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>ID Number</label>
              <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/dashboard/hr/employees/${id}`} className={styles.cancelBtn}>Cancel</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
