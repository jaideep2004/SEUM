"use client";

import { useEffect, useState } from "react";
import { FileText, AlertTriangle, Clock } from "lucide-react";
import { useLanguage, formatDate } from "@/lib/i18n";
import styles from "./page.module.css";

interface Document {
  id: string;
  busId: string;
  documentType: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string;
  plateNumber: string;
}

export default function DocumentsPage() {
  const { lang, t } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/fleet/documents/expiring?days=365`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDocuments(data.data);
    } catch (err: any) {
      setError(err.message || t("fleet.documents.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
  }

  function getDaysLabel(daysLeft: number): string {
    if (daysLeft <= 0) return t("fleet.documents.expired");
    return `${daysLeft} ${t("fleet.documents.days")}`;
  }

  const expiringSoon = documents.filter((d) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 30);
  const expired = documents.filter((d) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <FileText size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>{t("fleet.documents.title")}</h1>
          <p className={styles.headerSub}>
            {documents.length} {documents.length !== 1 ? t("fleet.documents.docsPl") : t("fleet.documents.docSg")} {t("fleet.documents.onFile")}
          </p>
        </div>
      </div>

      {expired.length > 0 && (
        <div className={`${styles.expiryBanner} ${styles.expiryBannerDanger}`}>
          <AlertTriangle size={18} />
          {expired.length} {expired.length !== 1 ? t("fleet.documents.docsPl") : t("fleet.documents.docSg")} {t("fleet.documents.expiredAttention")}
        </div>
      )}

      {expiringSoon.length > 0 && expired.length === 0 && (
        <div className={`${styles.expiryBanner} ${styles.expiryBannerWarning}`}>
          <Clock size={18} />
          {expiringSoon.length} {expiringSoon.length !== 1 ? t("fleet.documents.docsPl") : t("fleet.documents.docSg")} {t("fleet.documents.expiringAttention")}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>{t("fleet.documents.loading")}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("fleet.documents.colVehicle")}</th>
                <th>{t("fleet.documents.colType")}</th>
                <th>{t("fleet.documents.colNumber")}</th>
                <th>{t("fleet.documents.colIssue")}</th>
                <th>{t("fleet.documents.colExpiry")}</th>
                <th>{t("fleet.documents.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const daysLeft = doc.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null;
                let expiryStyle = { bg: "rgba(16,185,129,0.12)", dot: "#10b981", label: daysLeft !== null ? getDaysLabel(daysLeft) : "" };
                if (daysLeft !== null) {
                  if (daysLeft <= 0) expiryStyle = { bg: "rgba(239,68,68,0.12)", dot: "#ef4444", label: getDaysLabel(daysLeft) };
                  else if (daysLeft <= 7) expiryStyle = { bg: "rgba(239,68,68,0.12)", dot: "#ef4444", label: getDaysLabel(daysLeft) };
                  else if (daysLeft <= 30) expiryStyle = { bg: "rgba(245,158,11,0.12)", dot: "#f59e0b", label: getDaysLabel(daysLeft) };
                }

                return (
                  <tr key={doc.id}>
                    <td>
                      <div className={styles.busCell}>
                        <div className={styles.busAvatar}>
                          {doc.plateNumber?.slice(0, 3) || "—"}
                        </div>
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {doc.plateNumber || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.docType}>{doc.documentType}</div>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {doc.documentNumber || "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {doc.issueDate ? formatDate(doc.issueDate, lang) : "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {doc.expiryDate ? formatDate(doc.expiryDate, lang) : "—"}
                    </td>
                    <td>
                      {doc.expiryDate && daysLeft !== null ? (
                        <span className={styles.expiryBadge} style={{ background: expiryStyle.bg, color: expiryStyle.dot }}>
                          <span className={styles.expiryDot} style={{ background: expiryStyle.dot }} />
                          {expiryStyle.label}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>{t("fleet.documents.noExpiry")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {documents.length === 0 && !loading && (
            <div className={styles.empty}>{t("fleet.documents.empty")}</div>
          )}
        </div>
      )}
    </div>
  );
}
