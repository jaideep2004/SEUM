/**
 * SEUM admin/home/auth gap dictionaries — Batch-W (admin pages conversion).
 *
 * Only keys NOT already defined elsewhere live here:
 * - batchD (dict.batchD.ts) already covers admin.users.*, admin.notifications.*,
 *   admin.notifPrefs.*, admin.comm.*, admin.audit.*, admin.stub.*, admin.companyReports.*,
 *   admin.companySettings.*, home.company.*, home.platform.*, auth.login.*,
 *   auth.forgot.*, auth.reset.* — pages reuse those keys, they are NOT duplicated here.
 * - dictionaries.ts already covers auth.signIn, auth.password, auth.signInSubtitle.
 *
 * The orchestrator merges these six exports into dictionaries.ts / index.ts.
 * English values are BYTE-IDENTICAL to the previous hardcoded strings.
 * Arabic is Modern Standard Arabic, Saudi business usage.
 */
export const adminEn: Record<string, string> = {
  "admin.users.loading": "Loading users...",
};

export const adminAr: Record<string, string> = {
  "admin.users.loading": "جارٍ تحميل المستخدمين...",
};

export const homeEn: Record<string, string> = {
  "home.company.noDriverScores": "No driver scores yet",
};

export const homeAr: Record<string, string> = {
  "home.company.noDriverScores": "لا توجد تقييمات للسائقين بعد",
};

export const authEn: Record<string, string> = {
  "auth.login.brandSub": "SMART TRANSPORTATION ERP",
};

export const authAr: Record<string, string> = {
  "auth.login.brandSub": "نظام ذكي لإدارة النقل",
};
