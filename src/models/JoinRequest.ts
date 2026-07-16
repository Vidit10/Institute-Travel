import { Schema, model, models, type InferSchemaType } from "mongoose";
import { REQUEST_STATUSES } from "@/lib/constants";

const joinRequestSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    riderId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

// A rider can only have one *active* (pending/accepted) request per trip at a time —
// but should be able to request again after a prior request was declined or expired,
// so the uniqueness only applies to those two statuses.
joinRequestSchema.index(
  { tripId: 1, riderId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "accepted"] } } }
);

export type JoinRequestDoc = InferSchemaType<typeof joinRequestSchema>;

export const JoinRequest =
  models.JoinRequest || model("JoinRequest", joinRequestSchema);
