"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/services/api";
import styles from "./page.module.css";

interface ReportData {
  [key: string]: any;
}

type ReportType =
  | "profit-loss"
  | "balance-sheet"
  | "ar-aging"
  | "ap-aging"
  | "cash-flow"
  | "expense-category"
  | "revenue-route"
  | "revenue-bus";

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "ar-aging", label: "AR Aging" },
  { key: "ap-aging", label: "AP Aging" },
  { key: "cash-flow", label: "Cash Flow" },
  { key: "expense-category", label: "Expense by Category" },
  { key: "revenue-route", label: "Revenue by Route" },
  { key: "revenue-bus", label: "Revenue by Bus" },
];

const DATE_RANGES = [
  { label: "This Month", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]; }, end: () => new Date().toISOString().split("T")[0] },
  { label: "Last Month", start: () => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split("T")[0]; }, end: () => { const d = new Date(); d.setDate(0); return d.toISOString().split("T")[0]; } },
  { label: "This Quarter", start: () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString().split("T")[0]; }, end: () => new Date().toISOString().split("T")[0] },
  { label: "This Year", start: () => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], end: () => new Date().toISOString().split("T")[0] },
  { label: "All Time", start: () => "2024-01-01", end: () => new Date().toISOString().split("T")[0] },
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currency(n: number): string {
  return `SAR ${fmt(n)}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("profit-loss");
  const [dateRange, setDateRange] = useState(DATE_RANGES[4]);
  const [startDate, setStartDate] = useState(dateRange.start());
  const [endDate, setEndDate] = useState(dateRange.end());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStartDate(dateRange.start());
    setEndDate(dateRange.end());
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (activeTab === "balance-sheet" || activeTab === "ar-aging" || activeTab === "ap-aging") {
        params.set("as_of_date", endDate);
      }
      const res = await fetch(`${API_URL}/api/v1/accounting/reports/${activeTab}?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || "Failed to load report");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function exportReport(format: "pdf" | "csv") {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (activeTab === "balance-sheet" || activeTab === "ar-aging" || activeTab === "ap-aging") {
      params.set("as_of_date", endDate);
    }
    window.open(`${API_URL}/api/v1/accounting/reports/export/${activeTab}/${format}?${params}`, "_blank");
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Financial Reports</h1>
        <div className={styles.actions}>
          <div className={styles.datePicker}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.dateInput} />
            <span className={styles.dateSep}>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.dateInput} />
          </div>
          <select value={dateRange.label} onChange={(e) => {
            const r = DATE_RANGES.find((dr) => dr.label === e.target.value);
            if (r) setDateRange(r);
          }} className={styles.rangeSelect}>
            {DATE_RANGES.map((r) => <option key={r.label}>{r.label}</option>)}
          </select>
          <button onClick={() => exportReport("pdf")} className={styles.exportBtn}>Export PDF</button>
          <button onClick={() => exportReport("csv")} className={styles.exportBtn}>Export CSV</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {REPORT_TABS.map((tab) => (
          <button key={tab.key} className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Loading...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {data && !loading && (
          <>
            {activeTab === "profit-loss" && <ProfitLoss data={data} />}
            {activeTab === "balance-sheet" && <BalanceSheet data={data} />}
            {activeTab === "ar-aging" && <Aging data={data} title="Accounts Receivable Aging" />}
            {activeTab === "ap-aging" && <Aging data={data} title="Accounts Payable Aging" />}
            {activeTab === "cash-flow" && <CashFlow data={data} />}
            {activeTab === "expense-category" && <ExpenseCategory data={data} />}
            {activeTab === "revenue-route" && <RevenueGroup data={data} title="Revenue by Route" />}
            {activeTab === "revenue-bus" && <RevenueGroup data={data} title="Revenue by Bus" />}
          </>
        )}
      </div>
    </div>
  );
}

function ProfitLoss({ data }: { data: ReportData }) {
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Revenue</span><span className={styles.summaryValue}>{currency(data.totalRevenue)}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Expenses</span><span className={styles.summaryValue}>{currency(data.totalExpenses)}</span></div>
        <div className={`${styles.summaryCard} ${data.netProfit >= 0 ? styles.profitCard : styles.lossCard}`}>
          <span className={styles.summaryLabel}>{data.netProfit >= 0 ? "Net Profit" : "Net Loss"}</span>
          <span className={styles.summaryValue}>{currency(Math.abs(data.netProfit))}</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>Revenue</h3>
        <table className={styles.table}><tbody>
          {data.revenueBreakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellCode}>{r.code}</td><td className={styles.cellName}>{r.name}</td><td className={styles.cellAmount}>{currency(r.amount)}</td></tr>
          ))}
          <tr className={styles.totalRow}><td></td><td>Total Revenue</td><td>{currency(data.totalRevenue)}</td></tr>
        </tbody></table>
      </div>

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>Expenses</h3>
        <table className={styles.table}><tbody>
          {data.expenseBreakdown?.map((e: any, i: number) => (
            <tr key={i}><td className={styles.cellCode}>{e.code}</td><td className={styles.cellName}>{e.name}</td><td className={styles.cellAmount}>{currency(e.amount)}</td></tr>
          ))}
          <tr className={styles.totalRow}><td></td><td>Total Expenses</td><td>{currency(data.totalExpenses)}</td></tr>
        </tbody></table>
      </div>
    </div>
  );
}

