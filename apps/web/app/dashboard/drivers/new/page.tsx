"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function NewDriverPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "", password: "", name: "", employeeCode: "",
    licenseNumber: "", licenseExpiry: "", licenseCategory: "",
    passportNumber: "", nationality: "", dateOfBirth: "",
    hireDate: new Date().toISOString().slice(0, 10),
    emergencyContactName: "", emergencyContactPhone: "",
    bloodType: "", medicalFitnessExpiry: "",
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
      const res = await fetch(`${API}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to create driver"); return; }
      router.push(`/dashboard/drivers/${json.data.id}`);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/drivers" className={styles.backLink}><ArrowLeft size={14} /> Back to Drivers</Link>
      <h1 className={styles.pageTitle}>Add New Driver</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Full Name *</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Khalid Al-Ghamdi" />
            </div>
            <div className={styles.field}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder="driver@company.com" />
            </div>
            <div className={styles.field}>
              <label>Password *</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className={styles.field}>
              <label>Employee Code</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} placeholder="e.g. DRV-001" />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>License & Identity</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>License Number</label>
              <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>License Expiry</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>License Category</label>
              <input value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)} placeholder="e.g. B, C, D" />
            </div>
            <div className={styles.field}>
              <label>Passport Number</label>
              <input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Info</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Nationality</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. Saudi" />
            </div>
            <div className={styles.field}>
              <label>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Blood Type</label>
              <select value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Medical Fitness Expiry</label>
              <input type="date" value={form.medicalFitnessExpiry} onChange={(e) => update("medicalFitnessExpiry", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Employment & Emergency</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Hire Date</label>
              <input type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Emergency Contact Name</label>
              <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Emergency Contact Phone</label>
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} placeholder="+966 5X XXX XXXX" />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/dashboard/drivers" className={styles.cancelBtn}>Cancel</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? "Creating..." : "Create Driver"}
          </button>
        </div>
      </form>
    </div>
  );
}
