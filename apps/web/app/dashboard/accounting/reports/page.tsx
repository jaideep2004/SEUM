"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/services/api";
import { useLanguage, formatDate, formatNumber, formatCurrency } from "@/lib/i18n";
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

const REPORT_TABS: { key: ReportType; labelKey: string }[] = [
  { key: "profit-loss", labelKey: "finance.reports.tabProfitLoss" },
  { key: "balance-sheet", labelKey: "finance.reports.tabBalanceSheet" },
  { key: "ar-aging", labelKey: "finance.reports.tabArAging" },
  { key: "ap-aging", labelKey: "finance.reports.tabApAging" },
  { key: "cash-flow", labelKey: "finance.reports.tabCashFlow" },
  { key: "expense-category", labelKey: "finance.reports.tabExpenseCategory" },
  { key: "revenue-route", labelKey: "finance.reports.tabRevenueRoute" },
  { key: "revenue-bus", labelKey: "finance.reports.tabRevenueBus" },
];

const DATE_RANGES = [
  { labelKey: "finance.reports.rangeThisMonth", start: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]; }, end: () => new Date().toISOString().split("T")[0] },
  { labelKey: "finance.reports.rangeLastMonth", start: () => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d.toISOString().split("T")[0]; }, end: () => { const d = new Date(); d.setDate(0); return d.toISOString().split("T")[0]; } },
  { labelKey: "finance.reports.rangeThisQuarter", start: () => { const d = new Date(); return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString().split("T")[0]; }, end: () => new Date().toISOString().split("T")[0] },
  { labelKey: "finance.reports.rangeThisYear", start: () => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], end: () => new Date().toISOString().split("T")[0] },
  { labelKey: "finance.reports.rangeAllTime", start: () => "2024-01-01", end: () => new Date().toISOString().split("T")[0] },
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReportsPage() {
  const { lang, t } = useLanguage();
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
      else setError(json.error || t("finance.reports.loadFailed"));
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
        <h1 className={styles.title}>{t("finance.reports.title")}</h1>
        <div className={styles.actions}>
          <div className={styles.datePicker}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.dateInput} />
            <span className={styles.dateSep}>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.dateInput} />
          </div>
          <select value={dateRange.labelKey} onChange={(e) => {
            const r = DATE_RANGES.find((dr) => dr.labelKey === e.target.value);
            if (r) setDateRange(r);
          }} className={styles.rangeSelect}>
            {DATE_RANGES.map((r) => <option key={r.labelKey} value={r.labelKey}>{t(r.labelKey)}</option>)}
          </select>
          <button onClick={() => exportReport("pdf")} className={styles.exportBtn}>{t("finance.reports.exportPdf")}</button>
          <button onClick={() => exportReport("csv")} className={styles.exportBtn}>{t("finance.reports.exportCsv")}</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {REPORT_TABS.map((tab) => (
          <button key={tab.key} className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`} onClick={() => setActiveTab(tab.key)}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>{t("finance.reports.loading")}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {data && !loading && (
          <>
            {activeTab === "profit-loss" && <ProfitLoss data={data} />}
            {activeTab === "balance-sheet" && <BalanceSheet data={data} />}
            {activeTab === "ar-aging" && <Aging data={data} titleKey="finance.reports.agingArTitle" />}
            {activeTab === "ap-aging" && <Aging data={data} titleKey="finance.reports.agingApTitle" />}
            {activeTab === "cash-flow" && <CashFlow data={data} />}
            {activeTab === "expense-category" && <ExpenseCategory data={data} />}
            {activeTab === "revenue-route" && <RevenueGroup data={data} titleKey="finance.reports.revRouteTitle" />}
            {activeTab === "revenue-bus" && <RevenueGroup data={data} titleKey="finance.reports.revBusTitle" />}
          </>
        )}
      </div>
    </div>
  );
}

function ProfitLoss({ data }: { data: ReportData }) {
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.reports.plRevenue")}</span><span className={styles.summaryValue}>{money(data.totalRevenue)}</span></div>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.reports.plExpenses")}</span><span className={styles.summaryValue}>{money(data.totalExpenses)}</span></div>
        <div className={`${styles.summaryCard} ${data.netProfit >= 0 ? styles.profitCard : styles.lossCard}`}>
          <span className={styles.summaryLabel}>{data.netProfit >= 0 ? t("finance.reports.plNetProfit") : t("finance.reports.plNetLoss")}</span>
          <span className={styles.summaryValue}>{money(Math.abs(data.netProfit))}</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>{t("finance.reports.secRevenue")}</h3>
        <table className={styles.table}><tbody>
          {data.revenueBreakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellCode}>{r.code}</td><td className={styles.cellName}>{r.name}</td><td className={styles.cellAmount}>{money(r.amount)}</td></tr>
          ))}
          <tr className={styles.totalRow}><td></td><td>{t("finance.reports.totalRevenue")}</td><td>{money(data.totalRevenue)}</td></tr>
        </tbody></table>
      </div>

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>{t("finance.reports.secExpenses")}</h3>
        <table className={styles.table}><tbody>
          {data.expenseBreakdown?.map((e: any, i: number) => (
            <tr key={i}><td className={styles.cellCode}>{e.code}</td><td className={styles.cellName}>{e.name}</td><td className={styles.cellAmount}>{money(e.amount)}</td></tr>
          ))}
          <tr className={styles.totalRow}><td></td><td>{t("finance.reports.totalExpenses")}</td><td>{money(data.totalExpenses)}</td></tr>
        </tbody></table>
      </div>
    </div>
  );
}

function BalanceSheet({ data }: { data: ReportData }) {
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  return (
    <div className={styles.report}>
      {data.sections?.filter((s: any) => s.accounts).map((section: any, i: number) => (
        <div key={i} className={styles.tableWrap}>
          <h3 className={styles.sectionTitle}>{section.section}</h3>
          <table className={styles.table}><tbody>
            {section.accounts?.map((a: any, j: number) => (
              <tr key={j}><td className={styles.cellCode}>{a.code}</td><td className={styles.cellName}>{a.name}</td><td className={styles.cellAmount}>{money(a.amount)}</td></tr>
            ))}
            {section.retainedEarnings !== undefined && (
              <tr><td></td><td className={styles.cellName}>{t("finance.reports.retained")}</td><td className={styles.cellAmount}>{money(section.retainedEarnings)}</td></tr>
            )}
            <tr className={styles.totalRow}><td></td><td>{t("finance.reports.totalPre")} {section.section}</td><td>{money(section.total)}</td></tr>
          </tbody></table>
        </div>
      ))}
      <div className={styles.balanceTotal}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("finance.reports.liabEquity")}</span>
          <span className={styles.summaryValue}>{money(data.sections?.find((s: any) => s.section === "Total Liabilities & Equity")?.total || 0)}</span>
        </div>
      </div>
    </div>
  );
}

function Aging({ data, titleKey }: { data: ReportData; titleKey: string }) {
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  void titleKey;
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        {Object.entries(data.totals || {}).map(([bucket, total]) => (
          <div key={bucket} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{bucket}</span>
            <span className={styles.summaryValue}>{money(total as number)}</span>
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr>
          <th>{t("finance.reports.colInvoiceVendor")}</th>
          <th>{t("finance.reports.colDate")}</th>
          <th>{t("finance.reports.colDueDate")}</th>
          <th>{t("finance.reports.colDaysOverdue")}</th>
          <th>{t("finance.reports.colOutstanding")}</th>
          <th>{t("finance.reports.colBucket")}</th>
          <th>{t("finance.reports.colStatus")}</th>
        </tr></thead><tbody>
          {data.aging?.map((r: any, i: number) => (
            <tr key={i}>
              <td>{(r.invoiceNumber || r.vendor)}</td>
              <td>{formatDate(r.invoiceDate || r.date, lang)}</td>
              <td>{formatDate(r.dueDate, lang)}</td>
              <td>{r.daysOverdue}</td>
              <td className={styles.cellAmount}>{money(r.outstanding)}</td>
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
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  const sections = [
    { labelKey: "finance.reports.cfOperating", label: t("finance.reports.cfOperating"), s: data.operating },
    { labelKey: "finance.reports.cfInvesting", label: t("finance.reports.cfInvesting"), s: data.investing },
    { labelKey: "finance.reports.cfFinancing", label: t("finance.reports.cfFinancing"), s: data.financing },
  ];
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        {sections.map((sec) => (
          <div key={sec.labelKey} className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{sec.label}</span>
            <span className={`${styles.summaryValue} ${(sec.s?.net || 0) >= 0 ? styles.profitText : styles.lossText}`}>
              {money(sec.s?.net || 0)}
            </span>
          </div>
        ))}
      </div>

      {sections.map((sec) => (
        <div key={sec.labelKey} className={styles.tableWrap}>
          <h3 className={styles.sectionTitle}>{sec.label} {t("finance.reports.cfActivitiesSuf")}</h3>
          <table className={styles.table}><tbody>
            <tr><td className={styles.cellName}>{t("finance.reports.cfInflow")}</td><td className={styles.cellAmount}>{money(sec.s?.inflow || 0)}</td></tr>
            <tr><td className={styles.cellName}>{t("finance.reports.cfOutflow")}</td><td className={styles.cellAmount}>{money(sec.s?.outflow || 0)}</td></tr>
            <tr className={styles.totalRow}><td>{t("finance.reports.cfNetPre")} {sec.label}</td><td>{money(sec.s?.net || 0)}</td></tr>
          </tbody></table>
        </div>
      ))}

      <div className={styles.tableWrap}>
        <h3 className={styles.sectionTitle}>{t("finance.reports.cfBreakdown")}</h3>
        <table className={styles.table}><tbody>
          {data.operating?.breakdown?.map((b: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{b.category}</td><td className={styles.cellAmount}>{money(b.amount)}</td></tr>
          ))}
        </tbody></table>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("finance.reports.cfNetChange")}</span>
          <span className={`${styles.summaryValue} ${(data.netCashChange || 0) >= 0 ? styles.profitText : styles.lossText}`}>{money(data.netCashChange)}</span>
        </div>
      </div>
    </div>
  );
}

function ExpenseCategory({ data }: { data: ReportData }) {
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  const grandTotal = data.grandTotal || 0;
  return (
    <div className={styles.report}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}><span className={styles.summaryLabel}>{t("finance.reports.ecGrandTotal")}</span><span className={styles.summaryValue}>{money(grandTotal)}</span></div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr><th>{t("finance.reports.ecCategory")}</th><th>{t("finance.reports.ecCount")}</th><th>{t("finance.reports.ecTotal")}</th><th>%</th></tr></thead><tbody>
          {data.breakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{r.category}</td><td>{r.count}</td><td className={styles.cellAmount}>{money(r.total)}</td><td>{grandTotal > 0 ? formatNumber((r.total / grandTotal) * 100, lang, 1) : "0"}%</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

function RevenueGroup({ data, titleKey }: { data: ReportData; titleKey: string }) {
  const { lang, t } = useLanguage();
  const money = (n: number) => formatCurrency(n, lang);
  void titleKey;
  return (
    <div className={styles.report}>
      <div className={styles.tableWrap}>
        <table className={styles.table}><thead><tr><th>{data.groupBy === "bus" ? t("finance.reports.rgBus") : t("finance.reports.rgRoute")}</th><th>{t("finance.reports.rgTrips")}</th><th>{t("finance.reports.rgTotalRevenue")}</th></tr></thead><tbody>
          {data.breakdown?.map((r: any, i: number) => (
            <tr key={i}><td className={styles.cellName}>{r.label}</td><td>{r.tripCount}</td><td className={styles.cellAmount}>{money(r.totalRevenue)}</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
