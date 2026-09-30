"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import { ArrowLeft, Building2, Save } from "lucide-react";
import styles from "./page.module.css";

const TIERS = ["starter", "professional", "enterprise"] as const;

export default function NewCompanyPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionTier: "starter",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const tierLabel = (tier: string) => {
    const map: Record<string, string> = {
      starter: t("companies.tierStarter"),
      professional: t("companies.tierProfessional"),
      enterprise: t("companies.tierEnterprise"),
    };
    return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("companies.new.nameRequired");
    if (!form.contactEmail.trim()) next.contactEmail = t("companies.new.emailRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const tenant: any = await api.post("/tenants", form);
      router.push(`/dashboard/companies/${tenant.id}`);
    } catch (err: any) {
      setError(err.message || t("companies.new.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>
          <ArrowLeft size={18} />
          {t("companies.new.back")}
        </button>
        <div className={styles.headerInfo}>
          <Building2 size={20} className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>{t("companies.new.title")}</h1>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>
            {t("companies.new.name")} <span className={styles.required}>*</span>
          </label>
          <input
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            name="name"
            placeholder={t("companies.new.namePh")}
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("companies.new.domain")}</label>
          <input
            className={styles.input}
            name="domain"
            placeholder="example.com"
            value={form.domain}
            onChange={handleChange}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              {t("companies.new.contactEmail")} <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.contactEmail ? styles.inputError : ""}`}
              name="contactEmail"
              type="email"
              placeholder="admin@example.com"
              value={form.contactEmail}
              onChange={handleChange}
            />
            {errors.contactEmail && <span className={styles.fieldError}>{errors.contactEmail}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("companies.new.contactPhone")}</label>
            <input
              className={styles.input}
              name="contactPhone"
              placeholder="+1 234 567 890"
              value={form.contactPhone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("companies.new.tier")}</label>
          <select
            className={styles.select}
            name="subscriptionTier"
            value={form.subscriptionTier}
            onChange={handleChange}
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tierLabel(tier)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.push("/dashboard/companies")}
          >
            {t("companies.new.cancel")}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Save size={15} />
            {submitting ? t("companies.new.creating") : t("companies.new.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
