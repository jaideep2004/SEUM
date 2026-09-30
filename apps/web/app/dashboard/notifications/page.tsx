"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell, CheckCheck, ChevronLeft, ChevronRight, MailCheck, Trash2, Settings2,
  Route, AlertTriangle, FileText, ListOrdered, ClipboardList, XCircle, Wrench,
} from "lucide-react";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
import styles from "./page.module.css";

const TYPE_META: Record<string, { key: string; icon: any; color: string }> = {
  trip_assigned: { key: "admin.notifications.typeAssigned", icon: Route, color: "#2563eb" },
  trip_delayed: { key: "admin.notifications.typeDelayed", icon: AlertTriangle, color: "#f59e0b" },
  document_expiring: { key: "admin.notifications.typeDocument", icon: FileText, color: "#8b5cf6" },
  waitlist_offer: { key: "admin.notifications.typeWaitlist", icon: ListOrdered, color: "#059669" },
  booking_new: { key: "admin.notifications.typeBookingNew", icon: ClipboardList, color: "#0ea5e9" },
  booking_cancelled: { key: "admin.notifications.typeCancelled", icon: XCircle, color: "#dc2626" },
  maintenance_alert: { key: "admin.notifications.typeMaintenance", icon: Wrench, color: "#e11d48" },
};

interface NotifRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  resource: string | null;
  resource_id: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export default function NotificationsPage() {
  const { lang, t } = useLanguage();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("");
  const [error, setError] = useState("");

  function fmtTime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("admin.notifications.justNow");
    if (mins < 60) return `${formatNumber(mins, lang)}m ${t("admin.notifications.agoW")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${formatNumber(hours, lang)}h ${t("admin.notifications.agoW")}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${formatNumber(days, lang)}d ${t("admin.notifications.agoW")}`;
    return formatDate(iso, lang);
  }

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (type) params.set("type", type);
      const res = await fetch(`${API_URL}/notifications?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setTotalPages(data.meta.totalPages);
        setTotal(data.meta.total);
      } else {
        setError(data.message || t("admin.notifications.loadFailed"));
      }
    } catch {
      setError(t("admin.notifications.loadFailed"));
    }
    setLoading(false);
  }, [page, type]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)));
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    } catch {}
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: "PATCH", credentials: "include" });
    } catch {}
  }

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${API_URL}/notifications/${id}`, { method: "DELETE", credentials: "include" });
    } catch {}
  }

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Bell size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>{t("admin.notifications.title")}</h1>
            <p className={styles.subtitle}>
              {formatNumber(total, lang)} {total === 1 ? t("admin.notifications.unitSingular") : t("admin.notifications.unitPlural")}
              {unreadCount > 0 ? ` · ${formatNumber(unreadCount, lang)} ${t("admin.notifications.unreadW")}` : ` ${t("admin.notifications.allRead")}`}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/notifications/preferences" className={styles.secondaryBtn}>
            <Settings2 size={15} /> {t("admin.notifications.preferences")}
          </Link>
          <button className={styles.secondaryBtn} onClick={markAllRead} disabled={unreadCount === 0} title={t("admin.notifications.markAllTitle")}>
            <CheckCheck size={15} /> {t("admin.notifications.markAll")}
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select className={styles.filterSelect} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">{t("admin.notifications.allTypes")}</option>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <option key={key} value={key}>{t(meta.key)}</option>
          ))}
        </select>
        {type && (
          <button className={styles.resetBtn} onClick={() => { setType(""); setPage(1); }}>{t("admin.notifications.clearFilter")}</button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>{t("admin.notifications.loading")}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <MailCheck size={32} />
          <p>{type ? t("admin.notifications.emptyFiltered") : t("admin.notifications.empty")}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((n) => {
            const meta = TYPE_META[n.type] || { key: "", icon: Bell, color: "#64748b" };
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={`${styles.item} ${!n.is_read ? styles.unread : ""}`}
                onClick={() => { if (!n.is_read) markRead(n.id); }}
              >
                <div className={styles.itemIcon} style={{ background: `${meta.color}18`, color: meta.color }}>
                  <Icon size={16} />
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTop}>
                    <span className={styles.itemType} style={{ color: meta.color }}>{meta.key ? t(meta.key) : n.type}</span>
                    <span className={styles.itemTime}>{fmtTime(n.created_at)}</span>
                  </div>
                  <div className={styles.itemTitle}>{n.title}</div>
                  {n.message && <div className={styles.itemMsg}>{n.message}</div>}
                </div>
                <div className={styles.itemActions}>
                  {!n.is_read && <span className={styles.readBadge}>{t("admin.notifications.newBadge")}</span>}
                  <button
                    className={styles.iconBtn}
                    title={t("admin.notifications.dismissTitle")}
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={15} /> {t("admin.notifications.prev")}
          </button>
          <span className={styles.pageInfo}>{t("admin.notifications.pageW")} {formatNumber(page, lang)} {t("admin.notifications.ofW")} {formatNumber(totalPages, lang)} · {formatNumber(total, lang)} {t("admin.notifications.totalW")}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {t("admin.notifications.next")} <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}