/**
 * SEUM Batch A dictionaries — Trips list page (dashboard/trips).
 * Owned by the Batch-A worker. Keys are namespaced:
 *   trips.list.* — dashboard/trips/page (list, filters, table, pagination)
 *
 * English values are BYTE-IDENTICAL to the previous hardcoded strings
 * (vitest asserts rendered English). Arabic is Modern Standard Arabic,
 * Saudi business usage, reusing the fixed glossary:
 *   Trip=رحلة، Trips=الرحلات، Status=الحالة، Scheduled=مجدولة،
 *   En Route=في الطريق، Completed=مكتملة، Cancelled=ملغاة،
 *   Delayed=متأخرة، Driver=سائق، Bus=حافلة.
 * Never translated here: codes, plate numbers, IDs, driver/route names,
 * status codes from the API, or brand SEUM.
 *
 * Registered into the live dictionaries from `lib/i18n/index.ts` (NOT from
 * dictionaries.ts — another worker owns that merge). This module itself is
 * pure data: no side effects, so a future merge that imports it from
 * dictionaries.ts stays cycle-safe.
 */

export const batchAEn: Record<string, string> = {
  // ─── Trips list (dashboard/trips/page) ───
  "trips.list.title": "Trips",
  "trips.list.desc": "Manage scheduled trips and operations",
  "trips.list.calendar": "Calendar",
  "trips.list.newTrip": "New Trip",
  "trips.list.searchPh": "Search trips...",
  "trips.list.allStatus": "All Status",
  "trips.list.scheduled": "Scheduled",
  "trips.list.enRoute": "En Route",
  "trips.list.completed": "Completed",
  "trips.list.delayed": "Delayed",
  "trips.list.cancelled": "Cancelled",
  "trips.list.allTypes": "All Types",
  "trips.list.singleTrip": "Single Trip",
  "trips.list.roundTrip": "Round Trip",
  "trips.list.colRoute": "Route",
  "trips.list.colBus": "Bus",
  "trips.list.colDriver": "Driver",
  "trips.list.colDate": "Date",
  "trips.list.colTime": "Time",
  "trips.list.colType": "Type",
  "trips.list.colStatus": "Status",
  "trips.list.empty": "No trips found",
  "trips.list.roundShort": "Round",
  "trips.list.legs": "legs",
  "trips.list.singleShort": "Single",
  "trips.list.prev": "Previous",
  "trips.list.page": "Page",
  "trips.list.of": "of",
  "trips.list.next": "Next",
};

export const batchAAr: Record<string, string> = {
  // ─── قائمة الرحلات ───
  "trips.list.title": "الرحلات",
  "trips.list.desc": "إدارة الرحلات المجدولة والعمليات",
  "trips.list.calendar": "التقويم",
  "trips.list.newTrip": "رحلة جديدة",
  "trips.list.searchPh": "ابحث عن الرحلات…",
  "trips.list.allStatus": "كل الحالات",
  "trips.list.scheduled": "مجدولة",
  "trips.list.enRoute": "في الطريق",
  "trips.list.completed": "مكتملة",
  "trips.list.delayed": "متأخرة",
  "trips.list.cancelled": "ملغاة",
  "trips.list.allTypes": "كل الأنواع",
  "trips.list.singleTrip": "رحلة مفردة",
  "trips.list.roundTrip": "رحلة ذهاب وعودة",
  "trips.list.colRoute": "المسار",
  "trips.list.colBus": "الحافلة",
  "trips.list.colDriver": "السائق",
  "trips.list.colDate": "التاريخ",
  "trips.list.colTime": "الوقت",
  "trips.list.colType": "النوع",
  "trips.list.colStatus": "الحالة",
  "trips.list.empty": "لا توجد رحلات",
  "trips.list.roundShort": "ذهاب وعودة",
  "trips.list.legs": "مقاطع",
  "trips.list.singleShort": "مفردة",
  "trips.list.prev": "السابق",
  "trips.list.page": "صفحة",
  "trips.list.of": "من",
  "trips.list.next": "التالي",
};
