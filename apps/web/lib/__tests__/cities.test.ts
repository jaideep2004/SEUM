import { describe, expect, it } from "vitest";
import { CITIES, cityLabel, findCity } from "../cities";

/**
 * Client request: flight city dropdowns must show the city plus its airport
 * (name + IATA) so operators can tell which airport a route uses. Makkah and
 * Al Kharj intentionally have no airport data and fall back to "City (Country)".
 */
describe("cityLabel", () => {
  it("renders City — Airport Name (IATA) in English when airport data exists", () => {
    const riyadh = findCity("Riyadh")!;
    expect(cityLabel(riyadh, "en")).toBe("Riyadh — King Khalid International Airport (RUH)");
  });

  it("renders the Arabic city and airport names when lang is ar", () => {
    const jeddah = findCity("Jeddah")!;
    expect(cityLabel(jeddah, "ar")).toBe("جدة — مطار الملك عبدالعزيز الدولي (JED)");
  });

  it("falls back to City (Country) when no airport is known", () => {
    const makkah = findCity("Makkah")!;
    expect(cityLabel(makkah, "en")).toBe("Makkah (Saudi Arabia)");
    expect(cityLabel(makkah, "ar")).toBe("مكة المكرمة (Makkah)");
  });

  it("uses the correct IATA code for major Saudi cities", () => {
    expect(cityLabel(findCity("Madinah")!, "en")).toContain("(MED)");
    expect(cityLabel(findCity("Dammam")!, "en")).toContain("(DMM)");
  });

  it("gives every city an airport label or a country fallback", () => {
    for (const c of CITIES) {
      const label = cityLabel(c, "en");
      expect(label).toMatch(/\([^)]+\)$/);
      if (!c.airportEn) expect(label).toBe(`${c.en} (${c.countryEn})`);
    }
  });
});
