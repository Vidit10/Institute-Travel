import { REFERENCE_FARES } from "@/lib/constants";

// REFERENCE_FARES values are display strings like "₹200–300" or "TBD" (see
// docs/SPEC.md section 9) — never meant for computation. Parsed defensively:
// any shape that doesn't clearly resolve to two numbers is treated as
// unknown rather than guessed at.
export function parseFareMidpoint(fareStr: string | undefined): number | null {
  if (!fareStr) return null;
  const numbers = fareStr.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export type TripForSavings = {
  pickupLocation: string;
  expectedFare: number;
  totalCapacity: number;
  seatsRemaining: number;
  status: string;
};

// Estimated savings for one trip: everyone but the host is assumed to have
// otherwise paid the full reference fare alone; instead they paid an equal
// share of the actual fare. Cancelled trips and trips with only the host
// (no one actually shared a ride) contribute nothing. Routes with no
// parseable reference fare ("TBD") are excluded rather than assumed.
export function estimateTripSavings(trip: TripForSavings): number {
  if (trip.status === "cancelled") return 0;

  const currentTravelers = trip.totalCapacity - trip.seatsRemaining;
  if (currentTravelers < 2) return 0;

  const referenceMidpoint = parseFareMidpoint(REFERENCE_FARES[trip.pickupLocation]);
  if (referenceMidpoint === null) return 0;

  const ridersWhoAvoidedSoloFare = currentTravelers - 1;
  const perPersonShare = trip.expectedFare / currentTravelers;
  const savings = ridersWhoAvoidedSoloFare * (referenceMidpoint - perPersonShare);

  return Math.max(0, savings);
}

export function estimateTotalMoneySaved(trips: TripForSavings[]): number {
  return trips.reduce((total, trip) => total + estimateTripSavings(trip), 0);
}
