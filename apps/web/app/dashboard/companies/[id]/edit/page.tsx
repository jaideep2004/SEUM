"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  ArrowLeft,
  Building2,
  Save,
  AlertTriangle,
  ToggleLeft,
} from "lucide-react";
import styles from "./page.module.css";

const TIERS = ["starter", "professional", "enterprise"] as const;

interface TenantData {
  id: string;
  name: string;
  domain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
}

export default function EditCompanyPage() {
  const { lang, t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionTier: "starter",
    isActive: true,
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
    if (!form.name.trim()) next.name = t("companies.edit.nameRequired");
    if (!form.contactEmail.trim()) next.contactEmail = t("companies.edit.emailRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const fetchTenant = useCallback(async () => {
    try {
      const data: TenantData = await api.get(`/tenants/${tenantId}`);
      setForm({
        name: data.name || "",
        domain: data.domain || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        subscriptionTier: data.subscriptionTier || "starter",
        isActive: data.isActive,
      });
    } catch (err: any) {
      setFetchError(err.message || t("companies.edit.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, t]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.patch(`/tenants/${tenantId}`, form);
      router.push(`/dashboard/companies/${tenantId}`);
    } catch (err: any) {
      setSubmitError(err.message || t("companies.edit.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{t("companies.edit.loading")}</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} />
          <span>{fetchError}</span>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/dashboard/companies")}
          >
            {t("companies.edit.backToCompanies")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(`/dashboard/companies/${tenantId}`)}
        >
          <ArrowLeft size={18} />
          {t("companies.edit.backToCompany")}
        </button>
        <div className={styles.headerInfo}>
          <Building2 size={20} className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>{t("companies.edit.title")}</h1>
        </div>
      </div>

      {submitError && <div className={styles.error}>{submitError}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>
            {t("companies.edit.name")} <span className={styles.required}>*</span>
          </label>
          <input
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            name="name"
            placeholder={t("companies.edit.namePh")}
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("companies.edit.domain")}</label>
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
              {t("companies.edit.contactEmail")} <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${errors.contactEmail ? styles.inputError : ""}`}
              name="contactEmail"
              type="email"
              placeholder="admin@example.com"
              value={form.contactEmail}
              onChange={handleChange}
            />
            {errors.contactEmail && (
              <span className={styles.fieldError}>{errors.contactEmail}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("companies.edit.contactPhone")}</label>
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
          <label className={styles.label}>{t("companies.edit.tier")}</label>
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

        <div className={styles.toggleRow}>
          <ToggleLeft size={18} className={styles.toggleIcon} />
          <label className={styles.toggleLabel}>
            {t("companies.edit.active")}
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSwitch}>
              <span className={`${styles.toggleKnob} ${form.isActive ? styles.toggleKnobOn : ""}`} />
            </span>
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => router.push(`/dashboard/companies/${tenantId}`)}
          >
            {t("companies.edit.cancel")}
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Save size={15} />
            {submitting ? t("companies.edit.saving") : t("companies.edit.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
