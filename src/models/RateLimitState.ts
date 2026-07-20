import { Schema, model, models } from "mongoose";

// One document per user, tracking a fixed rate-limit window across all
// rate-limited mutating endpoints. Keyed by the user's own _id so the atomic
// findOneAndUpdate in src/lib/rateLimit.ts can update it lock-free, the same
// pattern used for seat concurrency in src/lib/tripRequests.ts.
const rateLimitStateSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  blockedUntil: { type: Date, required: false },
});

export const RateLimitState =
  models.RateLimitState || model("RateLimitState", rateLimitStateSchema);
