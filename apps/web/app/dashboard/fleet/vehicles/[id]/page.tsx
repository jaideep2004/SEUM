"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  Truck,
  ArrowLeft,
  Edit3,
  Trash2,
  Calendar,
  Fuel,
  Users,
  Hash,
  Palette,
  Wrench,
  MapPin,
  DollarSign,
  Building2,
  Barcode,
  Activity,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Ban,
  Info,
  Upload,
  Download,
  Plus,
} from "lucide-react";
import { ExpiryBadge, getDaysUntilExpiry, getExpiryStatus } from "@/components/fleet/ExpiryBadge";
import styles from "./page.module.css";

interface BusDetail {
  id: string;
  tenantId: string;
  plateNumber: string;
  chassisNumber: string | null;
  make: string;
  model: string;
  year: number;
  capacitySeated: number;
  capacityStanding: number;
  color: string | null;
  vin: string | null;
  engineNumber: string | null;
  fuelType: string;
  status: string;
  purchaseDate: string | null;
  purchasePrice: number | null;
  assignedDepot: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenantName?: string;
}

interface HistoryEntry {
  type: "bus_event" | "document_event";
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  details: string | null;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; dot: string; label: string }> = {
  active: { bg: "rgba(16,185,129,0.12)", dot: "#10b981", label: "Active" },
  maintenance: { bg: "rgba(245,158,11,0.12)", dot: "#f59e0b", label: "Maintenance" },
  retired: { bg: "rgba(239,68,68,0.12)", dot: "#ef4444", label: "Retired" },
  sold: { bg: "rgba(100,116,139,0.12)", dot: "#64748b", label: "Sold" },
};

const actionIcons: Record<string, any> = {
  create: CheckCircle2,
  update: Edit3,
  delete: XCircle,
  upload: FileText,
};

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  upload: "Uploaded",
};

