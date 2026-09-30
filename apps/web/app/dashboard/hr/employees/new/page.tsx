"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const DEPARTMENT_KEYS: Record<string, string> = {
  operations: "hr.dept.operations",
  finance: "hr.dept.finance",
  hr: "hr.dept.hr",
  fleet: "hr.dept.fleet",
  maintenance: "hr.dept.maintenance",
  customer_service: "hr.dept.customerService",
  executive: "hr.dept.executive",
  admin: "hr.dept.admin",
};

export default function NewEmployeePage() {
  const { lang, t } = useLanguage();
  void lang;
  void formatDate;
  void formatNumber;
  void formatCurrency;
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
      if (!json.success) { setError(json.error?.message || json.message || t("hr.common.failedCreate")); return; }
      router.push(`/dashboard/hr/employees/${json.data.id}`);
    } catch { setError(t("hr.common.networkError")); } finally { setSaving(false); }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/hr/employees" className={styles.backLink}><ArrowLeft size={14} /> {t("hr.empNew.back")}</Link>
      <h1 className={styles.pageTitle}>{t("hr.empNew.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empNew.secAccount")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empNew.fFullName")}</label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder={t("hr.empNew.phName")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fEmail")}</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder={t("hr.empNew.phEmail")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fPassword")}</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} placeholder={t("hr.empNew.phPassword")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fEmpCode")}</label>
              <input value={form.employeeCode} onChange={(e) => update("employeeCode", e.target.value)} placeholder={t("hr.empNew.phEmpCode")} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empNew.secEmployment")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empNew.fDept")}</label>
              <select value={form.department} onChange={(e) => update("department", e.target.value)}>
                {Object.entries(DEPARTMENT_KEYS).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fDesignation")}</label>
              <input value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder={t("hr.empNew.phDesignation")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fPhone")}</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder={t("hr.empNew.phPhone")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fJoinDate")}</label>
              <input type="date" value={form.joinDate} onChange={(e) => update("joinDate", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fContractEnd")}</label>
              <input type="date" value={form.contractEndDate} onChange={(e) => update("contractEndDate", e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hr.empNew.secIdentity")}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>{t("hr.empNew.fNationality")}</label>
              <input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder={t("hr.empNew.phNationality")} />
            </div>
            <div className={styles.field}>
              <label>{t("hr.empNew.fIdNumber")}</label>
              <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} placeholder={t("hr.empNew.phIdNumber")} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/dashboard/hr/employees" className={styles.cancelBtn}>{t("common.cancel")}</Link>
          <button className={styles.saveBtn} disabled={saving}>
            <Save size={14} /> {saving ? t("hr.empNew.creating") : t("hr.empNew.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
