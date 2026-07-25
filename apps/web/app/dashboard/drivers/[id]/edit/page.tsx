"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function EditDriverPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", employeeCode: "", licenseNumber: "", licenseExpiry: "",
    licenseCategory: "", passportNumber: "", nationality: "", dateOfBirth: "",
    hireDate: "", emergencyContactName: "", emergencyContactPhone: "",
    bloodType: "", medicalFitnessExpiry: "", status: "active",
  });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("seum_access_token");
        const res = await fetch(`${API}/drivers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) {
          const d = json.data;
          setForm({
            name: d.name || "", employeeCode: d.employeeCode || "",
            licenseNumber: d.licenseNumber || "", licenseExpiry: d.licenseExpiry || "",
            licenseCategory: d.licenseCategory || "", passportNumber: d.passportNumber || "",
            nationality: d.nationality || "", dateOfBirth: d.dateOfBirth || "",
            hireDate: d.hireDate || "", emergencyContactName: d.emergencyContactName || "",
            emergencyContactPhone: d.emergencyContactPhone || "", bloodType: d.bloodType || "",
            medicalFitnessExpiry: d.medicalFitnessExpiry || "", status: d.status || "active",
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
      const res = await fetch(`${API}/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.message || "Failed to update"); return; }
      router.push(`/dashboard/drivers/${id}`);
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/drivers/${id}`} className={styles.backLink}><ArrowLeft size={14} /> Back to Profile</Link>
      <h1 className={styles.pageTitle}>Edit Driver</h1>

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
            <div className={styles.field}>
              <label>Nationality</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
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
              <input value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Passport Number</label>
              <input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal & Employment</h2>
          <div className={styles.grid}>
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
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/dashboard/drivers/${id}`} className={styles.cancelBtn}>Cancel</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
