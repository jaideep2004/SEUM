"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewEmployeePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "", password: "", name: "", employeeCode: "",
    department: "operations", designation: "", phone: "",
    joinDate: new Date().toISOString().slice(0, 10), contractEndDate: "",
    nationality: "", idNumber: "",
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/hr/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to create employee"); return; }
      router.push(`/dashboard/hr/employees/${json.data.id}`);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/hr/employees" className={styles.backLink}><ArrowLeft size={14} /> Back to Employees</Link>
      <h1 className={styles.pageTitle}>Add New Employee</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Full Name *</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Sara Khalid" />
            </div>
            <div className={styles.field}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder="employee@company.com" />
            </div>
            <div className={styles.field}>
              <label>Password *</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className={styles.field}>
              <label>Employee Code</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} placeholder="e.g. EMP-001" />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employment Details</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Department *</label>
              <select value={form.department} onChange={(e) => update("department", e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Designation</label>
              <input value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="e.g. Accountant" />
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+966 5X XXX XXXX" />
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
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Saudi" />
            </div>
            <div className={styles.field}>
              <label>ID Number</label>
              <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} placeholder="National ID / Iqama number" />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/dashboard/hr/employees" className={styles.cancelBtn}>Cancel</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? "Creating..." : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
