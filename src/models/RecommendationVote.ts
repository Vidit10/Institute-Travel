import { Schema, model, models, type InferSchemaType } from "mongoose";

// One vote per person per recommendation — casting the same value again is
// a toggle-off (handled in src/lib/recommendationVoting.ts), so this
// collection only ever holds a person's current, single vote.
const recommendationVoteSchema = new Schema(
  {
    recommendationId: { type: Schema.Types.ObjectId, ref: "Recommendation", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    value: { type: Number, enum: [1, -1], required: true },
  },
  { timestamps: true }
);

recommendationVoteSchema.index({ recommendationId: 1, userId: 1 }, { unique: true });

export type RecommendationVoteDoc = InferSchemaType<typeof recommendationVoteSchema>;

export const RecommendationVote =
  models.RecommendationVote || model("RecommendationVote", recommendationVoteSchema);
