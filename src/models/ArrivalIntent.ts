import { Schema, model, models, type InferSchemaType } from "mongoose";
import { TRIP_MODES, DIRECTIONS, LISTING_TYPES } from "@/lib/constants";

// A lightweight "I'm arriving around here, around then" signal — deliberately
// has no vehicle/fare/capacity. It's a discovery board, not a booking: once a
// cluster looks worth combining, anyone in it converts it into a real Trip
// (src/app/api/trips/route.ts), which is where the actual concurrency-safe
// seat/fare/consent machinery lives. See docs/SPEC.md's arrivals-board section.
const arrivalIntentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // The anchor point — a city location when direction is "to-campus" (today's
    // meaning, unchanged), or the on-campus meeting point when "from-campus". No
    // longer a fixed enum; valid values depend on direction/listingType, validated
    // in the API layer. Loosening (not renaming) keeps every pre-existing document
    // valid untouched.
    pickupLocation: { type: String, required: true },
    // Old documents default to "to-campus" on read — their only prior meaning.
    direction: { type: String, enum: DIRECTIONS, default: "to-campus" },
    listingType: { type: String, enum: LISTING_TYPES, default: "long-distance" },
    arrivalTime: { type: Date, required: true },
    mode: { type: String, enum: TRIP_MODES, required: false },
    // Optional, same purpose as Trip.trainNumber/flightNumber — lets someone
    // browsing the board double-check they've got the right person/train.
    // Both optional so existing entries (posted before this field existed)
    // are unaffected.
    trainNumber: { type: String, required: false },
    flightNumber: { type: String, required: false },
    // How many people are already in the poster's own group (so a cluster
    // count reflects real head-count, not just number of board entries).
    partySize: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: ["active", "withdrawn", "expired", "converted"], default: "active" },
    // Mirrors Trip.girlsOnly (docs/SPEC.md section 8) — hidden from non-female
    // viewers entirely, same visibility rule as girls-only trips.
    girlsOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One active entry per user, full stop — a person can only be arriving at
// one place at a time. Posting again (at the same location or a different
// one) replaces the existing active entry rather than adding a second.
arrivalIntentSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

export type ArrivalIntentDoc = InferSchemaType<typeof arrivalIntentSchema>;

export const ArrivalIntent =
  models.ArrivalIntent || model("ArrivalIntent", arrivalIntentSchema);
