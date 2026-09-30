"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  CreditCard,
  Search,
  RefreshCw,
  Building2,
  Users,
  CalendarClock,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";
import styles from "./page.module.css";

interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
}

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  planId: string | null;
  billingCycle: string;
  billingEmail: string | null;
  subscriptionStartedAt: string | null;
  subscriptionRenewalDate: string | null;
  isActive: boolean;
  createdAt: string;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "rgba(99,102,241,0.1)", text: "#6366f1" },
  professional: { bg: "rgba(16,185,129,0.1)", text: "#059669" },
  enterprise: { bg: "rgba(245,158,11,0.1)", text: "#d97706" },
};

export default function SubscriptionsPage() {
  const { lang, t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [modalTenant, setModalTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ planId: "", billingCycle: "monthly", billingEmail: "", subscriptionRenewalDate: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tenantData, planData] = await Promise.all([
        api.get<any[]>("/tenants"),
        api.get<any[]>("/subscription-plans"),
      ]);
      setTenants(tenantData);
      setPlans(planData);
    } catch (err: any) {
      setError(err.message || t("companies.subs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const planById = (id: string | null) => plans.find((p) => p.id === id);

  const openModal = (t: Tenant) => {
    const plan = planById(t.planId);
    setForm({
      planId: t.planId || plan?.id || "",
      billingCycle: t.billingCycle || "monthly",
      billingEmail: t.billingEmail || t.contactEmail || "",
      subscriptionRenewalDate: t.subscriptionRenewalDate?.slice(0, 10) || "",
    });
    setModalTenant(t);
  };

  const save = async () => {
    if (!modalTenant) return;
    setSaving(true);
    try {
      await api.patch(`/tenants/${modalTenant.id}`, {
        planId: form.planId || undefined,
        billingCycle: form.billingCycle,
        billingEmail: form.billingEmail || undefined,
        subscriptionRenewalDate: form.subscriptionRenewalDate || undefined,
      });
      setModalTenant(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || t("companies.subs.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || t.name.toLowerCase().includes(q)
      || (t.contactEmail || "").toLowerCase().includes(q)
      || (t.domain || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all"
      || (statusFilter === "active" && t.isActive)
      || (statusFilter === "inactive" && !t.isActive);
    return matchSearch && matchStatus;
  });

  const active = tenants.filter((t) => t.isActive);
  const renewingSoon = tenants.filter((t) => {
    if (!t.subscriptionRenewalDate) return false;
    const days = (new Date(t.subscriptionRenewalDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  });
  const monthlyRecurring = active.reduce((sum, t) => {
    const plan = planById(t.planId);
    if (!plan) return sum;
    return sum + (t.billingCycle === "yearly" ? plan.priceYearly / 12 : plan.priceMonthly);
  }, 0);

  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return t("companies.subs.noPlan");
    const map: Record<string, string> = {
      starter: t("companies.subs.tierStarter"),
      professional: t("companies.subs.tierProfessional"),
      enterprise: t("companies.subs.tierEnterprise"),
    };
    return map[tier] || tier.replace("_", " ");
  };
  const billingLabel = (cycle: string | null | undefined) => {
    if (!cycle) return t("companies.subs.monthly");
    if (cycle === "yearly") return t("companies.subs.yearly");
    if (cycle === "monthly") return t("companies.subs.monthly");
    return cycle;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <CreditCard size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("companies.subs.title")}</h1>
          <p className={styles.headerSub}>{t("companies.subs.subtitle")}</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData} title={t("companies.subs.refresh")}>
          <RefreshCw size={14} /> {t("companies.subs.refresh")}
        </button>
      </div>

      <div className={styles.cards}>
        <div className={styles.statCard}>
          <Building2 size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{tenants.length}</span>
            <span className={styles.statLabel}>{t("companies.subs.totalCompanies")}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{active.length}</span>
            <span className={styles.statLabel}>{t("companies.subs.activeSubs")}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Wallet size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{formatNumber(monthlyRecurring, lang, 0)}</span>
            <span className={styles.statLabel}>{t("companies.subs.mrr")}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CalendarClock size={18} className={styles.statIcon} />
          <div>
            <span className={styles.statValue}>{renewingSoon.length}</span>
            <span className={styles.statLabel}>{t("companies.subs.renewing")}</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("companies.subs.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("companies.subs.allStatuses")}</option>
          <option value="active">{t("companies.subs.active")}</option>
          <option value="inactive">{t("companies.subs.inactive")}</option>
        </select>
      </div>

      {error && <div className={styles.error}><AlertTriangle size={13} /> {error}</div>}

      {loading ? (
        <div className={styles.empty}>{t("companies.subs.loading")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("companies.subs.colCompany")}</th>
                <th>{t("companies.subs.colPlan")}</th>
                <th>{t("companies.subs.colBilling")}</th>
                <th>{t("companies.subs.colRenewal")}</th>
                <th>{t("companies.subs.colStatus")}</th>
                <th style={{ width: 130 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tt) => {
                const plan = planById(tt.planId);
                const tc = tierColors[tt.subscriptionTier] || tierColors.starter;
                const renewalDays = tt.subscriptionRenewalDate
                  ? Math.ceil((new Date(tt.subscriptionRenewalDate).getTime() - Date.now()) / 86400000)
                  : null;
                return (
                  <tr key={tt.id}>
                    <td>
                      <div className={styles.companyName}>{tt.name}</div>
                      <div className={styles.cellSub}>{tt.contactEmail || tt.domain || "—"}</div>
                    </td>
                    <td>
                      <span className={styles.tierBadge} style={{ background: tc.bg, color: tc.text }}>
                        {plan?.name || tierLabel(tt.subscriptionTier)}
                      </span>
                    </td>
                    <td className={styles.billingCell}>{billingLabel(tt.billingCycle)}</td>
                    <td>
                      {tt.subscriptionRenewalDate ? (
                        <span>
                          {formatDate(tt.subscriptionRenewalDate, lang)}
                          {renewalDays !== null && renewalDays >= 0 && renewalDays <= 30 && (
                            <span className={styles.renewalSoon}>({renewalDays}{t("companies.subs.daysSuffix")})</span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${tt.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {tt.isActive ? t("companies.subs.active") : t("companies.subs.inactive")}
                      </span>
                    </td>
                    <td>
                      <button className={styles.changeBtn} onClick={() => openModal(tt)}>{t("companies.subs.changePlan")}</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>{t("companies.subs.noCompanies")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalTenant && (
        <div className={styles.modalOverlay} onClick={() => setModalTenant(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{t("companies.subs.changeTitle")}</h3>
                <p className={styles.modalSub}>{modalTenant.name}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setModalTenant(null)}><X size={15} /></button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>{t("companies.subs.plan")} *</label>
                <select value={form.planId} onChange={(e) => setForm(f => ({ ...f, planId: e.target.value }))}>
                  <option value="">{t("companies.subs.selectPlan")}</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.priceMonthly} SAR/mo ({p.maxUsers} {t("companies.subs.users")}, {p.maxVehicles} {t("companies.subs.vehicles")})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>{t("companies.subs.billingCycle")}</label>
                  <select value={form.billingCycle} onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                    <option value="monthly">{t("companies.subs.monthlyCap")}</option>
                    <option value="yearly">{t("companies.subs.yearlyCap")}</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>{t("companies.subs.renewalDate")}</label>
                  <input
                    type="date"
                    value={form.subscriptionRenewalDate}
                    onChange={(e) => setForm(f => ({ ...f, subscriptionRenewalDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>{t("companies.subs.billingEmail")}</label>
                <input
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => setForm(f => ({ ...f, billingEmail: e.target.value }))}
                  placeholder="billing@company.com"
                />
              </div>

              {!form.planId && (
                <div className={styles.warnNote}><AlertTriangle size={12} /> {t("companies.subs.planRequired")}</div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setModalTenant(null)}>{t("companies.subs.cancel")}</button>
              <button className={styles.saveBtn} onClick={save} disabled={saving || !form.planId}>
                {saving ? t("companies.subs.saving") : t("companies.subs.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
