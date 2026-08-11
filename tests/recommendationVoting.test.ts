import { describe, it, expect } from "vitest";
import "./setup";
import { User } from "@/models/User";
import { Recommendation } from "@/models/Recommendation";
import { RecommendationVote } from "@/models/RecommendationVote";
import { RecommendationEditSuggestion } from "@/models/RecommendationEditSuggestion";
import { castVote, scoresFor } from "@/lib/recommendationVoting";
import { approveEditSuggestion } from "@/lib/recommendationEditSuggestions";

async function makeUser(email: string) {
  return User.create({
    email,
    name: email,
    googleId: email,
    onboarded: true,
    gender: "male",
    phone: "9000000000",
    year: "UG-1",
    program: "UG",
    contactShareDefaultConsent: true,
  });
}

async function makeRecommendation(userId: string, overrides: Record<string, unknown> = {}) {
  return Recommendation.create({
    userId,
    category: "food",
    title: "Hotel Nandan",
    mapLink: "https://maps.google.com/x",
    status: "approved",
    ...overrides,
  });
}

describe("castVote", () => {
  it("creates a vote, then un-votes when the same value is cast again", async () => {
    const author = await makeUser("author@iitdh.ac.in");
    const voter = await makeUser("voter@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    const first = await castVote(rec._id.toString(), voter._id.toString(), 1);
    expect(first).toEqual({ score: 1, myVote: 1 });

    const second = await castVote(rec._id.toString(), voter._id.toString(), 1);
    expect(second).toEqual({ score: 0, myVote: null });

    const remaining = await RecommendationVote.find({ recommendationId: rec._id });
    expect(remaining).toHaveLength(0);
  });

  it("switches an existing vote to the opposite value instead of adding a second one", async () => {
    const author = await makeUser("author2@iitdh.ac.in");
    const voter = await makeUser("voter2@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    await castVote(rec._id.toString(), voter._id.toString(), 1);
    const switched = await castVote(rec._id.toString(), voter._id.toString(), -1);

    expect(switched).toEqual({ score: -1, myVote: -1 });
    const votes = await RecommendationVote.find({ recommendationId: rec._id });
    expect(votes).toHaveLength(1);
    expect(votes[0].value).toBe(-1);
  });

  it("nets multiple voters' scores correctly", async () => {
    const author = await makeUser("author3@iitdh.ac.in");
    const a = await makeUser("votera3@iitdh.ac.in");
    const b = await makeUser("voterb3@iitdh.ac.in");
    const c = await makeUser("voterc3@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    await castVote(rec._id.toString(), a._id.toString(), 1);
    await castVote(rec._id.toString(), b._id.toString(), 1);
    await castVote(rec._id.toString(), c._id.toString(), -1);

    const { score } = await scoresFor([rec._id.toString()], a._id.toString()).then(
      (m) => m.get(rec._id.toString())!
    );
    expect(score).toBe(1);
  });
});

describe("RecommendationEditSuggestion — one pending per person per post", () => {
  it("blocks a second pending suggestion from the same user for the same recommendation", async () => {
    const author = await makeUser("author4@iitdh.ac.in");
    const suggester = await makeUser("suggester4@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "Hotel Nandan (updated)",
      mapLink: "https://maps.google.com/x",
    });

    await expect(
      RecommendationEditSuggestion.create({
        recommendationId: rec._id,
        suggestedBy: suggester._id,
        category: "food",
        title: "Another proposed name",
        mapLink: "https://maps.google.com/x",
      })
    ).rejects.toThrow();
  });

  it("allows a new suggestion once the prior one is resolved", async () => {
    const author = await makeUser("author5@iitdh.ac.in");
    const suggester = await makeUser("suggester5@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "First suggestion",
      mapLink: "https://maps.google.com/x",
      status: "rejected",
    });

    const second = await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "Second suggestion",
      mapLink: "https://maps.google.com/x",
    });
    expect(second.status).toBe("pending");
  });
});

describe("approveEditSuggestion", () => {
  it("applies the suggested fields to the live recommendation without changing its status", async () => {
    const author = await makeUser("author6@iitdh.ac.in");
    const suggester = await makeUser("suggester6@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString(), { title: "Old name", area: "Old area" });

    const suggestion = await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "New name",
      area: "New area",
      mapLink: "https://maps.google.com/x",
    });

    const result = await approveEditSuggestion(suggestion._id.toString());
    expect(result.ok).toBe(true);

    const updated = await Recommendation.findById(rec._id);
    expect(updated!.title).toBe("New name");
    expect(updated!.area).toBe("New area");
    expect(updated!.status).toBe("approved"); // never touched, was never taken down

    const resolvedSuggestion = await RecommendationEditSuggestion.findById(suggestion._id);
    expect(resolvedSuggestion!.status).toBe("approved");
  });

  it("leaves the live recommendation untouched while a suggestion is still pending", async () => {
    const author = await makeUser("author7@iitdh.ac.in");
    const suggester = await makeUser("suggester7@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString(), { title: "Untouched name" });

    await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "Proposed name",
      mapLink: "https://maps.google.com/x",
    });

    const stillLive = await Recommendation.findById(rec._id);
    expect(stillLive!.title).toBe("Untouched name");
    expect(stillLive!.status).toBe("approved");
  });

  it("rejects approving a suggestion that's already resolved", async () => {
    const author = await makeUser("author8@iitdh.ac.in");
    const suggester = await makeUser("suggester8@iitdh.ac.in");
    const rec = await makeRecommendation(author._id.toString());

    const suggestion = await RecommendationEditSuggestion.create({
      recommendationId: rec._id,
      suggestedBy: suggester._id,
      category: "food",
      title: "Name",
      mapLink: "https://maps.google.com/x",
      status: "rejected",
    });

    const result = await approveEditSuggestion(suggestion._id.toString());
    expect(result.ok).toBe(false);
  });
});
