import { CITIES } from "@/lib/cities";

export interface TripLegDraft {
  origin: string;
  destination: string;
  legDate: string;
  departureTime: string;
  overnight?: boolean;
  routeType?: string;
  source?: "flight" | "hotel" | "manual";
  hotel?: string;
  autoKey?: string;
  /** Stable identity of the flight/hotel row that produced this leg. */
  srcId?: string;
  /** Core generated content (origin|destination|date) when the leg was last generated. */
  autoSig?: string;
}

/** Stable key for a flight/hotel row, so legs can follow the row even after its fields change. */
export function newRowKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyLeg(): TripLegDraft {
  return { origin: "", destination: "", legDate: "", departureTime: "", overnight: false, routeType: "", source: "manual" };
}

function shiftDate(d: string, days: number) {
  if (!d) return "";
  const [y, mo, da] = d.split("-").map(Number);
  if (!y || !mo || !da) return d;
  const x = new Date(Date.UTC(y, mo - 1, da));
  x.setUTCDate(x.getUTCDate() + days);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

/** Shift a date + HH:mm by N minutes, rolling the date when it crosses midnight. */
export function shiftDateTime(date: string, time: string, minutes: number) {
  if (!time) return { date, time: "" };
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return { date, time };
  let total = h * 60 + m + minutes;
  let dayShift = 0;
  while (total < 0) { total += 1440; dayShift -= 1; }
  while (total >= 1440) { total -= 1440; dayShift += 1; }
  return {
    date: dayShift ? shiftDate(date, dayShift) : date,
    time: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
  };
}

function add1day(d: string) {
  return shiftDate(d, 1);
}

function iataOf(city: string) {
  if (!city) return "";
  const c = CITIES.find((x) => x.en === city);
  return c?.iata || city;
}

function legKey(prefix: string, ...parts: any[]) {
  return `${prefix}|${parts.map((p) => String(p ?? "")).join("|")}`;
}

export function sortLegs(legs: TripLegDraft[]) {
  return [...legs].sort((a: any, b: any) => {
    const da = (a.legDate || "").localeCompare(b.legDate || "");
    if (da !== 0) return da;
    return (a.departureTime || "").localeCompare(b.departureTime || "");
  });
}

/** Auto-populate trip legs from flights + hotels (client rule):
 *  - arrival flight : arrival city → first hotel city, at flight time
 *  - departure flight: last hotel city → departure airport, 3 hrs before flight
 *  - hotel          : city → "CITY ZIYARAH" next morning 07:00, then checkout transfer to next hotel city
 * Every auto leg carries a stable srcId (its source flight/hotel row) plus autoSig (the
 * generated core content), so edits can be tracked and replaced when the source changes.
 */
export function computeLegs(flights: any[], hotels: any[]): TripLegDraft[] {
  const legs: TripLegDraft[] = [];
  const stamp = (leg: TripLegDraft, srcId: string): TripLegDraft => ({
    ...leg, srcId, autoSig: legKey("leg", leg.origin, leg.destination, leg.legDate),
  });
  const fl = (flights || []).filter((x: any) => x.flightNo || x.airline || x.from || x.to).sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
  const ho = (hotels || []).filter((x: any) => x.city || x.hotel).sort((a: any, b: any) => (a.from || "").localeCompare(b.from || ""));
  const firstCity = ho[0]?.city || "";
  const lastCity = ho[ho.length - 1]?.city || "";
  for (const f of fl) {
    const srcId = `flight:${f._key || legKey("flight", f.flightNo, f.date, f.from, f.to)}`;
    const autoKey = legKey("flight", f.flightType, f.flightNo, f.date, f.from, f.to);
    if (f.flightType === "arrival") {
      legs.push(stamp({ origin: f.to, destination: firstCity, legDate: f.date, departureTime: f.time, source: "flight", hotel: "", autoKey }, srcId));
    } else if (f.flightType === "departure") {
      const departure = shiftDateTime(f.date, f.time, -180);
      legs.push(stamp({ origin: lastCity, destination: iataOf(f.from), legDate: departure.date, departureTime: departure.time, source: "flight", hotel: "", autoKey }, srcId));
    } else {
      legs.push(stamp({ origin: f.from, destination: f.to, legDate: f.date, departureTime: f.time, source: "flight", hotel: "", autoKey }, srcId));
    }
  }
  for (let i = 0; i < ho.length; i++) {
    const h = ho[i]; const nxt = ho[i + 1];
    const baseId = `hotel:${h._key || legKey("hotel", h.city, h.hotel, h.from, h.to)}`;
    legs.push(stamp({ origin: h.city, destination: `${h.city} ZIYARAH`, legDate: add1day(h.from), departureTime: "07:00", source: "hotel", hotel: h.hotel || "", autoKey: legKey("hotel", h.city, h.hotel, h.from, "ziyarah") }, `${baseId}:ziyarah`));
    if (nxt) legs.push(stamp({ origin: h.city, destination: iataOf(nxt.city), legDate: h.to, departureTime: "10:00", source: "hotel", hotel: h.hotel || "", autoKey: legKey("hotel", h.city, h.hotel, h.to, nxt.city) }, `${baseId}:checkout`));
  }
  return sortLegs(legs);
}

/** Recompute auto legs on flight/hotel changes while keeping manual legs.
 *  - Manual rows the user added (no srcId) always stay.
 *  - An edited auto leg keeps its srcId/autoSig. If its source is unchanged it wins over
 *    the regenerated copy; if the source changed materially (route/date) the fresh leg
 *    replaces it; if the source row was deleted, the derived leg goes with it.
 */
export function mergeAutoLegs(currentLegs: TripLegDraft[], flights: any[], hotels: any[]): TripLegDraft[] {
  const auto = computeLegs(flights || [], hotels || []);
  const manual = (currentLegs || []).filter((l) => l.source === "manual" && (l.origin || l.destination || l.legDate));

  const autoBySrc = new Map<string, TripLegDraft>();
  for (const leg of auto) if (leg.srcId) autoBySrc.set(leg.srcId, leg);

  const kept: TripLegDraft[] = [];
  const suppressedSrc = new Set<string>();
  const suppressedKeys = new Set<string>();

  for (const leg of manual) {
    if (!leg.srcId) {
      // Manually added row, or a draft from before source tracking: always keep.
      kept.push(leg);
      if (leg.autoKey) suppressedKeys.add(leg.autoKey);
      continue;
    }
    const fresh = autoBySrc.get(leg.srcId);
    if (!fresh) continue; // source row deleted → drop the derived leg
    if (fresh.autoSig === leg.autoSig) {
      // Source unchanged → keep the user's edits (refresh label-only fields).
      kept.push({ ...leg, hotel: fresh.hotel || leg.hotel });
      suppressedSrc.add(leg.srcId);
    }
    // Source changed → the fresh auto leg replaces the stale edited one.
  }

  const filteredAuto = auto.filter((l) => {
    if (l.srcId && suppressedSrc.has(l.srcId)) return false;
    if (l.autoKey && suppressedKeys.has(l.autoKey)) return false;
    return true;
  });

  return sortLegs([...filteredAuto, ...kept]);
}
