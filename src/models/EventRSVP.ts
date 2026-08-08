import { Schema, model, models, type InferSchemaType } from "mongoose";

// Open RSVP — no pending/accepted/declined state machine like JoinRequest,
// since a host doesn't approve joiners. Existence of the doc IS "going";
// leaving an event deletes it outright rather than flipping a status.
const eventRSVPSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // RSVP for your own group, not just yourself — mirrors Trip.numTravelers.
    partySize: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true }
);

// A plain unique index (not partial, unlike JoinRequest) — there's no status
// to exempt here, so one RSVP per person per event, full stop.
eventRSVPSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export type EventRSVPDoc = InferSchemaType<typeof eventRSVPSchema>;

export const EventRSVP = models.EventRSVP || model("EventRSVP", eventRSVPSchema);
