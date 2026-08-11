"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import EmptyState from "@/components/EmptyState";
import ShareCTA from "@/components/ShareCTA";
import RecommendationFields, {
  type RecommendationDraft,
  emptyDraft,
  draftFrom,
  toApiPayload,
} from "@/components/RecommendationFields";
import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_CATEGORY_LABELS,
  FOOD_TYPE_LABELS,
  LEISURE_TYPES,
} from "@/lib/constants";
import { RECOMMENDATION_CATEGORY_ACCENT } from "@/lib/categoryColors";
import { RECOMMENDATION_CATEGORY_ICON } from "@/components/icons";

type Recommendation = {
  _id: string;
  category: (typeof RECOMMENDATION_CATEGORIES)[number];
  title: string;
  note?: string;
  area?: string;
  mapLink?: string;
  suggestedDays?: number;
  foodType?: keyof typeof FOOD_TYPE_LABELS;
  dishes?: string[];
  leisureType?: (typeof LEISURE_TYPES)[number];
  vibeTags?: string[];
  createdAt: string;
  userId?: { name: string };
  score: number;
  myVote: 1 | -1 | null;
};

const CATEGORY_ORDER: (typeof RECOMMENDATION_CATEGORIES)[number][] = [
  "food",
  "leisure",
  "movie",
  "sightseeing",
  "other",
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      {children}
    </span>
  );
}

function VoteControl({ rec, onVoted }: { rec: Recommendation; onVoted: (id: string, score: number, myVote: 1 | -1 | null) => void }) {
  const [busy, setBusy] = useState(false);

  async function vote(value: 1 | -1) {
    setBusy(true);
    const res = await fetch(`/api/recommendations/${rec._id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok) onVoted(rec._id, data.score, data.myVote);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Upvote"
        onClick={() => vote(1)}
        disabled={busy}
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          rec.myVote === 1
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
      >
        ▲
      </button>
      <span className="w-4 text-center text-xs font-medium text-gray-600 dark:text-gray-300">{rec.score}</span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={() => vote(-1)}
        disabled={busy}
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          rec.myVote === -1
            ? "border-red-500 bg-red-500 text-white"
            : "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
      >
        ▼
      </button>
    </div>
  );
}

function RecommendationCard({
  rec,
  onVoted,
  editing,
  onToggleEdit,
}: {
  rec: Recommendation;
  onVoted: (id: string, score: number, myVote: 1 | -1 | null) => void;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const [draft, setDraft] = useState<RecommendationDraft>(() => draftFrom(rec));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/recommendations/${rec._id}/suggest-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(draft)),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't submit — try again.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <VoteControl rec={rec} onVoted={onVoted} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{rec.title}</span>
            <span className="flex flex-wrap items-center gap-1">
              {rec.area && <Badge>{rec.area}</Badge>}
              {rec.foodType && <Badge>{FOOD_TYPE_LABELS[rec.foodType]}</Badge>}
              {rec.leisureType && <Badge>{rec.leisureType}</Badge>}
              {rec.suggestedDays && (
                <Badge>
                  {rec.suggestedDays} {rec.suggestedDays === 1 ? "day" : "days"}
                </Badge>
              )}
            </span>
          </p>
          {rec.dishes && rec.dishes.length > 0 && (
            <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
              Try: {rec.dishes.join(", ")}
            </p>
          )}
          {rec.vibeTags && rec.vibeTags.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">
              {rec.vibeTags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </p>
          )}
          {rec.note && <p className="mt-1 break-words text-gray-600 dark:text-gray-300">{rec.note}</p>}
          <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-2">
              <span>{rec.userId?.name || "a student"}</span>
              {rec.mapLink && (
                <a
                  href={rec.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline dark:text-brand-500"
                >
                  View on Maps →
                </a>
              )}
            </span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={onToggleEdit} className="hover:underline">
                {editing ? "Cancel" : "Suggest an edit"}
              </button>
              <Link
                href={`/feedback?category=report&context=${encodeURIComponent(
                  `Recommendation "${rec.title}" (id: ${rec._id})`
                )}`}
                className="hover:underline"
              >
                Report
              </Link>
            </span>
          </p>
        </div>
      </div>

      {editing && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          {submitted ? (
            <p className="text-sm text-brand-600 dark:text-brand-500">
              Thanks! An admin will review your suggested change before it goes live.
            </p>
          ) : (
            <form onSubmit={submitSuggestion} className="space-y-3">
              <RecommendationFields draft={draft} onChange={setDraft} />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit suggestion"}
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecommendationDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleVoted(id: string, score: number, myVote: 1 | -1 | null) {
    setRecommendations((list) => list.map((r) => (r._id === id ? { ...r, score, myVote } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosting(true);
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(draft)),
    });
    const data = await res.json().catch(() => null);
    setPosting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't post — try again.");
      return;
    }
    setDraft(emptyDraft());
    setShowForm(false);
    setSubmitted(true);
    // The public board only ever shows approved posts, so there's nothing to
    // reload into view yet — the success message is the whole story here.
  }

  const byCategory: Record<string, Recommendation[]> = {};
  for (const rec of recommendations) {
    (byCategory[rec.category] ||= []).push(rec);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-xl font-bold">Recommendations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Restaurants, cafes, places to visit, things to do — whatever&apos;s worth knowing about
          campus and around Dharwad. More recommendations are on the way.
        </p>

        <ShareCTA
          blurb="Find this useful? Share it with your friends."
          pitch="Check out recommendations from IIT Dharwad students on CoRide — restaurants, cafes, sightseeing spots and more:"
          path="/recommendations"
        />

        <button
          type="button"
          onClick={() => {
            setShowForm((s) => !s);
            setSubmitted(false);
          }}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-expanded={showForm}
        >
          Add a recommendation
          <span className={`transition-transform ${showForm ? "rotate-180" : ""}`}>▾</span>
        </button>

        {submitted && !showForm && (
          <p className="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-400">
            Thanks! We&apos;ll review it, and it&apos;ll be live soon.
          </p>
        )}

        {showForm && (
          <form
            onSubmit={submit}
            className="mt-2 space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <RecommendationFields draft={draft} onChange={setDraft} />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={posting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post recommendation"}
            </button>
          </form>
        )}

        {loading && <LoadingScreen />}

        {!loading && recommendations.length === 0 && (
          <EmptyState>No recommendations yet — be the first.</EmptyState>
        )}

        {!loading &&
          CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((c) => {
            const CategoryIcon = RECOMMENDATION_CATEGORY_ICON[c];
            return (
            <div key={c} className="mt-6">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <CategoryIcon className={RECOMMENDATION_CATEGORY_ACCENT[c].icon} />
                {RECOMMENDATION_CATEGORY_LABELS[c]}
              </h2>
              <ul className="mt-2 space-y-2">
                {byCategory[c].map((rec) => (
                  <RecommendationCard
                    key={rec._id}
                    rec={rec}
                    onVoted={handleVoted}
                    editing={editingId === rec._id}
                    onToggleEdit={() => setEditingId((id) => (id === rec._id ? null : rec._id))}
                  />
                ))}
              </ul>
            </div>
            );
          })}
      </main>
    </>
  );
}