function BalanceSheet({ data }: { data: ReportData }) {
  return (
    <div className={styles.report}>
      {data.sections?.filter((s: any) => s.accounts).map((section: any, i: number) => (
        <div key={i} className={styles.tableWrap}>
          <h3 className={styles.sectionTitle}>{section.section}</h3>
          <table className={styles.table}><tbody>
            {section.accounts?.map((a: any, j: number) => (
              <tr key={j}><td className={styles.cellCode}>{a.code}</td><td className={styles.cellName}>{a.name}</td><td className={styles.cellAmount}>{currency(a.amount)}</td></tr>
            ))}
            {section.retainedEarnings !== undefined && (
              <tr><td></td><td className={styles.cellName}>Retained Earnings</td><td className={styles.cellAmount}>{currency(section.retainedEarnings)}</td></tr>
            )}
            <tr className={styles.totalRow}><td></td><td>Total {section.section}</td><td>{currency(section.total)}</td></tr>
          </tbody></table>
        </div>
      ))}
      <div className={styles.balanceTotal}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Liabilities & Equity</span>
          <span className={styles.summaryValue}>{currency(data.sections?.find((s: any) => s.section === "Total Liabilities & Equity")?.total || 0)}</span>
        </div>
      </div>
    </div>
  );
}

function Aging({ data, title }: { data: ReportData; title: string }) {
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        {Object.entries(data.totals || {}).map(([bucket, total]) => (
          <div key={bucket} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{bucket}</span>
            <span className={styles.summaryValue}>{currency(total as number)}</span>
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr>
          <th>Invoice / Vendor</th>
          <th>Date</th>
          <th>Due Date</th>
          <th>Days Overdue</th>
          <th>Outstanding</th>
          <th>Bucket</th>
          <th>Status</th>
        </tr></thead><tbody>
          {data.aging?.map((r: any, i: number) => (
            <tr key={i}>
              <td>{(r.invoiceNumber || r.vendor)}</td>
              <td>{r.invoiceDate || r.date}</td>
              <td>{r.dueDate}</td>
              <td>{r.daysOverdue}</td>
              <td className={styles.cellAmount}>{currency(r.outstanding)}</td>
              <td><span className={`${styles.badge} ${styles[`bucket${r.bucket?.replace("+", "plus")}`]}`}>{r.bucket}</span></td>
              <td><span className={`${styles.badge} ${styles[`status${r.status}`]}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

function CashFlow({ data }: { data: ReportData }) {
  const sections = [
    { label: "Operating", s: data.operating },
    { label: "Investing", s: data.investing },
    { label: "Financing", s: data.financing },
  ];
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        {sections.map((sec) => (
          <div key={sec.label} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{sec.label}</span>
            <span className={`${styles.summaryValue} ${(sec.s?.net || 0) >= 0 ? styles.profitText : styles.lossText}`}>
              {currency(sec.s?.net || 0)}
            </span>
          </div>
        ))}
      </div>

      {sections.map((sec) => (
        <div key={sec.label} className={styles.tableWrap}>
          <h3 className={styles.sectionTitle}>{sec.label} Activities</h3>
          <table className={styles.table}><tbody>
            <tr><td className={styles.cellName}>Inflow</td><td className={styles.cellAmount}>{currency(sec.s?.inflow || 0)}</td></tr>
            <tr><td className={styles.cellName}>Outflow</td><td className={styles.cellAmount}>{currency(sec.s?.outflow || 0)}</td></tr>
            <tr className={styles.totalRow}><td>Net {sec.label}</td><td>{currency(sec.s?.net || 0)}</td></tr>
          </tbody></table>
        </div>
      ))}

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>Operating Breakdown</h3>
        <table className={styles.table}><tbody>
          {data.operating?.breakdown?.map((b: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{b.category}</td><td className={styles.cellAmount}>{currency(b.amount)}</td></tr>
          ))}
        </tbody></table>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Net Cash Change</span>
          <span className={`${styles.summaryValue} ${(data.netCashChange || 0) >= 0 ? styles.profitText : styles.lossText}`}>{currency(data.netCashChange)}</span>
        </div>
      </div>
    </div>
  );
}

function ExpenseCategory({ data }: { data: ReportData }) {
  const grandTotal = data.grandTotal || 0;
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>Grand Total</span><span className={styles.summaryValue}>{currency(grandTotal)}</span></div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr><th>Category</th><th>Count</th><th>Total</th><th>%</th></tr></thead><tbody>
          {data.breakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{r.category}</td><td>{r.count}</td><td className={styles.cellAmount}>{currency(r.total)}</td><td>{grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : "0"}%</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

function RevenueGroup({ data, title }: { data: ReportData; title: string }) {
  return (
    <div className={styles.report}>
      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr><th>{data.groupBy === "bus" ? "Bus" : "Route"}</th><th>Trips</th><th>Total Revenue</th></tr></thead><tbody>
          {data.breakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{r.label}</td><td>{r.tripCount}</td><td className={styles.cellAmount}>{currency(r.totalRevenue)}</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
