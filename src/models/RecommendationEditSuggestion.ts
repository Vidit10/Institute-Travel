import { Schema, model, models, type InferSchemaType } from "mongoose";
import {
  RECOMMENDATION_CATEGORIES,
  FOOD_TYPES,
  LEISURE_TYPES,
  MAX_RECOMMENDATION_COMMENT_LENGTH,
} from "@/lib/constants";

// A proposed change to an existing, already-approved Recommendation — open to
// any authenticated user, not just the original poster. Mirrors
// Recommendation's own editable-content shape exactly, so approving one is a
// straight field copy (see src/app/api/admin/recommendations/edit-suggestions/[id]/route.ts).
// The live Recommendation is never touched until a suggestion is approved —
// see docs/SPEC.md's Recommendations section for why (an unresolved
// suggestion must never hide someone else's approved post from the board).
const recommendationEditSuggestionSchema = new Schema(
  {
    recommendationId: { type: Schema.Types.ObjectId, ref: "Recommendation", required: true },
    suggestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    category: { type: String, enum: RECOMMENDATION_CATEGORIES, required: true },
    title: { type: String, required: true, maxlength: 100 },
    note: { type: String, required: false, maxlength: MAX_RECOMMENDATION_COMMENT_LENGTH },
    area: { type: String, required: false, maxlength: 100 },
    mapLink: { type: String, required: false, maxlength: 500 },
    suggestedDays: { type: Number, required: false, min: 1 },
    foodType: { type: String, enum: FOOD_TYPES, required: false },
    dishes: { type: [String], required: false, default: undefined },
    leisureType: { type: String, enum: LEISURE_TYPES, required: false },
    vibeTags: { type: [String], required: false, default: undefined },

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// One pending suggestion per person per recommendation at a time — stops
// spam, still allows a new suggestion once the last one is resolved. Same
// partial-unique pattern as JoinRequest.
recommendationEditSuggestionSchema.index(
  { recommendationId: 1, suggestedBy: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export type RecommendationEditSuggestionDoc = InferSchemaType<typeof recommendationEditSuggestionSchema>;

export const RecommendationEditSuggestion =
  models.RecommendationEditSuggestion ||
  model("RecommendationEditSuggestion", recommendationEditSuggestionSchema);
