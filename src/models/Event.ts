import { Schema, model, models, type InferSchemaType } from "mongoose";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "@/lib/constants";

// A generic "list a happening, others RSVP" activity — e.g. a cricket match.
// Deliberately separate from Trip: no fare/vehicle/seat-race machinery, no
// girls-only toggle, no consent-gated contact reveal. See docs/SPEC.md.
const eventSchema = new Schema(
  {
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: false, maxlength: 500 },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },

    // Free text, unlike Trip's fixed pickup-location lists — an event's venue
    // isn't drawn from a small closed set.
    location: { type: String, required: true, maxlength: 200 },
    // Raw URL as pasted, shown as-is — never fetched/scraped server-side, same
    // pattern as Recommendation.mapLink.
    mapLink: { type: String, required: false, maxlength: 500 },

    startTime: { type: Date, required: true },

    // null = unlimited. When set, spotsRemaining is the atomically-decremented
    // counter (mirrors Trip.seatsRemaining) that guards against overbooking.
    capacity: { type: Number, required: false, min: 1, default: null },
    spotsRemaining: { type: Number, required: false, min: 0, default: null },

    status: { type: String, enum: EVENT_STATUSES, default: "open" },
  },
  { timestamps: true }
);

export type EventDoc = InferSchemaType<typeof eventSchema>;

export const Event = models.Event || model("Event", eventSchema);
