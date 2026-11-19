import { describe, it, expect } from "vitest";
import { emptyLeg, computeLegs, mergeAutoLegs, sortLegs, shiftDateTime } from "../tripLegs";

const flights = [
  { _key: "f-arrival", flightNo: "SV101", airline: "Saudia", from: "DEL", to: "Jeddah", date: "2026-12-01", time: "09:00", flightType: "arrival" },
];

const hotels = [
  { _key: "h-makkah", city: "Makkah", hotel: "Hilton Makkah", from: "2026-12-01", to: "2026-12-04" },
];

describe("trip leg helpers", () => {
  it("builds auto legs from flights and hotels", () => {
    const legs = computeLegs(flights, hotels);
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ origin: "Jeddah", destination: "Makkah", legDate: "2026-12-01", source: "flight" });
    expect(legs[1]).toMatchObject({ origin: "Makkah", destination: "Makkah ZIYARAH", legDate: "2026-12-02", departureTime: "07:00", source: "hotel" });
    expect(legs.every((l) => !!l.autoKey)).toBe(true);
  });

  it("keeps manually added legs when auto legs are recomputed", () => {
    const manual = { ...emptyLeg(), origin: "Makkah", destination: "Madinah", legDate: "2026-12-05", departureTime: "08:30" };
    const merged = mergeAutoLegs([manual], flights, hotels);
    expect(merged).toHaveLength(3);
    expect(merged.filter((l) => l.source === "manual")).toHaveLength(1);
    expect(merged[2]).toMatchObject({ origin: "Makkah", destination: "Madinah", legDate: "2026-12-05" });
  });

  it("drops empty manual rows so they do not pile up", () => {
    const merged = mergeAutoLegs([emptyLeg()], flights, hotels);
    expect(merged).toHaveLength(2);
    expect(merged.some((l) => !l.origin && !l.destination && !l.legDate)).toBe(false);
  });

  it("does not duplicate an auto leg after the user edits it", () => {
    const auto = computeLegs(flights, hotels);
    const edited = { ...auto[0], departureTime: "10:15", source: "manual" as const };
    const merged = mergeAutoLegs([edited, auto[1]], flights, hotels);
    expect(merged).toHaveLength(2);
    expect(merged.find((l) => l.origin === "Jeddah")?.departureTime).toBe("10:15");
  });

  it("sorts legs chronologically by date then time", () => {
    const sorted = sortLegs([
      { ...emptyLeg(), origin: "A", destination: "B", legDate: "2026-12-02", departureTime: "07:00" },
      { ...emptyLeg(), origin: "C", destination: "D", legDate: "2026-12-01", departureTime: "18:00" },
      { ...emptyLeg(), origin: "E", destination: "F", legDate: "2026-12-01", departureTime: "08:00" },
    ]);
    expect(sorted.map((l) => `${l.legDate} ${l.departureTime}`)).toEqual([
      "2026-12-01 08:00",
      "2026-12-01 18:00",
      "2026-12-02 07:00",
    ]);
  });

  it("shifts a date + time backwards across midnight, including month ends", () => {
    expect(shiftDateTime("2026-12-05", "01:30", -180)).toEqual({ date: "2026-12-04", time: "22:30" });
    expect(shiftDateTime("2026-12-01", "00:15", -180)).toEqual({ date: "2026-11-30", time: "21:15" });
    expect(shiftDateTime("2026-01-01", "02:00", -180)).toEqual({ date: "2025-12-31", time: "23:00" });
    expect(shiftDateTime("2026-12-05", "12:00", -180)).toEqual({ date: "2026-12-05", time: "09:00" });
    expect(shiftDateTime("2026-12-05", "", -180)).toEqual({ date: "2026-12-05", time: "" });
  });

  it("puts a departure pickup on the previous day when the flight is after midnight", () => {
    const legs = computeLegs(
      [{ flightNo: "SV900", from: "Jeddah", date: "2026-12-05", time: "01:30", flightType: "departure" }],
      hotels
    );
    const pickup = legs.find((l) => l.source === "flight");
    expect(pickup).toMatchObject({ legDate: "2026-12-04", departureTime: "22:30" });
  });

  it("replaces an edited auto leg when its flight date changes, instead of duplicating it", () => {
    const auto = computeLegs(flights, hotels);
    const edited = { ...auto[0], departureTime: "10:15", source: "manual" as const };
    const moved = mergeAutoLegs([edited], [{ ...flights[0], date: "2026-12-02" }], hotels);

    const arrivals = moved.filter((l) => l.origin === "Jeddah");
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]).toMatchObject({ legDate: "2026-12-02", departureTime: "09:00" });
  });

  it("keeps an edited leg when only the flight number changes, since the route is unchanged", () => {
    const auto = computeLegs(flights, hotels);
    const edited = { ...auto[0], departureTime: "10:15", source: "manual" as const };
    const merged = mergeAutoLegs([edited], [{ ...flights[0], flightNo: "SV999" }], hotels);

    const arrivals = merged.filter((l) => l.origin === "Jeddah");
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].departureTime).toBe("10:15");
  });

  it("replaces an edited hotel leg when the hotel stay dates change", () => {
    const auto = computeLegs(flights, hotels);
    const ziyarah = auto.find((l) => l.destination.includes("ZIYARAH"))!;
    const edited = { ...ziyarah, departureTime: "08:30", source: "manual" as const };
    const merged = mergeAutoLegs([edited], flights, [{ ...hotels[0], from: "2026-12-02" }]);

    const ziyarahLegs = merged.filter((l) => l.destination.includes("ZIYARAH"));
    expect(ziyarahLegs).toHaveLength(1);
    expect(ziyarahLegs[0]).toMatchObject({ legDate: "2026-12-03", departureTime: "07:00" });
  });

  it("drops an edited derived leg when its flight row is deleted", () => {
    const auto = computeLegs(flights, hotels);
    const edited = { ...auto[0], departureTime: "10:15", source: "manual" as const };
    const merged = mergeAutoLegs([edited], [], hotels);

    expect(merged.some((l) => l.origin === "Jeddah")).toBe(false);
    expect(merged.every((l) => l.source === "hotel")).toBe(true);
  });

  it("keeps a manually added leg even when all source rows are removed", () => {
    const manual = { ...emptyLeg(), origin: "Makkah", destination: "Madinah", legDate: "2026-12-05" };
    expect(mergeAutoLegs([manual], [], [])).toHaveLength(1);
  });

  it("gives identical flight rows distinct source ids when they have row keys", () => {
    const legs = computeLegs(
      [{ ...flights[0], _key: "f1" }, { ...flights[0], _key: "f2" }],
      hotels
    );
    const arrivals = legs.filter((l) => l.origin === "Jeddah");
    expect(arrivals).toHaveLength(2);
    expect(new Set(arrivals.map((l) => l.srcId)).size).toBe(2);
  });
});
