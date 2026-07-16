import { Schema, model, models, type InferSchemaType } from "mongoose";
import {
  PICKUP_LOCATIONS,
  DESTINATIONS,
  TRIP_MODES,
  TRIP_STATUSES,
} from "@/lib/constants";

const tripSchema = new Schema(
  {
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    mode: { type: String, enum: TRIP_MODES, required: true },
    vehicleType: { type: String, required: true }, // e.g. Nischayan, Cab, Tumtum
    pickupLocation: { type: String, enum: PICKUP_LOCATIONS, required: true },
    destination: { type: String, enum: DESTINATIONS, required: true },

    departureTime: { type: Date, required: true }, // self-reported ETA at pickup location

    // Optional, used for live tracking lookups (docs/SPEC.md section 7).
    trainNumber: { type: String, required: false },
    flightNumber: { type: String, required: false },
    lastKnownLiveStatus: { type: String, required: false }, // cached result, best-effort

    totalCapacity: { type: Number, required: true, min: 1 },
    seatsRemaining: { type: Number, required: true, min: 0 },

    girlsOnly: { type: Boolean, default: false },
    referenceFareNote: { type: String, required: false }, // informational only, not enforced

    status: { type: String, enum: TRIP_STATUSES, default: "open" },
  },
  { timestamps: true }
);

export type TripDoc = InferSchemaType<typeof tripSchema>;

export const Trip = models.Trip || model("Trip", tripSchema);
