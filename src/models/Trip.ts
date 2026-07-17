import { Schema, model, models, type InferSchemaType } from "mongoose";
import {
  PICKUP_LOCATIONS,
  DESTINATIONS,
  DEFAULT_DESTINATION,
  TRIP_MODES,
  TRIP_STATUSES,
  VEHICLE_TYPES,
} from "@/lib/constants";

const tripSchema = new Schema(
  {
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    mode: { type: String, enum: TRIP_MODES, required: true },
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    pickupLocation: { type: String, enum: PICKUP_LOCATIONS, required: true },
    // Fixed to a single value for V1 (no destination selector) — kept as an enum
    // rather than a plain default so the schema still guards against bad data.
    destination: { type: String, enum: DESTINATIONS, default: DEFAULT_DESTINATION, required: true },

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
