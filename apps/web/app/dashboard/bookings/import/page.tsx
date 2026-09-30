"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Info } from "lucide-react";
import { bookingService, type ImportResult } from "@/services/bookings";
import { useLanguage, formatDate, formatNumber } from "@/lib/i18n";
import styles from "./page.module.css";

export default function BookingImportPage() {
  const { lang, t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    setError("");
    setDownloading(true);
    try {
      await bookingService.downloadImportTemplate();
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
      setError(t("bookings.import.errXlsxOnly"));
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(t("bookings.import.errTooLarge"));
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
    if (!file) { setError(t("bookings.import.errChooseFile")); return; }
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const res = await bookingService.importExcel(file);
      setResult(res);
      if (!res.success) {
        // keep file so user can fix and re-upload
      } else {
        // success — clear file
        // keep result visible
      }
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
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} className="flip-rtl" /> {t("bookings.import.back")}</Link>

      <div className={styles.header}>
        <div>
          <h1><FileSpreadsheet size={20} style={{ display: 'inline', verticalAlign: '-3px', marginInlineEnd: 8, color: '#059669' }} /> {t("bookings.import.title")}</h1>
          <p className={styles.subtitle}>{t("bookings.import.subA")}<strong>{t("bookings.import.pendingApproval")}</strong>{t("bookings.import.subB")}<strong>{t("bookings.import.channelExcel")}</strong>{t("bookings.import.subC")}<strong>{t("bookings.import.nothingCreated")}</strong>{t("bookings.import.subD")}</p>
        </div>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Download size={14} /> {t("bookings.import.step1")}</h2>
          <p className={styles.cardText}>{t("bookings.import.step1Text")}</p>
          <div className={styles.templateMeta}>
            <ul className={styles.colList}>
              <li><strong>{t("bookings.import.colCustomerName")}</strong> — {t("bookings.import.colCustomerNameDesc")}</li>
              <li><strong>{t("bookings.import.colCustomerPhone")}</strong> — {t("bookings.import.colCustomerPhoneDesc")}</li>
              <li><strong>{t("bookings.import.colPickup")}</strong> — {t("bookings.import.colPickupDesc")}</li>
              <li><strong>{t("bookings.import.colDestination")}</strong> — {t("bookings.import.colDestinationDesc")}</li>
              <li><strong>{t("bookings.import.colDate")}</strong> — {t("bookings.import.colDateDesc")}</li>
              <li><strong>{t("bookings.import.colTime")}</strong> — {t("bookings.import.colTimeDesc")}</li>
              <li><strong>{t("bookings.import.colPax")}</strong> — {t("bookings.import.colPaxDesc")}</li>
              <li><strong>{t("bookings.import.colTripType")}</strong> — {t("bookings.import.colTripTypeDesc")}</li>
              <li><strong>{t("bookings.import.colPrice")}</strong> — {t("bookings.import.colPriceDesc")}</li>
              <li><strong>{t("bookings.import.colNotes")}</strong> — {t("bookings.import.colNotesDesc")}</li>
            </ul>
          </div>
          <button className={styles.primaryBtn} onClick={handleDownload} disabled={downloading}>
            <Download size={15} /> {downloading ? t("bookings.import.downloading") : t("bookings.import.downloadTpl")}
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Upload size={14} /> {t("bookings.import.step2")}</h2>
          <p className={styles.cardText}>{t("bookings.import.step2Text")}</p>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${file ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet size={28} style={{ color: file ? '#059669' : '#94a3b8' }} />
            <div className={styles.dropText}>
              {file ? <><strong>{file.name}</strong><span>{formatNumber(file.size / 1024, lang, 1)} {t("bookings.import.dropReplace")}</span></> : <><strong>{t("bookings.import.dropChoose")}</strong><span>{t("bookings.import.dropHint")}</span></>}
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
              <Upload size={15} /> {uploading ? t("bookings.import.importing") : file ? `${t("bookings.import.importBtn")} ${file.name}` : t("bookings.import.importBtn")}
            </button>
            {file && <button className={styles.secondaryBtn} onClick={clearAll} disabled={uploading}><X size={14} /> {t("bookings.import.clear")}</button>}
          </div>

          {error && <div className={styles.errorBox}><AlertTriangle size={14} /> {error}</div>}

          {result && !result.success && (
            <div className={styles.validationFail}>
              <div className={styles.failHead}><AlertTriangle size={14} /> {t("bookings.import.failHead")}</div>
              <p className={styles.failText}>{formatNumber(result.totalRows, lang)} {t("bookings.import.failChecked")} · {formatNumber(result.errors.length, lang)} {t("bookings.import.failErrorsIn")} {formatNumber(new Set(result.errors.map(e => e.row)).size, lang)} {t("bookings.import.failRows")} · {formatNumber(result.validRows, lang)} {t("bookings.import.failValid")}</p>
            </div>
          )}
          {result && result.success && (
            <div className={styles.successBox}>
              <div className={styles.successHead}><CheckCircle2 size={16} /> {t("bookings.import.successPrefix")} {formatNumber(result.createdCount, lang)} {t("bookings.import.successSuffix")}</div>
              <p className={styles.successText}>{formatNumber(result.totalRows, lang)} {t("bookings.import.successRows")}<Link href="/dashboard/bookings?status=pending_approval">{t("bookings.import.successPending")}</Link> {t("bookings.import.successQueue")}</p>
            </div>
          )}
        </section>
      </div>

      {result && !result.success && result.errors.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><AlertTriangle size={14} /> {t("bookings.import.errTableTitle")}</h2>
          <p className={styles.cardSub}>{t("bookings.import.errTableSub")}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("bookings.import.thRow")}</th>
                  <th>{t("bookings.import.thColumn")}</th>
                  <th>{t("bookings.import.thMessage")}</th>
                  <th>{t("bookings.import.thValue")}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, idx) => (
                  <tr key={idx}>
                    <td className={styles.mono}>#{e.row}</td>
                    <td><span className={styles.fieldBadge}>{e.column || e.field}</span></td>
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
          <h2 className={styles.cardTitle}><CheckCircle2 size={14} /> {t("bookings.import.createdTitle")}</h2>
          <p className={styles.cardSub}>{t("bookings.import.createdSub")}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("bookings.import.thExcelRow")}</th>
                  <th>{t("bookings.import.thCustomer")}</th>
                  <th>{t("bookings.import.thBookingRef")}</th>
                  <th>{t("bookings.import.thStatus")}</th>
                  <th>{t("bookings.import.thChannel")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.created.map((c) => (
                  <tr key={c.bookingReference}>
                    <td className={styles.mono}>#{c.row}</td>
                    <td>{c.customerName}</td>
                    <td className={styles.mono}>{c.bookingReference}</td>
                    <td><span className={styles.statusBadge} style={{ color: '#f97316', background: '#fff7ed' }}>{t("bookings.import.badgePending")}</span></td>
                    <td><span className={styles.statusBadge} style={{ color: '#059669', background: '#ecfdf5' }}>{t("bookings.import.badgeExcel")}</span></td>
                    <td><Link href={`/dashboard/bookings`} className={styles.linkBtn}>{t("bookings.import.viewQueue")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.afterSuccess}>
            <Link href="/dashboard/bookings" className={styles.primaryBtn}><CheckCircle2 size={14} /> {t("bookings.import.goToBookings")}</Link>
            <button className={styles.secondaryBtn} onClick={clearAll}>{t("bookings.import.importAnother")}</button>
          </div>
        </section>
      )}

      <section className={styles.card} style={{ background: '#f8fafc' }}>
        <h2 className={styles.cardTitle}><Info size={14} /> {t("bookings.import.infoTitle")}</h2>
        <ul className={styles.infoList}>
          <li>{t("bookings.import.info1")}</li>
          <li>{t("bookings.import.info2A")}<strong>{t("bookings.import.info2B")}</strong>{t("bookings.import.info2C")}</li>
          <li>{t("bookings.import.info3A")}<code>status = pending_approval</code>{t("bookings.import.info3B")}<code>channel = excel</code>{t("bookings.import.info3C")}</li>
          <li><code>trip_id</code>{t("bookings.import.info4A")}</li>
        </ul>
      </section>
    </div>
  );
}
