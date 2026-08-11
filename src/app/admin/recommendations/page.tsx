"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import LoadingScreen from "@/components/LoadingScreen";
import RecommendationFields, {
  type RecommendationDraft,
  draftFrom,
  toApiPayload,
} from "@/components/RecommendationFields";
import { RECOMMENDATION_CATEGORIES, FOOD_TYPES, LEISURE_TYPES } from "@/lib/constants";

type Category = (typeof RECOMMENDATION_CATEGORIES)[number];

type PendingRecommendation = {
  _id: string;
  category: Category;
  title: string;
  note?: string;
  area?: string;
  mapLink?: string;
  suggestedDays?: number;
  foodType?: (typeof FOOD_TYPES)[number];
  dishes?: string[];
  leisureType?: (typeof LEISURE_TYPES)[number];
  vibeTags?: string[];
  createdAt: string;
  userId?: { name: string; email: string };
};

type EditSuggestion = {
  _id: string;
  category: Category;
  title: string;
  note?: string;
  area?: string;
  mapLink?: string;
  suggestedDays?: number;
  foodType?: (typeof FOOD_TYPES)[number];
  dishes?: string[];
  leisureType?: (typeof LEISURE_TYPES)[number];
  vibeTags?: string[];
  createdAt: string;
  suggestedBy?: { name: string; email: string };
  recommendationId: PendingRecommendation; // populated — the current live values
};

function ModerationCard({
  rec,
  onDone,
}: {
  rec: PendingRecommendation;
  onDone: (id: string) => void;
}) {
  const [draft, setDraft] = useState<RecommendationDraft>(() => draftFrom(rec));
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/recommendations/${rec._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(draft)),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't approve — try again.");
      return;
    }
    onDone(rec._id);
  }

  async function reject() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/recommendations/${rec._id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't reject — try again.");
      return;
    }
    onDone(rec._id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Submitted by {rec.userId?.name || "unknown"} ({rec.userId?.email || "no email"}) ·{" "}
        {new Date(rec.createdAt).toLocaleString()}
      </p>

      <div className="mt-3">
        <RecommendationFields draft={draft} onChange={setDraft} compact />
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {confirmingReject ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-300">Reject this submission?</span>
          <button
            onClick={reject}
            disabled={busy}
            className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Yes, reject
          </button>
          <button
            onClick={() => setConfirmingReject(false)}
            disabled={busy}
            className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Never mind
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Working..." : "Approve & publish"}
          </button>
          <button
            onClick={() => setConfirmingReject(true)}
            disabled={busy}
            className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// Fields that changed between the live recommendation and the suggestion —
// shown as a quick "what's actually different" summary above the full
// (editable) proposed values, so the admin doesn't have to diff every field
// by eye.
function diffSummary(current: PendingRecommendation, proposed: EditSuggestion): string[] {
  const changes: string[] = [];
  if (current.title !== proposed.title) changes.push(`Name: "${current.title}" → "${proposed.title}"`);
  if (current.area !== proposed.area) changes.push(`Area: "${current.area || "—"}" → "${proposed.area || "—"}"`);
  if (current.mapLink !== proposed.mapLink) changes.push("Map link changed");
  if (current.note !== proposed.note) changes.push("Comment changed");
  if (current.category !== proposed.category) changes.push(`Category: ${current.category} → ${proposed.category}`);
  return changes;
}

function SuggestionCard({
  suggestion,
  onDone,
}: {
  suggestion: EditSuggestion;
  onDone: (id: string) => void;
}) {
  const [draft, setDraft] = useState<RecommendationDraft>(() => draftFrom(suggestion));
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    // Suggested edits are approved as-proposed (no further admin editing of
    // the suggestion itself here — that's what Reject-and-ask-again is for),
    // so this PATCH doesn't send a body, unlike ModerationCard's approve.
    const res = await fetch(`/api/admin/recommendations/edit-suggestions/${suggestion._id}`, {
      method: "PATCH",
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || "Couldn't approve — try again.");
      return;
    }
    onDone(suggestion._id);
  }

  async function reject() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/recommendations/edit-suggestions/${suggestion._id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't reject — try again.");
      return;
    }
    onDone(suggestion._id);
  }

  const changes = diffSummary(suggestion.recommendationId, suggestion);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Suggested by {suggestion.suggestedBy?.name || "unknown"} ({suggestion.suggestedBy?.email || "no email"}) for
        &ldquo;{suggestion.recommendationId.title}&rdquo; · {new Date(suggestion.createdAt).toLocaleString()}
      </p>

      {changes.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-gray-600 dark:text-gray-300">
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Proposed values</p>
      <div className="mt-1">
        <RecommendationFields draft={draft} onChange={setDraft} compact />
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {confirmingReject ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-300">Reject this suggestion?</span>
          <button
            onClick={reject}
            disabled={busy}
            className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Yes, reject
          </button>
          <button
            onClick={() => setConfirmingReject(false)}
            disabled={busy}
            className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Never mind
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={approve}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Working..." : "Approve edit"}
          </button>
          <button
            onClick={() => setConfirmingReject(true)}
            disabled={busy}
            className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminRecommendationsPage() {
  const { data: session } = useSession();
  const [pending, setPending] = useState<PendingRecommendation[] | null>(null);
  const [suggestions, setSuggestions] = useState<EditSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/admin/recommendations").then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "Failed to load");
        return r.json();
      }),
      fetch("/api/admin/recommendations/edit-suggestions").then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "Failed to load");
        return r.json();
      }),
    ])
      .then(([recData, suggData]) => {
        setPending(recData.recommendations);
        setSuggestions(suggData.suggestions);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleRecDone(id: string) {
    setPending((list) => (list ? list.filter((r) => r._id !== id) : list));
  }

  function handleSuggestionDone(id: string) {
    setSuggestions((list) => (list ? list.filter((s) => s._id !== id) : list));
  }

  return (
    <>
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              ← Dashboard
            </Link>
            <span className="font-bold text-brand-700 dark:text-brand-500">Recommendations moderation</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {session?.user?.email && <span>{session.user.email}</span>}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {loading && <LoadingScreen />}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              New submissions {pending && `(${pending.length})`}
            </h2>
            {pending && pending.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nothing pending — all caught up.</p>
            )}
            {pending && pending.length > 0 && (
              <div className="mt-2 space-y-4">
                {pending.map((rec) => (
                  <ModerationCard key={rec._id} rec={rec} onDone={handleRecDone} />
                ))}
              </div>
            )}

            <h2 className="mt-6 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Suggested edits {suggestions && `(${suggestions.length})`}
            </h2>
            {suggestions && suggestions.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No suggested edits waiting.</p>
            )}
            {suggestions && suggestions.length > 0 && (
              <div className="mt-2 space-y-4">
                {suggestions.map((s) => (
                  <SuggestionCard key={s._id} suggestion={s} onDone={handleSuggestionDone} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
