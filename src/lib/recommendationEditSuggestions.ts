import { Recommendation } from "@/models/Recommendation";
import { RecommendationEditSuggestion } from "@/models/RecommendationEditSuggestion";

export type ApproveEditSuggestionResult =
  | { ok: true; recommendation: unknown; suggestion: unknown }
  | { ok: false; error: string; status: number };

// Applies a pending suggestion's fields onto the live Recommendation. The
// recommendation's own `status` is never touched — it was never taken down
// while the suggestion sat pending (see docs/SPEC.md's Recommendations
// section), so approving is a plain field update, not a re-publish. Factored
// out of the API route so it's directly testable, same reasoning as
// src/lib/tripRequests.ts/src/lib/eventRsvp.ts.
export async function approveEditSuggestion(suggestionId: string): Promise<ApproveEditSuggestionResult> {
  const suggestion = await RecommendationEditSuggestion.findOne({ _id: suggestionId, status: "pending" });
  if (!suggestion) {
    return { ok: false, error: "not found", status: 404 };
  }

  const recommendation = await Recommendation.findByIdAndUpdate(
    suggestion.recommendationId,
    {
      category: suggestion.category,
      title: suggestion.title,
      note: suggestion.note,
      area: suggestion.area,
      mapLink: suggestion.mapLink,
      suggestedDays: suggestion.category === "sightseeing" ? suggestion.suggestedDays : undefined,
      foodType: suggestion.category === "food" ? suggestion.foodType : undefined,
      dishes: suggestion.category === "food" ? suggestion.dishes : undefined,
      leisureType: suggestion.category === "leisure" ? suggestion.leisureType : undefined,
      vibeTags: suggestion.vibeTags,
    },
    { new: true }
  );
  if (!recommendation) {
    return { ok: false, error: "recommendation no longer exists", status: 404 };
  }

  suggestion.status = "approved";
  await suggestion.save();

  return { ok: true, recommendation, suggestion };
}