export default function BusDetailPage() {
  const params = useParams();
  const router = useRouter();
  const busId = params.id as string;

  const [bus, setBus] = useState<BusDetail | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [docForm, setDocForm] = useState({
    documentType: "registration",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    status: "active",
  });
  const [activeTab, setActiveTab] = useState(0);

  const fetchBus = useCallback(async () => {
    try {
      const data = await api.get<any>(`/fleet/buses/${busId}`);
      setBus(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bus details");
    }
  }, [busId]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/fleet/buses/${busId}/history`);
      setHistory(data);
    } catch {}
  }, [busId]);

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const data = await api.get<any[]>(`/fleet/buses/${busId}/documents`);
      setDocuments(data);
    } catch {} finally {
      setDocsLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    Promise.all([fetchBus(), fetchHistory(), fetchDocuments()]).finally(() => setLoading(false));
  }, [fetchBus, fetchHistory, fetchDocuments]);

  const handleDocInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDocForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    setUploading(true);
    try {
      await api.post(`/fleet/buses/${busId}/documents`, docForm);
      setShowUploadModal(false);
      setDocForm({ documentType: "registration", documentNumber: "", issueDate: "", expiryDate: "", status: "active" });
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.delete(`/fleet/buses/${busId}/documents/${docId}`);
      fetchDocuments();
      fetchHistory();
    } catch {}
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/fleet/buses/${busId}`);
      router.push("/dashboard/fleet/vehicles");
    } catch (err: any) {
      setError(err.message || "Failed to delete bus");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading bus details...</div>
      </div>
    );
  }

  if (error || !bus) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} />
          <span>{error || "Bus not found"}</span>
          <button className={styles.backBtn} onClick={() => router.push("/dashboard/fleet/vehicles")}>
            Back to Vehicles
          </button>
        </div>
      </div>
    );
  }

  const sc = statusColors[bus.status] || statusColors.active;

  const infoCards = [
    { icon: Building2, label: "Make / Model", value: `${bus.make} ${bus.model}` },
    { icon: Calendar, label: "Year", value: bus.year },
    { icon: Users, label: "Capacity", value: `${bus.capacitySeated} seated${bus.capacityStanding > 0 ? ` + ${bus.capacityStanding} standing` : ""}` },
    { icon: Fuel, label: "Fuel Type", value: bus.fuelType.charAt(0).toUpperCase() + bus.fuelType.slice(1) },
    { icon: Hash, label: "Chassis Number", value: bus.chassisNumber || "—" },
    { icon: Barcode, label: "VIN", value: bus.vin || "—" },
    { icon: Wrench, label: "Engine Number", value: bus.engineNumber || "—" },
    { icon: Palette, label: "Color", value: bus.color || "—" },
    { icon: MapPin, label: "Assigned Depot", value: bus.assignedDepot || "—" },
    { icon: DollarSign, label: "Purchase Price", value: bus.purchasePrice ? `SAR ${bus.purchasePrice.toLocaleString()}` : "—" },
    { icon: Calendar, label: "Purchase Date", value: bus.purchaseDate ? new Date(bus.purchaseDate).toLocaleDateString() : "—" },
    { icon: Activity, label: "Status", value: sc.label },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard/fleet/vehicles")}>
          <ArrowLeft size={18} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.headerTop}>
            <h1 className={styles.headerTitle}>{bus.plateNumber}</h1>
            <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.dot }}>
              <span className={styles.statusDot} style={{ background: sc.dot }} />
              {sc.label}
            </span>
            {!bus.isActive && (
              <span className={styles.inactiveBadge}>
                <Ban size={12} />
                Inactive
              </span>
            )}
          </div>
          <p className={styles.headerSub}>
            {bus.make} {bus.model} &middot; Added {new Date(bus.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.actionBtn} onClick={() => router.push(`/dashboard/fleet/vehicles/${busId}/edit`)}>
            <Edit3 size={15} />
            Edit
          </button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className={styles.infoGrid}>
        {infoCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.infoCard}>
              <div className={styles.infoIcon}>
                <Icon size={16} />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>{card.label}</span>
                <span className={styles.infoValue}>{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs: History / Documents */}
      <div className={styles.tabsRow}>
        <button
          className={`${styles.tabBtn} ${activeTab === 0 ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab(0)}
        >
          <Clock size={15} />
          History
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 1 ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab(1)}
        >
          <FileText size={15} />
          Documents ({documents.length})
        </button>
      </div>

      {/* History Tab */}
      {activeTab === 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Clock size={18} />
            <h2 className={styles.sectionTitle}>Lifecycle History</h2>
          </div>
          <div className={styles.timeline}>
            {history.length === 0 ? (
              <div className={styles.timelineEmpty}>No history recorded yet</div>
            ) : (
              history.map((entry, i) => {
                const Icon = actionIcons[entry.action] || Info;
                const isLast = i === history.length - 1;
                const changes = entry.oldValue && entry.newValue
                  ? Object.keys(entry.newValue).filter((k) => (entry.newValue as any)[k] !== (entry.oldValue as any)?.[k])
                  : [];

                return (
                  <div key={entry.id} className={styles.timelineItem}>
                    <div className={styles.timelineLine}>
                      <div className={styles.timelineDot}>
                        <Icon size={12} />
                      </div>
                      {!isLast && <div className={styles.timelineConnector} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.timelineAction}>
                          {actionLabels[entry.action] || entry.action}
                        </span>
                        <span className={styles.timelineDate}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.actorName && (
                        <span className={styles.timelineActor}>
                          <User size={12} />
                          {entry.actorName}
                        </span>
                      )}
                      {entry.details && (
                        <p className={styles.timelineDetails}>{entry.details}</p>
                      )}
                      {changes.length > 0 && (
                        <div className={styles.changesList}>
                          {changes.map((key) => {
                            const oldV = entry.oldValue?.[key];
                            const newV = entry.newValue?.[key];
                            const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                            return (
                              <div key={key} className={styles.changeItem}>
                                <span className={styles.changeLabel}>{label}:</span>
                                <span className={styles.changeOld}>{String(oldV ?? "—")}</span>
                                <span className={styles.changeArrow}>&rarr;</span>
                                <span className={styles.changeNew}>{String(newV ?? "—")}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 1 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FileText size={18} />
            <h2 className={styles.sectionTitle}>Documents</h2>
            <button className={styles.uploadBtn} onClick={() => setShowUploadModal(true)}>
              <Upload size={14} />
              Upload
            </button>
          </div>
          {docsLoading ? (
            <div className={styles.timelineEmpty}>Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className={styles.timelineEmpty}>
              <FileText size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>No documents uploaded</div>
              <button className={styles.uploadEmptyBtn} onClick={() => setShowUploadModal(true)}>
                <Plus size={14} />
                Upload First Document
              </button>
            </div>
          ) : (
            <div className={styles.docTableWrap}>
              <table className={styles.docTable}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Document No.</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc: any) => {
                    const daysLeft = doc.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null;
                    const expiryStatus = getExpiryStatus(daysLeft);
                    return (
                      <tr key={doc.id}>
                        <td>
                          <span className={styles.docTypeBadge}>
                            {doc.documentType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                        </td>
                        <td className={styles.docNumber}>{doc.documentNumber || "—"}</td>
                        <td className={styles.docDate}>
                          {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className={styles.docDate}>
                          {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <ExpiryBadge expiryDate={doc.expiryDate} />
                        </td>
                        <td>
                          <button
                            className={styles.docDeleteBtn}
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upload Document</h3>
              <button className={styles.modalClose} onClick={() => setShowUploadModal(false)}>
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleUpload}>
              <div className={styles.uploadFormBody}>
                <div className={styles.uploadField}>
                  <label className={styles.uploadLabel}>Document Type *</label>
                  <select className={styles.uploadSelect} name="documentType" value={docForm.documentType} onChange={handleDocInputChange}>
                    {["registration", "insurance", "permit", "inspection", "fitness", "road_tax"].map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.uploadField}>
                  <label className={styles.uploadLabel}>Document Number</label>
                  <input className={styles.uploadInput} name="documentNumber" value={docForm.documentNumber} onChange={handleDocInputChange} placeholder="e.g. INS-2025-001" />
                </div>
                <div className={styles.uploadRow}>
                  <div className={styles.uploadField}>
                    <label className={styles.uploadLabel}>Issue Date</label>
                    <input className={styles.uploadInput} name="issueDate" type="date" value={docForm.issueDate} onChange={handleDocInputChange} />
                  </div>
                  <div className={styles.uploadField}>
                    <label className={styles.uploadLabel}>Expiry Date *</label>
                    <input className={styles.uploadInput} name="expiryDate" type="date" value={docForm.expiryDate} onChange={handleDocInputChange} required />
                  </div>
                </div>
                <div className={styles.uploadField}>
                  <label className={styles.uploadLabel}>Status</label>
                  <select className={styles.uploadSelect} name="status" value={docForm.status} onChange={handleDocInputChange}>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {uploadError && <div className={styles.uploadError}>{uploadError}</div>}
              </div>
              <div className={styles.uploadActions}>
                <button type="button" className={styles.uploadCancelBtn} onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" className={styles.uploadSubmitBtn} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalTitle}>Delete Vehicle</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete <strong>{bus.plateNumber}</strong>? This will soft-delete the vehicle and it will no longer appear in active listings.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className={styles.modalConfirm} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
