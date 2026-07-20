import { Schema, model, models } from "mongoose";

// Separate collection from normal app data (per product decision: "log this
// info separately") — a record of every time a user got rate-limited, kept
// for manual review rather than fed into product analytics.
const abuseLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    route: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export const AbuseLog = models.AbuseLog || model("AbuseLog", abuseLogSchema);
