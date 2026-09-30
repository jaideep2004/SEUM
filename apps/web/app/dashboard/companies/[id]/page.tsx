"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  Building2,
  ArrowLeft,
  Edit3,
  Trash2,
  CreditCard,
  Users,
  Calendar,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Package,
  BarChart3,
} from "lucide-react";
import styles from "./page.module.css";

interface TenantDetail {
  id: string;
  name: string;
  domain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  features?: Record<string, boolean>;
  billingCycle?: string;
  billingEmail?: string;
}

const tierColors: Record<string, { bg: string; text: string }> = {
  starter: { bg: "#6366f1", text: "#fff" },
  professional: { bg: "#059669", text: "#fff" },
  enterprise: { bg: "#d97706", text: "#fff" },
};

export default function CompanyDetailPage() {
  const { lang, t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTenant = useCallback(async () => {
    try {
      const data = await api.get<any>(`/tenants/${tenantId}`);
      setTenant(data);
    } catch (err: any) {
      setError(err.message || t("companies.detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, t]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tenants/${tenantId}`);
      router.push("/dashboard/companies");
    } catch (err: any) {
      setError(err.message || t("companies.detail.deleteFailed"));
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  if (loading) return <div className={styles.page}><div className={styles.loading}>{t("companies.detail.loading")}</div></div>;
  if (error || !tenant) return (
    <div className={styles.page}>
      <div className={styles.errorBanner}>
        <AlertTriangle size={20} />
        <span>{error || t("companies.detail.notFound")}</span>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>{t("companies.detail.back")}</button>
      </div>
    </div>
  );

  const tc = tenant.subscriptionTier ? tierColors[tenant.subscriptionTier] : undefined;
  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return t("companies.tierUnknown");
    const map: Record<string, string> = {
      starter: t("companies.tierStarter"),
      professional: t("companies.tierProfessional"),
      enterprise: t("companies.tierEnterprise"),
    };
    return map[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const infoCards = [
    { icon: Globe, label: t("companies.detail.domain"), value: tenant.domain || "—" },
    { icon: User, label: t("companies.detail.contact"), value: tenant.contactName || "—" },
    { icon: Mail, label: t("companies.detail.email"), value: tenant.contactEmail || "—" },
    { icon: Phone, label: t("companies.detail.phone"), value: tenant.contactPhone || "—" },
    { icon: Calendar, label: t("companies.detail.created"), value: formatDate(tenant.createdAt, lang) },
    { icon: Activity, label: t("companies.detail.status"), value: tenant.isActive ? t("companies.detail.active") : t("companies.detail.inactive") },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/companies")}>
          <ArrowLeft size={18} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.headerTop}>
            <div className={styles.avatar}>{(tenant.name || "?").charAt(0).toUpperCase()}</div>
            <h1 className={styles.headerTitle}>{tenant.name || t("companies.detail.unnamed")}</h1>
            <span className={styles.tierBadge} style={{ background: tc?.bg || "rgba(99,102,241,0.1)", color: tc?.text || "#6366f1" }}>
              <CreditCard size={12} />
              {tierLabel(tenant.subscriptionTier)}
            </span>
            {!tenant.isActive && (
              <span className={styles.inactiveBadge}>
                <XCircle size={12} /> {t("companies.detail.inactive")}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => router.push(`/dashboard/companies/${tenant.id}/edit`)}>
            <Edit3 size={15} />
            {t("companies.detail.edit")}
          </button>
          <button className={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={15} />
            {t("companies.detail.delete")}
          </button>
        </div>
      </div>

      <div className={styles.infoGrid}>
        {infoCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.infoCard}>
              <div className={styles.infoIcon}><Icon size={16} /></div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{card.label}</span>
                <span className={styles.infoValue}>{card.value}</span>
              </div>
            </div>
          );
        })}
        <div className={styles.infoCard}>
          <div className={styles.infoIcon}><Package size={16} /></div>
          <div className={styles.infoContent}>
            <span className={styles.infoLabel}>{t("companies.detail.billing")}</span>
            <span className={styles.infoValue}>{tenant.billingCycle || t("companies.detail.monthly")}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      {tenant.features && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CheckCircle2 size={18} />
            <h2 className={styles.sectionTitle}>{t("companies.detail.enabledModules")}</h2>
          </div>
          <div className={styles.featuresGrid}>
            {Object.entries(tenant.features).map(([key, enabled]) => (
              <div key={key} className={`${styles.featureItem} ${enabled ? styles.featureEnabled : styles.featureDisabled}`}>
                {enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span>{key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Users size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>{t("companies.detail.users")}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <BarChart3 size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>{t("companies.detail.activeTrips")}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <Activity size={20} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>—</div>
            <div className={styles.statLabel}>{t("companies.detail.vehicles")}</div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle}>{t("companies.detail.deleteTitle")}</h3>
            <p className={styles.modalText}>
              {t("companies.detail.deleteTextA")} <strong>{tenant.name}</strong>{t("companies.detail.deleteTextB")}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowDeleteModal(false)}>
                {t("companies.detail.cancel")}
              </button>
              <button className={styles.modalConfirm} onClick={handleDelete} disabled={deleting}>
                {deleting ? t("companies.detail.deleting") : t("companies.detail.deleteCompany")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function User({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
