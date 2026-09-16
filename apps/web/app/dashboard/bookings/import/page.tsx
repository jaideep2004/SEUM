"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Info } from "lucide-react";
import { bookingService, type ImportResult } from "@/services/bookings";
import styles from "./page.module.css";

export default function BookingImportPage() {
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
      setError("Only .xlsx files are accepted");
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large — max 5 MB");
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
    if (!file) { setError("Choose a file first"); return; }
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
      <Link href="/dashboard/bookings" className={styles.backLink}><ArrowLeft size={14} /> Bookings</Link>

      <div className={styles.header}>
        <div>
          <h1><FileSpreadsheet size={20} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8, color: '#059669' }} /> Excel Bulk Import</h1>
          <p className={styles.subtitle}>Upload a standardized .xlsx file to create multiple bookings at once. All rows land as <strong>Pending Approval</strong> with <strong>channel = excel</strong>. If any row has an error, <strong>nothing is created</strong> — fix the errors and re-upload.</p>
        </div>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Download size={14} /> Step 1 — Download Template</h2>
          <p className={styles.cardText}>The template contains the exact column headers the importer expects plus an example row and an Instructions sheet. Do not rename headers.</p>
          <div className={styles.templateMeta}>
            <ul className={styles.colList}>
              <li><strong>Customer Name *</strong> — must match an existing customer (by phone or name)</li>
              <li><strong>Customer Phone *</strong> — exact phone match</li>
              <li><strong>Pickup Location *</strong> — e.g., Jeddah — Al Hamra</li>
              <li><strong>Destination *</strong> — e.g., Makkah — Al Haram</li>
              <li><strong>Date (YYYY-MM-DD) *</strong> — e.g., 2026-09-15</li>
              <li><strong>Time (HH:MM) *</strong> — 24-hour, e.g., 08:30</li>
              <li><strong>Passengers *</strong> — integer 1–100</li>
              <li><strong>Trip Type</strong> — charter / shuttle etc.</li>
              <li><strong>Price (SAR) *</strong> — total amount ≥ 0</li>
              <li><strong>Notes</strong> — optional special requirements</li>
            </ul>
          </div>
          <button className={styles.primaryBtn} onClick={handleDownload} disabled={downloading}>
            <Download size={15} /> {downloading ? "Downloading..." : "Download Template (.xlsx)"}
          </button>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><Upload size={14} /> Step 2 — Upload & Import</h2>
          <p className={styles.cardText}>Choose the filled template and upload. Validation is per-row: required fields, customer match, date/time formats, pax count, price, duplicates. You will get a row-by-row error report if anything is wrong.</p>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${file ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet size={28} style={{ color: file ? '#059669' : '#94a3b8' }} />
            <div className={styles.dropText}>
              {file ? <><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB — click or drag to replace</span></> : <><strong>Click to choose file</strong><span>or drag & drop .xlsx here (max 5 MB)</span></>}
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
              <Upload size={15} /> {uploading ? "Importing..." : file ? `Import ${file.name}` : "Import"}
            </button>
            {file && <button className={styles.secondaryBtn} onClick={clearAll} disabled={uploading}><X size={14} /> Clear</button>}
          </div>

          {error && <div className={styles.errorBox}><AlertTriangle size={14} /> {error}</div>}

          {result && !result.success && (
            <div className={styles.validationFail}>
              <div className={styles.failHead}><AlertTriangle size={14} /> Validation failed — no bookings created</div>
              <p className={styles.failText}>{result.totalRows} row(s) checked · {result.errors.length} error(s) in {new Set(result.errors.map(e => e.row)).size} row(s) · {result.validRows} row(s) valid. Fix the rows below and re-upload.</p>
            </div>
          )}
          {result && result.success && (
            <div className={styles.successBox}>
              <div className={styles.successHead}><CheckCircle2 size={16} /> Successfully imported {result.createdCount} booking(s) as Pending Approval (channel = excel)</div>
              <p className={styles.successText}>{result.totalRows} row(s) processed — all validations passed. Bookings appear in the <Link href="/dashboard/bookings?status=pending_approval">Pending Approval</Link> queue.</p>
            </div>
          )}
        </section>
      </div>

      {result && !result.success && result.errors.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}><AlertTriangle size={14} /> Error Table — fix and re-upload</h2>
          <p className={styles.cardSub}>Each row is an Excel row number (header is row 1). Column shows the field that failed.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Column / Field</th>
                  <th>Message</th>
                  <th>Value</th>
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
          <h2 className={styles.cardTitle}><CheckCircle2 size={14} /> Created Bookings</h2>
          <p className={styles.cardSub}>Booking references generated — click to open. All are pending approval.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Excel Row</th>
                  <th>Customer</th>
                  <th>Booking Reference</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.created.map((c) => (
                  <tr key={c.bookingReference}>
                    <td className={styles.mono}>#{c.row}</td>
                    <td>{c.customerName}</td>
                    <td className={styles.mono}>{c.bookingReference}</td>
                    <td><span className={styles.statusBadge} style={{ color: '#f97316', background: '#fff7ed' }}>pending approval</span></td>
                    <td><span className={styles.statusBadge} style={{ color: '#059669', background: '#ecfdf5' }}>excel</span></td>
                    <td><Link href={`/dashboard/bookings`} className={styles.linkBtn}>View queue</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.afterSuccess}>
            <Link href="/dashboard/bookings" className={styles.primaryBtn}><CheckCircle2 size={14} /> Go to Bookings</Link>
            <button className={styles.secondaryBtn} onClick={clearAll}>Import another file</button>
          </div>
        </section>
      )}

      <section className={styles.card} style={{ background: '#f8fafc' }}>
        <h2 className={styles.cardTitle}><Info size={14} /> What happens after import?</h2>
        <ul className={styles.infoList}>
          <li>Rows are validated one-by-one: required fields, customer must already exist (match by name or phone), date as YYYY-MM-DD, time as HH:MM, passengers 1–100, price ≥ 0, duplicates within the file are rejected.</li>
          <li>If ANY row fails, <strong>no bookings are created</strong> (fail-safe). Fix the error table and re-upload the same file.</li>
          <li>On success, each row becomes a booking with <code>status = pending_approval</code> and <code>channel = excel</code>. They appear in the Pending Approval queue for supervisor review.</li>
          <li><code>trip_id</code> is left empty — the planning team assigns vehicle/driver later. Pickup/Destination/Date/Time/Trip Type/Pax/Price are stored on the booking as requested fields.</li>
        </ul>
      </section>
    </div>
  );
}
