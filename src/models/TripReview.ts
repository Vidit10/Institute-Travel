import { Schema, model, models, type InferSchemaType } from "mongoose";
import { WOULD_USE_AGAIN_OPTIONS } from "@/lib/constants";

// A short, optional post-trip check-in — separate from the general Feedback
// inbox (src/models/Feedback.ts) because this is structured survey data tied
// to a specific trip + participant, not a free-text category+message blob.
// Exists to replace/validate the admin dashboard's *modeled* money-saved
// estimate (src/lib/adminMetrics.ts) with real, self-reported numbers.
const tripReviewSchema = new Schema(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    happened: { type: Boolean, required: true },
    // Self-reported, optional — rough rupee amount saved vs. travelling
    // alone. Not collected if `happened` is false (nothing to report).
    amountSaved: { type: Number, required: false, min: 0 },
    wouldUseAgain: { type: String, enum: WOULD_USE_AGAIN_OPTIONS, required: true },
    comments: { type: String, required: false, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per person per trip — resubmitting isn't supported (v1: keep
// it simple, first submission wins).
tripReviewSchema.index({ tripId: 1, userId: 1 }, { unique: true });

export type TripReviewDoc = InferSchemaType<typeof tripReviewSchema>;

export const TripReview = models.TripReview || model("TripReview", tripReviewSchema);
