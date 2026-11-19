import { createTripSchema, updateTripSchema } from "../validators/operations";

const LEG = {
  origin: "Jeddah",
  destination: "Makkah",
  legDate: "2026-11-20",
};

describe("updateTripSchema", () => {
  it("accepts null vehicleCount and sellingPrice so an edit can clear them", () => {
    const result = updateTripSchema.safeParse({
      vehicleCount: null,
      sellingPrice: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicleCount).toBeNull();
      expect(result.data.sellingPrice).toBeNull();
    }
  });

  it("still rejects an out-of-range vehicleCount", () => {
    expect(updateTripSchema.safeParse({ vehicleCount: 0 }).success).toBe(false);
    expect(updateTripSchema.safeParse({ vehicleCount: 500 }).success).toBe(false);
  });

  it("allows a partial update without legs when the trip is not round", () => {
    expect(updateTripSchema.safeParse({ notes: "updated" }).success).toBe(true);
  });

  it("requires at least 2 legs when tripType is round", () => {
    expect(updateTripSchema.safeParse({ tripType: "round" }).success).toBe(false);
    expect(updateTripSchema.safeParse({ tripType: "round", legs: [LEG] }).success).toBe(false);
    expect(
      updateTripSchema.safeParse({
        tripType: "round",
        legs: [LEG, { ...LEG, origin: "Makkah", destination: "Jeddah" }],
      }).success
    ).toBe(true);
  });
});

describe("createTripSchema", () => {
  it("accepts a trip with only the required fields", () => {
    expect(
      createTripSchema.safeParse({
        scheduledDate: "2026-11-20",
        scheduledStartTime: "08:00",
        legs: [LEG],
      }).success
    ).toBe(true);
  });
});
