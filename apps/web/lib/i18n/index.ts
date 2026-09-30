export type { Lang } from "./dictionaries";
export {
  LANG_STORAGE_KEY,
  dictionaries,
  translate,
  navSectionLabel,
  navItemLabel,
  localizedRoleLabel,
} from "./dictionaries";
export { LanguageProvider, useLanguage } from "./LanguageContext";
export { localeOf, formatDate, formatDateTime, formatNumber, formatCurrency } from "./format";

// ─── Batch dictionaries (Batch A: trips list, Batch B: fleet / maintenance / drivers, + later batches).
// Registered here — NOT in dictionaries.ts (another worker owns that merge) —
// so pages under test resolve their English strings before the central merge
// lands. Idempotent: the merge can spread the same records into
// dictionaries.ts without conflict.
import { dictionaries } from "./dictionaries";
import { batchAEn, batchAAr } from "./dict.batchA";
import { batchBEn, batchBAr } from "./dict.batchB";
import { batchDEn, batchDAr } from "./dict.batchD";
export { batchAEn, batchAAr } from "./dict.batchA";
export { batchBEn, batchBAr } from "./dict.batchB";
export { batchDEn, batchDAr } from "./dict.batchD";
Object.assign(dictionaries.en, batchAEn);
Object.assign(dictionaries.ar, batchAAr);
Object.assign(dictionaries.en, batchBEn);
Object.assign(dictionaries.ar, batchBAr);
Object.assign(dictionaries.en, batchDEn);
Object.assign(dictionaries.ar, batchDAr);
import { routesEn, routesAr } from "./dict.routes";
export { routesEn, routesAr } from "./dict.routes";
Object.assign(dictionaries.en, routesEn);
Object.assign(dictionaries.ar, routesAr);
import { recurringEn, recurringAr } from "./dict.recurring";
export { recurringEn, recurringAr } from "./dict.recurring";
Object.assign(dictionaries.en, recurringEn);
Object.assign(dictionaries.ar, recurringAr);
import { tripsEn, tripsAr } from "./dict.trips";
export { tripsEn, tripsAr } from "./dict.trips";
Object.assign(dictionaries.en, tripsEn);
Object.assign(dictionaries.ar, tripsAr);
import { opsEn, opsAr } from "./dict.ops";
export { opsEn, opsAr } from "./dict.ops";
Object.assign(dictionaries.en, opsEn);
Object.assign(dictionaries.ar, opsAr);
import { companiesEn, companiesAr } from "./dict.companies";
export { companiesEn, companiesAr } from "./dict.companies";
Object.assign(dictionaries.en, companiesEn);
Object.assign(dictionaries.ar, companiesAr);
import { financeEn, financeAr } from "./dict.finance";
export { financeEn, financeAr } from "./dict.finance";
Object.assign(dictionaries.en, financeEn);
Object.assign(dictionaries.ar, financeAr);
import { driversEn, driversAr, maintenanceEn, maintenanceAr } from "./dict.drivers";
export { driversEn, driversAr, maintenanceEn, maintenanceAr } from "./dict.drivers";
Object.assign(dictionaries.en, driversEn);
Object.assign(dictionaries.ar, driversAr);
Object.assign(dictionaries.en, maintenanceEn);
Object.assign(dictionaries.ar, maintenanceAr);
import { hrEn, hrAr } from "./dict.hr";
export { hrEn, hrAr } from "./dict.hr";
Object.assign(dictionaries.en, hrEn);
Object.assign(dictionaries.ar, hrAr);
import { bookingsEn, bookingsAr, customersEn, customersAr } from "./dict.bookings";
export { bookingsEn, bookingsAr, customersEn, customersAr } from "./dict.bookings";
Object.assign(dictionaries.en, bookingsEn);
Object.assign(dictionaries.ar, bookingsAr);
Object.assign(dictionaries.en, customersEn);
Object.assign(dictionaries.ar, customersAr);
import { adminEn, adminAr, homeEn, homeAr, authEn, authAr } from "./dict.admin";
export { adminEn, adminAr, homeEn, homeAr, authEn, authAr } from "./dict.admin";
Object.assign(dictionaries.en, adminEn);
Object.assign(dictionaries.ar, adminAr);
Object.assign(dictionaries.en, homeEn);
Object.assign(dictionaries.ar, homeAr);
Object.assign(dictionaries.en, authEn);
Object.assign(dictionaries.ar, authAr);
import { bookingsImportEn, bookingsImportAr, miscEn, miscAr } from "./dict.misc";
export { bookingsImportEn, bookingsImportAr, miscEn, miscAr } from "./dict.misc";
Object.assign(dictionaries.en, bookingsImportEn);
Object.assign(dictionaries.ar, bookingsImportAr);
Object.assign(dictionaries.en, miscEn);
Object.assign(dictionaries.ar, miscAr);
