"use client";

import { useEffect, useState } from "react";
import { FileText, AlertTriangle, Clock } from "lucide-react";
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
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
  }

  const expiringSoon = documents.filter((d) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 30);
  const expired = documents.filter((d) => d.expiryDate && getDaysUntilExpiry(d.expiryDate) <= 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <FileText size={24} className={styles.headerIcon} />
        <div>
          <h1 className={styles.headerTitle}>Vehicle Documents</h1>
          <p className={styles.headerSub}>
            {documents.length} document{documents.length !== 1 ? "s" : ""} on file
          </p>
        </div>
      </div>

      {expired.length > 0 && (
        <div className={`${styles.expiryBanner} ${styles.expiryBannerDanger}`}>
          <AlertTriangle size={18} />
          {expired.length} document{expired.length !== 1 ? "s" : ""} expired — requires immediate attention
        </div>
      )}

      {expiringSoon.length > 0 && expired.length === 0 && (
        <div className={`${styles.expiryBanner} ${styles.expiryBannerWarning}`}>
          <Clock size={18} />
          {expiringSoon.length} document{expiringSoon.length !== 1 ? "s" : ""} expiring within 30 days
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading documents...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Document Type</th>
                <th>Document No.</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const daysLeft = doc.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null;
                let expiryStyle = { bg: "rgba(16,185,129,0.12)", dot: "#10b981", label: `${daysLeft} days` };
                if (daysLeft !== null) {
                  if (daysLeft <= 0) expiryStyle = { bg: "rgba(239,68,68,0.12)", dot: "#ef4444", label: "Expired" };
                  else if (daysLeft <= 7) expiryStyle = { bg: "rgba(239,68,68,0.12)", dot: "#ef4444", label: `${daysLeft} days` };
                  else if (daysLeft <= 30) expiryStyle = { bg: "rgba(245,158,11,0.12)", dot: "#f59e0b", label: `${daysLeft} days` };
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
                      {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      {doc.expiryDate && daysLeft !== null ? (
                        <span className={styles.expiryBadge} style={{ background: expiryStyle.bg, color: expiryStyle.dot }}>
                          <span className={styles.expiryDot} style={{ background: expiryStyle.dot }} />
                          {expiryStyle.label}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>No expiry</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {documents.length === 0 && !loading && (
            <div className={styles.empty}>No documents found</div>
          )}
        </div>
      )}
    </div>
  );
}
