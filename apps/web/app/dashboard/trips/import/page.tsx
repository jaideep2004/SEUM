"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Info } from "lucide-react";
import { useLanguage, formatNumber } from "@/lib/i18n";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface TripImportError {
  row: number;
  column: string;
  field: string;
  message: string;
  value: any;
}

interface TripImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errors: TripImportError[];
  created?: { row: number; tripNumber: string; tripId: string; title: string }[];
  createdCount?: number;
}

export default function TripImportPage() {
  const { lang, t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<TripImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    setError("");
    setDownloading(true);
    try {
      const token = localStorage.getItem("seum_access_token");
      const res = await fetch(`${API}/operations/trips/import/template`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || "Failed to download template");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seum-trip-import-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
    setDownloading(false);
  }

  function onFileChosen(f: File | null) {
    setResult(null);
    setError("");
    if (!f) { setFile(null); return; }
    const name = f.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError(t("trips.import.errXlsxOnly"));
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(t("trips.import.errTooLarge"));
      setFile(null);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    onFileChosen(f);
  }

  async function handleUpload() {
    if (!file) { setError(t("trips.import.errChooseFile")); return; }
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const token = localStorage.getItem("seum_access_token");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/operations/trips/import`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // 422 validation case returns error details
        if (json?.data && json?.error) {
          setResult(json.data as TripImportResult);
          setUploading(false);
          return;
        }
        throw new Error(json?.error?.message || json?.message || `Import failed (${res.status})`);
      }
      setResult((json.data || json) as TripImportResult);
    } catch (e) {
      setError((e as Error).message);
    }
    setUploading(false);
  }

  function clearAll() {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard/trips" className={styles.backLink}><ArrowLeft size={14} className="flip-rtl" /> {t("trips.import.back")}</Link>

      <div className={styles.header}>
        <div>
          <h1><FileSpreadsheet size={20} style={{ display: 'inline', verticalAlign: '-3px', marginInlineEnd: 8, color: '#059669' }} /> {t("trips.import.title")}</h1>
          <p className={styles.subtitle}>{t("trips.import.subA")}<strong>{t("trips.import.singleTrip")}</strong>{t("trips.import.subB")}<strong>{t("trips.import.nothingCreated")}</strong>{t("trips.import.subC")}</p>
        </div>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Download size={14} /> {t("trips.import.step1")}</h2>
          <p className={styles.cardText}>{t("trips.import.step1Text")}</p>
          <div className={styles.templateMeta}>
            <ul className={styles.colList}>
              <li><strong>{t("trips.import.colTitle")}</strong> — {t("trips.import.colTitleDesc")}</li>
              <li><strong>{t("trips.import.colDate")}</strong> — {t("trips.import.colDateDesc")}</li>
              <li><strong>{t("trips.import.colStartTime")}</strong> — {t("trips.import.colStartTimeDesc")}</li>
              <li><strong>{t("trips.import.colEndTime")}</strong> — {t("trips.import.colEndTimeDesc")}</li>
              <li><strong>{t("trips.import.colOrigin")}</strong> — {t("trips.import.colOriginDesc")}</li>
              <li><strong>{t("trips.import.colDestination")}</strong> — {t("trips.import.colDestinationDesc")}</li>
              <li><strong>{t("trips.import.colVehicleType")}</strong> — {t("trips.import.colVehicleTypeDesc")}</li>
              <li><strong>{t("trips.import.colVehicleCount")}</strong> — {t("trips.import.colVehicleCountDesc")}</li>
              <li><strong>{t("trips.import.colGroupNo")}</strong> — {t("trips.import.colGroupNoDesc")}</li>
              <li><strong>{t("trips.import.colPax")}</strong> — {t("trips.import.colPaxDesc")}</li>
              <li><strong>{t("trips.import.colNationality")}</strong> — {t("trips.import.colNationalityDesc")}</li>
              <li><strong>{t("trips.import.colAgent")}</strong> — {t("trips.import.colAgentDesc")}</li>
            </ul>
          </div>
          <button className={styles.primaryBtn} onClick={handleDownload} disabled={downloading}>
            <Download size={15} /> {downloading ? t("trips.import.downloading") : t("trips.import.downloadTpl")}
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Upload size={14} /> {t("trips.import.step2")}</h2>
          <p className={styles.cardText}>{t("trips.import.step2Text")}</p>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${file ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet size={28} style={{ color: file ? '#059669' : '#94a3b8' }} />
            <div className={styles.dropText}>
              {file ? <><strong>{file.name}</strong><span>{formatNumber(file.size / 1024, lang, 1)} {t("trips.import.dropReplace")}</span></> : <><strong>{t("trips.import.dropChoose")}</strong><span>{t("trips.import.dropHint")}</span></>}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => onFileChosen(e.target.files?.[0] || null)}
              className={styles.hiddenInput}
            />
          </div>

          <div className={styles.uploadActions}>
            <button className={styles.primaryBtn} onClick={handleUpload} disabled={!file || uploading}>
              <Upload size={15} /> {uploading ? t("trips.import.importing") : file ? `${t("trips.import.importBtn")} ${file.name}` : t("trips.import.importBtn")}
            </button>
            {file && <button className={styles.secondaryBtn} onClick={clearAll} disabled={uploading}><X size={14} /> {t("trips.import.clear")}</button>}
          </div>

          {error && <div className={styles.errorBox}><AlertTriangle size={14} /> {error}</div>}

          {result && !result.success && (
            <div className={styles.validationFail}>
              <div className={styles.failHead}><AlertTriangle size={14} /> {t("trips.import.failHead")}</div>
              <p className={styles.failText}>{formatNumber(result.totalRows, lang)} {t("trips.import.failChecked")} · {formatNumber(result.errors.length, lang)} {t("trips.import.failErrorsIn")} {formatNumber(new Set(result.errors.map(e => e.row)).size, lang)} {t("trips.import.failRows")} · {formatNumber(result.validRows, lang)} {t("trips.import.failValid")}</p>
            </div>
          )}
          {result && result.success && (
            <div className={styles.successBox}>
              <div className={styles.successHead}><CheckCircle2 size={16} /> {t("trips.import.successPrefix")} {formatNumber(result.createdCount, lang)} {t("trips.import.successSuffix")}</div>
              <p className={styles.successText}>{formatNumber(result.totalRows, lang)} {t("trips.import.successRows")}<Link href="/dashboard/trips">{t("trips.import.successTripsLink")}</Link> {t("trips.import.successQueue")}</p>
            </div>
          )}
        </section>
      </div>

      {result && !result.success && result.errors.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><AlertTriangle size={14} /> {t("trips.import.errTableTitle")}</h2>
          <p className={styles.cardSub}>{t("trips.import.errTableSub")}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("trips.import.thRow")}</th>
                  <th>{t("trips.import.thColumn")}</th>
                  <th>{t("trips.import.thField")}</th>
                  <th>{t("trips.import.thMessage")}</th>
                  <th>{t("trips.import.thValue")}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, idx) => (
                  <tr key={idx}>
                    <td className={styles.mono}>#{e.row}</td>
                    <td><span className={styles.fieldBadge}>{e.column || e.field}</span></td>
                    <td className={styles.errorVal}>{e.field}</td>
                    <td className={styles.errorMsg}>{e.message}</td>
                    <td className={styles.errorVal}>{String(e.value ?? '').slice(0, 80) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && result.success && result.created && result.created.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><CheckCircle2 size={14} /> {t("trips.import.createdTitle")}</h2>
          <p className={styles.cardSub}>{t("trips.import.createdSub")}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("trips.import.thExcelRow")}</th>
                  <th>{t("trips.import.thTripNumber")}</th>
                  <th>{t("trips.import.thTitle")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.created.map((c) => (
                  <tr key={c.tripId}>
                    <td className={styles.mono}>#{c.row}</td>
                    <td className={styles.mono}>{c.tripNumber}</td>
                    <td>{c.title || "—"}</td>
                    <td><Link href={`/dashboard/trips/${c.tripId}`} className={styles.linkBtn}>{t("trips.import.viewTrip")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.afterSuccess}>
            <Link href="/dashboard/trips" className={styles.primaryBtn}><CheckCircle2 size={14} /> {t("trips.import.goToTrips")}</Link>
            <button className={styles.secondaryBtn} onClick={clearAll}>{t("trips.import.importAnother")}</button>
          </div>
        </section>
      )}

      <section className={styles.card} style={{ background: '#f8fafc' }}>
        <h2 className={styles.cardTitle}><Info size={14} /> {t("trips.import.infoTitle")}</h2>
        <ul className={styles.infoList}>
          <li>{t("trips.import.info1")}</li>
          <li>{t("trips.import.info2A")}<strong>{t("trips.import.info2B")}</strong>{t("trips.import.info2C")}</li>
          <li>{t("trips.import.info3")}</li>
        </ul>
      </section>
    </div>
  );
}
