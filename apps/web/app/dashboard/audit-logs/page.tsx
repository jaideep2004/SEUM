"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { useLanguage, formatDateTime, formatNumber, formatCurrency } from "@/lib/i18n";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Eye,
  User,
  Clock,
  AlertTriangle,
  Activity,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import styles from "./page.module.css";

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const actionIcons: Record<string, any> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
  login: User,
  upload: FileText,
};

const actionColors: Record<string, string> = {
  create: "var(--color-success)",
  update: "var(--color-info)",
  delete: "var(--color-danger)",
  login: "var(--color-text-secondary)",
  upload: "var(--color-warning)",
};

const resourceLabels: Record<string, string> = {
  fleet: "admin.audit.resFleet",
  bus: "admin.audit.resBus",
  bus_document: "admin.audit.resDocument",
  tenant: "admin.audit.resCompany",
  user: "admin.audit.resUser",
  auth: "admin.audit.resAuth",
};

const actionLabels: Record<string, string> = {
  create: "admin.audit.actCreate",
  update: "admin.audit.actUpdate",
  delete: "admin.audit.actDelete",
  login: "admin.audit.actLogin",
  upload: "admin.audit.actUpload",
};

export default function AuditLogsPage() {
  const { lang, t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (resource) params.set("resource", resource);
      if (action) params.set("action", action);
      if (search) params.set("search", search);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/audit-logs?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("seum_access_token")}`,
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setMeta(data.meta);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, resource, action, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [resource, action]);

  const formatJson = (val: any) => {
    if (!val) return "—";
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <ClipboardList size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("admin.audit.title")}</h1>
          <p className={styles.headerSub}>
            {meta ? `${formatNumber(meta.total, lang)} ${meta.total === 1 ? t("admin.audit.eventSingular") : t("admin.audit.eventPlural")}` : t("admin.audit.loading")}
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={t("admin.audit.searchPh")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={styles.select} value={resource} onChange={(e) => setResource(e.target.value)}>
          <option value="">{t("admin.audit.allResources")}</option>
          {Object.entries(resourceLabels).map(([key, label]) => (
            <option key={key} value={key}>{t(label)}</option>
          ))}
        </select>
        <select className={styles.select} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">{t("admin.audit.allActions")}</option>
          <option value="create">{t("admin.audit.actCreate")}</option>
          <option value="update">{t("admin.audit.actUpdate")}</option>
          <option value="delete">{t("admin.audit.actDelete")}</option>
          <option value="login">{t("admin.audit.actLogin")}</option>
          <option value="upload">{t("admin.audit.actUpload")}</option>
        </select>
        <span className={styles.logCount}>
          <Activity size={14} />
          {formatNumber(meta?.total, lang)} {t("admin.audit.eventsW")}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("admin.audit.colTimestamp")}</th>
              <th>{t("admin.audit.colActor")}</th>
              <th>{t("admin.audit.colAction")}</th>
              <th>{t("admin.audit.colResource")}</th>
              <th>{t("admin.audit.colDetails")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className={styles.loadingCell}>{t("admin.audit.loading")}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className={styles.loadingCell}>{t("admin.audit.noEntries")}</td></tr>
            ) : (
              logs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                const actionColor = actionColors[log.action] || "var(--color-text-secondary)";
                const isExpanded = expandedId === log.id;

                return (
                  <tr key={log.id}>
                    <td className={styles.cellTimestamp}>
                      <Clock size={12} />
                      {formatDateTime(log.createdAt, lang)}
                    </td>
                    <td>
                      <div className={styles.actorCell}>
                        <div className={styles.actorAvatar}>
                          {log.actorName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className={styles.actorName}>{log.actorName || t("admin.audit.system")}</div>
                          {log.actorEmail && <div className={styles.actorEmail}>{log.actorEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.actionBadge} style={{ background: `${actionColor}15`, color: actionColor }}>
                        <ActionIcon size={12} />
                        {actionLabels[log.action] ? t(actionLabels[log.action]) : log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.resourceBadge}>
                        {resourceLabels[log.resource] ? t(resourceLabels[log.resource]) : log.resource}
                      </span>
                      <span className={styles.resourceId}>#{log.resourceId.slice(0, 8)}</span>
                    </td>
                    <td className={styles.cellDetails}>
                      {log.details || (log.action === "update" ? `${formatNumber(Object.keys(log.newValue || {}).length, lang)} ${t("admin.audit.fieldsChanged")}` : "—")}
                    </td>
                    <td>
                      <button
                        className={styles.expandBtn}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {meta && meta.totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className={styles.pageInfo}>{t("admin.notifications.pageW")} {formatNumber(meta.page, lang)} {t("admin.notifications.ofW")} {formatNumber(meta.totalPages, lang)}</span>
            <button className={styles.pageBtn} disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expandedId && (() => {
        const log = logs.find((l) => l.id === expandedId);
        if (!log) return null;
        return (
          <div className={styles.detailOverlay} onClick={() => setExpandedId(null)}>
            <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailHeader}>
                <h3 className={styles.detailTitle}>{t("admin.audit.detailTitle")}</h3>
                <button className={styles.detailClose} onClick={() => setExpandedId(null)}>{t("admin.audit.close")}</button>
              </div>
              <div className={styles.detailBody}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.eventId")}</span>
                  <span className={styles.detailValue}>{log.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.colTimestamp")}</span>
                  <span className={styles.detailValue}>{formatDateTime(log.createdAt, lang)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.colActor")}</span>
                  <span className={styles.detailValue}>{log.actorName || t("admin.audit.system")} {log.actorEmail ? `(${log.actorEmail})` : ""}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.colAction")}</span>
                  <span className={styles.detailValue}>{log.action}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.colResource")}</span>
                  <span className={styles.detailValue}>{log.resource} #{log.resourceId}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t("admin.audit.ipAddress")}</span>
                  <span className={styles.detailValue}>{log.ipAddress || "—"}</span>
                </div>
                {log.details && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("admin.audit.detailsLabel")}</span>
                    <span className={styles.detailValue}>{log.details}</span>
                  </div>
                )}
                {log.oldValue && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("admin.audit.oldValue")}</span>
                    <pre className={styles.detailPre}>{formatJson(log.oldValue)}</pre>
                  </div>
                )}
                {log.newValue && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t("admin.audit.newValue")}</span>
                    <pre className={styles.detailPre}>{formatJson(log.newValue)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
