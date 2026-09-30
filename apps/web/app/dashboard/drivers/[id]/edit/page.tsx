"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function EditDriverPage() {
  const { t } = useLanguage();
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
      if (!json.success) { setError(json.error?.message || json.message || t("drivers.edit.failedUpdate")); return; }
      router.push(`/dashboard/drivers/${id}`);
    } catch { setError(t("drivers.common.networkError")); } finally { setSaving(false); }
  }

  if (loading) return <div className={styles.loading}>{t("common.loading")}</div>;

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/drivers/${id}`} className={styles.backLink}><ArrowLeft size={14} /> {t("drivers.edit.backToProfile")}</Link>
      <h1 className={styles.pageTitle}>{t("drivers.edit.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.edit.secBasic")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.edit.fFullName")}</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fEmpCode")}</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fStatus")}</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="active">{t("drivers.status.active")}</option>
                <option value="suspended">{t("drivers.status.suspended")}</option>
                <option value="terminated">{t("drivers.status.terminated")}</option>
                <option value="on_leave">{t("drivers.status.onLeave")}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fNationality")}</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.profile.secLicense")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseNumber")}</label>
              <input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseExpiry")}</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => update("licenseExpiry", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fLicenseCategory")}</label>
              <input value={form.licenseCategory} onChange={(e) => update("licenseCategory", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fPassportNumber")}</label>
              <input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("drivers.edit.secPersonalEmp")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("drivers.profile.fDob")}</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fBloodType")}</label>
              <select value={form.bloodType} onChange={(e) => update("bloodType", e.target.value)}>
                <option value="">{t("drivers.edit.bloodSelect")}</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fMedicalExpiry")}</label>
              <input type="date" value={form.medicalFitnessExpiry} onChange={(e) => update("medicalFitnessExpiry", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.profile.fHireDate")}</label>
              <input type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.edit.fEmergencyName")}</label>
              <input value={form.emergencyContactName} onChange={(e) => update("emergencyContactName", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("drivers.edit.fEmergencyPhone")}</label>
              <input value={form.emergencyContactPhone} onChange={(e) => update("emergencyContactPhone", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/dashboard/drivers/${id}`} className={styles.cancelBtn}>{t("common.cancel")}</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? t("drivers.common.saving") : t("drivers.edit.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}
