"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  Building2,
  Search,
  Plus,
  ChevronRight,
  CreditCard,
  Users,
  Calendar,
  XCircle,
} from "lucide-react";
import styles from "./page.module.css";

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "#6366f1", text: "#fff" },
  professional: { bg: "#059669", text: "#fff" },
  enterprise: { bg: "#d97706", text: "#fff" },
};

export default function CompaniesPage() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<any[]>("/tenants?isActive=true");
      setTenants(data);
    } catch (err: any) {
      setError(err.message || t("companies.list.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const filtered = search
    ? tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || (t.contactEmail || "").toLowerCase().includes(search.toLowerCase()) || (t.domain || "").toLowerCase().includes(search.toLowerCase()))
    : tenants;

  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return t("companies.list.unknown");
    const map: Record<string, string> = {
      starter: t("companies.tierStarter"),
      professional: t("companies.tierProfessional"),
      enterprise: t("companies.tierEnterprise"),
    };
    return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Building2 size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("companies.list.title")}</h1>
          <p className={styles.headerSub}>
            {tenants.length} {tenants.length !== 1 ? t("companies.list.companiesCount") : t("companies.list.companyCount")}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => router.push("/dashboard/companies/new")}>
          <Plus size={16} />
          {t("companies.list.add")}
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("companies.list.searchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>{t("companies.list.loading")}</div>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map((tenant) => {
            const tc = tierColors[tenant.subscriptionTier] || tierColors.starter;
            return (
              <div
                key={tenant.id}
                className={styles.tenantCard}
                onClick={() => router.push(`/dashboard/companies/${tenant.id}`)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar}>
                    {(tenant.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.cardMeta}>
                    <h3 className={styles.cardName}>{tenant.name}</h3>
                    {tenant.domain && <span className={styles.cardDomain}>{tenant.domain}</span>}
                  </div>
                  {!tenant.isActive && (
                    <span className={styles.inactiveBadge}>
                      <XCircle size={12} />
                      {t("companies.list.inactive")}
                    </span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <Users size={14} />
                    <span>{tenant.userCount ?? "—"} {t("companies.list.users")}</span>
                  </div>
                  {tenant.contactEmail && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>{t("companies.list.contact")}</span>
                      <span>{tenant.contactEmail}</span>
                    </div>
                  )}
                  {tenant.contactPhone && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>{t("companies.list.phone")}</span>
                      <span>{tenant.contactPhone}</span>
                    </div>
                  )}
                  <div className={styles.cardRow}>
                    <Calendar size={14} />
                    <span>{t("companies.list.created")} {formatDate(tenant.createdAt, lang)}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.tierBadge} style={{ background: tc?.bg || "rgba(99,102,241,0.1)", color: tc?.text || "#6366f1" }}>
                    <CreditCard size={12} />
                    {tierLabel(tenant.subscriptionTier)}
                  </span>
                  <span className={styles.cardArrow}>
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className={styles.empty}>{t("companies.list.noCompanies")}</div>
      )}
    </div>
  );
}
