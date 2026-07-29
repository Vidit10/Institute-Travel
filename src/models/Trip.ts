import { Schema, model, models, type InferSchemaType } from "mongoose";
import {
  TRIP_MODES,
  TRIP_STATUSES,
  VEHICLE_TYPES,
  DIRECTIONS,
  LISTING_TYPES,
  TRAVEL_TYPES,
  DEFAULT_DESTINATION,
} from "@/lib/constants";

const tripSchema = new Schema(
  {
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    mode: { type: String, enum: TRIP_MODES, required: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    // Start/end point of the ride. No longer a fixed Mongoose enum — the valid value
    // set depends on `direction`/`listingType` (four combinations, see docs/SPEC.md),
    // enforced in the API layer (zod) instead. Loosening this (rather than renaming)
    // keeps every pre-existing document valid untouched: old rows already hold a
    // valid city-location string in pickupLocation and "IIT Dharwad Hostels" in
    // destination, which remain valid under the new, wider string type.
    pickupLocation: { type: String, required: true },
    // Defaults to the original fixed value so any caller that doesn't set it
    // explicitly (including pre-existing test/API code paths) keeps V1's exact
    // behavior — the API layer still always sets it explicitly for real writes.
    destination: { type: String, required: true, default: DEFAULT_DESTINATION },

    // Which way the ride goes. Old documents (pre-dating this field) default to
    // "to-campus" on read — exactly their original, only meaning — so nothing about
    // the existing arrival flow changes for them.
    direction: { type: String, enum: DIRECTIONS, default: "to-campus" },
    // Long-distance = the original semester-start flow (PICKUP_LOCATIONS <-> Hostels).
    // Local = everyday campus<->city hops (CAMPUS_LOCATIONS <-> CITY_LOCATIONS).
    listingType: { type: String, enum: LISTING_TYPES, default: "long-distance" },
    // Informational only — sets rider expectations, never enforced/matched against.
    travelType: { type: String, enum: TRAVEL_TYPES, default: "leisure" },

    departureTime: { type: Date, required: true }, // self-reported ETA at pickup location

    // Optional, used for live tracking lookups (docs/SPEC.md section 7).
    trainNumber: { type: String, required: false },
    flightNumber: { type: String, required: false },
    lastKnownLiveStatus: { type: String, required: false }, // cached result, best-effort

    totalCapacity: { type: Number, required: true, min: 1 },
    seatsRemaining: { type: Number, required: true, min: 0 },

    // Size of the host's own party (host + any companions travelling with them),
    // occupying seats from the moment the trip is created — not something a rider
    // requests. See docs: "should not manually enter total capacity minus one."
    numTravelers: { type: Number, required: true, min: 1 },

    girlsOnly: { type: Boolean, default: false },

    // Host-entered total fare for the whole vehicle — the actual number, not a
    // reference estimate. Per-person share is (expectedFare / current travelers),
    // computed from totalCapacity - seatsRemaining, not stored separately.
    expectedFare: { type: Number, required: true, min: 0 },

    status: { type: String, enum: TRIP_STATUSES, default: "open" },
  },
  { timestamps: true }
);

export type TripDoc = InferSchemaType<typeof tripSchema>;

export const Trip = models.Trip || model("Trip", tripSchema);
