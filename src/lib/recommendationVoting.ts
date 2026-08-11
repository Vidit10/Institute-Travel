import { RecommendationVote } from "@/models/RecommendationVote";

export type VoteValue = 1 | -1;

// Casting the same value again un-votes (toggle off); casting the opposite
// value switches it; casting a fresh value creates it. Factored out of the
// API route for direct testability, same reasoning as
// src/lib/tripRequests.ts/src/lib/eventRsvp.ts.
export async function castVote(
  recommendationId: string,
  userId: string,
  value: VoteValue
): Promise<{ score: number; myVote: VoteValue | null }> {
  const existing = await RecommendationVote.findOne({ recommendationId, userId });

  if (!existing) {
    await RecommendationVote.create({ recommendationId, userId, value });
  } else if (existing.value === value) {
    await RecommendationVote.deleteOne({ _id: existing._id });
  } else {
    existing.value = value;
    await existing.save();
  }

  return scoreFor(recommendationId, userId);
}

export async function scoreFor(
  recommendationId: string,
  userId?: string
): Promise<{ score: number; myVote: VoteValue | null }> {
  const votes = await RecommendationVote.find({ recommendationId }).lean();
  const score = votes.reduce((sum, v) => sum + v.value, 0);
  const myVote = userId
    ? ((votes.find((v) => v.userId.toString() === userId)?.value as VoteValue | undefined) ?? null)
    : null;
  return { score, myVote };
}

// Bulk variant for a list of recommendations (the public GET route) — one
// query instead of one per item.
export async function scoresFor(
  recommendationIds: string[],
  userId?: string
): Promise<Map<string, { score: number; myVote: VoteValue | null }>> {
  const votes = await RecommendationVote.find({ recommendationId: { $in: recommendationIds } }).lean();
  const byRec = new Map<string, { score: number; myVote: VoteValue | null }>();
  for (const id of recommendationIds) {
    byRec.set(id, { score: 0, myVote: null });
  }
  for (const v of votes) {
    const key = v.recommendationId.toString();
    const entry = byRec.get(key);
    if (!entry) continue;
    entry.score += v.value;
    if (userId && v.userId.toString() === userId) entry.myVote = v.value as VoteValue;
  }
  return byRec;
}
