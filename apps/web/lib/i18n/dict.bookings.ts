/**
 * SEUM Bookings + Customers gap dictionaries — dashboard/bookings/* and
 * dashboard/customers/* pages.
 *
 * Owned by the Bookings-i18n worker. The bulk of the bookings and customers
 * keys live in dict.batchD.ts (already registered in lib/i18n/index.ts);
 * this module holds ONLY the four gap keys that exist nowhere else, so there
 * are no duplicate keys. English values are BYTE-IDENTICAL to the previous
 * hardcoded strings. Arabic is Modern Standard Arabic, Saudi business usage,
 * reusing the fixed glossary (Booking=حجز، Refund=استرداد). Codes, placeholders
 * with Latin digits ("0.00") and invoice references stay untranslated.
 * `customersEn` / `customersAr` are empty: every customers.* string the pages
 * need already exists in dict.batchD.ts — the empty exports keep the
 * four-export contract (bookingsEn/bookingsAr/customersEn/customersAr).
 *
 * Registered into the live dictionaries from `lib/i18n/index.ts` (NOT from
 * dictionaries.ts — another worker owns that merge). Pure data: no side
 * effects, so a future merge stays cycle-safe.
 */

export const bookingsEn: Record<string, string> = {
  // Payment filter option (dashboard/bookings/page) — the only list key
  // missing from dict.batchD.ts.
  "bookings.list.payRefunded": "Refunded",
  // Amount input placeholders (dashboard/bookings/new/page).
  "bookings.new.amountPh": "0.00",
  // Supervisor review placeholders (dashboard/bookings/[id]/page).
  "bookings.detail.pricePh": "0.00",
  "bookings.detail.invoicePh": "INV-2026-XXXX",
};

export const bookingsAr: Record<string, string> = {
  "bookings.list.payRefunded": "مسترد",
  "bookings.new.amountPh": "0.00",
  "bookings.detail.pricePh": "0.00",
  "bookings.detail.invoicePh": "INV-2026-XXXX",
};

export const customersEn: Record<string, string> = {};

export const customersAr: Record<string, string> = {};
