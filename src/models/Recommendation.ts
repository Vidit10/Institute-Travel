import { Schema, model, models, type InferSchemaType } from "mongoose";
import {
  RECOMMENDATION_CATEGORIES,
  FOOD_TYPES,
  LEISURE_TYPES,
  MAX_RECOMMENDATION_COMMENT_LENGTH,
} from "@/lib/constants";

// A simple, low-stakes board — restaurants, places to visit, etc. — for
// anyone on campus. Deliberately not tied to PICKUP_LOCATIONS (these are
// destinations, not pickup points), so `area` is free text rather than an enum.
const recommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: RECOMMENDATION_CATEGORIES, required: true },
    title: { type: String, required: true, maxlength: 100 },
    // Was required/500 chars and the primary content; now a short optional
    // remark, since the category-specific structured fields below carry the
    // substance instead.
    note: { type: String, required: false, maxlength: MAX_RECOMMENDATION_COMMENT_LENGTH },
    area: { type: String, required: false, maxlength: 100 },
    // Just the raw URL the poster pastes — never fetched/scraped server-side
    // (no Places API call, no cost, no key to manage). Required for new posts;
    // kept optional at the schema level (enforced in the API's zod schema
    // instead) so recommendations posted before this requirement still read fine.
    mapLink: { type: String, required: false, maxlength: 500 },
    // Only meaningful for "sightseeing" — how many days the trip takes.
    suggestedDays: { type: Number, required: false, min: 1 },

    // food only
    foodType: { type: String, enum: FOOD_TYPES, required: false },
    dishes: { type: [String], required: false, default: undefined },
    // leisure only
    leisureType: { type: String, enum: LEISURE_TYPES, required: false },
    // food/leisure/sightseeing — validated against VIBE_TAGS_BY_CATEGORY[category]
    // in the API layer, not a DB enum (same "loosen + validate in zod" pattern
    // used for Trip's location fields).
    vibeTags: { type: [String], required: false, default: undefined },

    // Moderation: defaults to "approved" so every recommendation posted before
    // this change (no `status` field at all) keeps reading as live/public with
    // no migration needed. New posts always explicitly set "pending" in the
    // API — this default exists purely for backward reads, not because
    // "approved" is the intended default for new submissions.
    status: { type: String, enum: ["pending", "approved"], default: "approved" },
  },
  { timestamps: true }
);

export type RecommendationDoc = InferSchemaType<typeof recommendationSchema>;

export const Recommendation =
  models.Recommendation || model("Recommendation", recommendationSchema);
