import { Schema, model, models, type InferSchemaType } from "mongoose";

const COMPANION_INVITE_STATUSES = ["pending", "claimed", "expired", "cancelled"] as const;

const companionInviteSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    invitedByHostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: COMPANION_INVITE_STATUSES, default: "pending" },
    expiresAt: { type: Date, required: true },
    // Set once claimed, so we never re-process the same invite twice.
    claimedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

export type CompanionInviteDoc = InferSchemaType<typeof companionInviteSchema>;

export const CompanionInvite =
  models.CompanionInvite || model("CompanionInvite", companionInviteSchema);
