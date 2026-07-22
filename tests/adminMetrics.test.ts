import { describe, it, expect } from "vitest";
import { parseFareMidpoint, estimateTripSavings, estimateTotalMoneySaved } from "@/lib/adminMetrics";

describe("parseFareMidpoint", () => {
  it("parses a range string to its midpoint", () => {
    expect(parseFareMidpoint("₹200–300")).toBe(250);
  });

  it("parses a single-number string as itself", () => {
    expect(parseFareMidpoint("₹250")).toBe(250);
  });

  it("returns null for TBD or missing values", () => {
    expect(parseFareMidpoint("TBD")).toBeNull();
    expect(parseFareMidpoint(undefined)).toBeNull();
  });
});

describe("estimateTripSavings", () => {
  const base = {
    pickupLocation: "Jubilee Circle", // reference fare ₹200–300, midpoint 250
    expectedFare: 300,
    totalCapacity: 4,
    seatsRemaining: 1, // 3 current travelers
    status: "open",
  };

  it("computes savings for a trip with multiple travelers on a known route", () => {
    // 3 travelers: 2 "avoided a solo fare" of 250 each, actually paid 100 each.
    // savings = 2 * (250 - 100) = 300
    expect(estimateTripSavings(base)).toBe(300);
  });

  it("returns 0 when only the host has joined (no one shared a ride yet)", () => {
    expect(estimateTripSavings({ ...base, totalCapacity: 4, seatsRemaining: 3 })).toBe(0);
  });

  it("returns 0 for a cancelled trip", () => {
    expect(estimateTripSavings({ ...base, status: "cancelled" })).toBe(0);
  });

  it("returns 0 for a route with no parseable reference fare (TBD)", () => {
    expect(estimateTripSavings({ ...base, pickupLocation: "Belagavi Airport" })).toBe(0);
  });

  it("never returns a negative number", () => {
    // Absurdly high fare relative to the reference — share exceeds the reference midpoint.
    expect(estimateTripSavings({ ...base, expectedFare: 10000 })).toBe(0);
  });
});

describe("estimateTotalMoneySaved", () => {
  it("sums savings across trips, skipping ineligible ones", () => {
    const trips = [
      { pickupLocation: "Jubilee Circle", expectedFare: 300, totalCapacity: 4, seatsRemaining: 1, status: "open" }, // 300
      { pickupLocation: "Belagavi Airport", expectedFare: 300, totalCapacity: 4, seatsRemaining: 1, status: "open" }, // 0 (TBD)
      { pickupLocation: "Jubilee Circle", expectedFare: 300, totalCapacity: 4, seatsRemaining: 3, status: "open" }, // 0 (solo)
    ];
    expect(estimateTotalMoneySaved(trips)).toBe(300);
  });
});
