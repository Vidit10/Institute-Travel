"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import LoadingScreen from "@/components/LoadingScreen";
import {
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_CATEGORY_LABELS,
  MAX_RECOMMENDATION_DAYS,
  FOOD_TYPES,
  FOOD_TYPE_LABELS,
  LEISURE_TYPES,
  VIBE_TAGS_BY_CATEGORY,
  MAX_RECOMMENDATION_VIBE_TAGS,
  MAX_RECOMMENDATION_COMMENT_LENGTH,
} from "@/lib/constants";

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

// The moderation queue's draft state per item — same shape the public create
// form uses, just pre-filled from the pending submission and kept as one
// object per item so edits are independent across the list.
type Draft = {
  category: Category;
  title: string;
  note: string;
  area: string;
  mapLink: string;
  suggestedDays: string;
  foodType: (typeof FOOD_TYPES)[number];
  dishes: string;
  leisureType: (typeof LEISURE_TYPES)[number];
  vibeTags: string[];
};

function draftFrom(rec: PendingRecommendation): Draft {
  return {
    category: rec.category,
    title: rec.title,
    note: rec.note || "",
    area: rec.area || "",
    mapLink: rec.mapLink || "",
    suggestedDays: rec.suggestedDays ? String(rec.suggestedDays) : "",
    foodType: rec.foodType || "veg",
    dishes: (rec.dishes || []).join(", "),
    leisureType: rec.leisureType || LEISURE_TYPES[0],
    vibeTags: rec.vibeTags || [],
  };
}

function ModerationCard({
  rec,
  onDone,
}: {
  rec: PendingRecommendation;
  onDone: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(rec));
  const [busy, setBusy] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleVibeTag(tag: string) {
    setDraft((d) => {
      if (d.vibeTags.includes(tag)) return { ...d, vibeTags: d.vibeTags.filter((t) => t !== tag) };
      if (d.vibeTags.length >= MAX_RECOMMENDATION_VIBE_TAGS) return d;
      return { ...d, vibeTags: [...d.vibeTags, tag] };
    });
  }

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/recommendations/${rec._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: draft.category,
        title: draft.title,
        note: draft.note || undefined,
        area: draft.area || undefined,
        mapLink: draft.mapLink,
        suggestedDays:
          draft.category === "sightseeing" && draft.suggestedDays ? Number(draft.suggestedDays) : undefined,
        foodType: draft.category === "food" ? draft.foodType : undefined,
        dishes:
          draft.category === "food" && draft.dishes.trim()
            ? draft.dishes.split(",").map((d) => d.trim()).filter(Boolean)
            : undefined,
        leisureType: draft.category === "leisure" ? draft.leisureType : undefined,
        vibeTags: draft.vibeTags.length > 0 ? draft.vibeTags : undefined,
      }),
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

  const vibeTagOptions = VIBE_TAGS_BY_CATEGORY[draft.category];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Submitted by {rec.userId?.name || "unknown"} ({rec.userId?.email || "no email"}) ·{" "}
        {new Date(rec.createdAt).toLocaleString()}
      </p>

      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.category}
              onChange={(e) => set("category", e.target.value as Category)}
            >
              {RECOMMENDATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {RECOMMENDATION_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium">Area</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Map link</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.mapLink}
              onChange={(e) => set("mapLink", e.target.value)}
            />
          </div>
        </div>

        {draft.category === "food" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium">Veg / Non-veg</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={draft.foodType}
                onChange={(e) => set("foodType", e.target.value as (typeof FOOD_TYPES)[number])}
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FOOD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium">Dishes (comma-separated)</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={draft.dishes}
                onChange={(e) => set("dishes", e.target.value)}
              />
            </div>
          </div>
        )}

        {draft.category === "leisure" && (
          <div>
            <label className="block text-xs font-medium">Type</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.leisureType}
              onChange={(e) => set("leisureType", e.target.value as (typeof LEISURE_TYPES)[number])}
            >
              {LEISURE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {draft.category === "sightseeing" && (
          <div>
            <label className="block text-xs font-medium">Suggested days</label>
            <input
              type="number"
              min={1}
              max={MAX_RECOMMENDATION_DAYS}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={draft.suggestedDays}
              onChange={(e) => set("suggestedDays", e.target.value)}
            />
          </div>
        )}

        {vibeTagOptions && (
          <div>
            <label className="block text-xs font-medium">Good for</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {vibeTagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleVibeTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    draft.vibeTags.includes(tag)
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium">Comment</label>
          <textarea
            rows={2}
            maxLength={MAX_RECOMMENDATION_COMMENT_LENGTH}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
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
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Working..." : "Approve & publish"}
          </button>
          <button
            onClick={() => setConfirmingReject(true)}
            disabled={busy}
            className="rounded-md border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/admin/recommendations")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          throw new Error(data?.error || "Failed to load");
        }
        return r.json();
      })
      .then((data) => setPending(data.recommendations))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleDone(id: string) {
    setPending((list) => (list ? list.filter((r) => r._id !== id) : list));
  }

  return (
    <>
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              ← Dashboard
            </Link>
            <span className="font-bold text-brand-700 dark:text-brand-500">Pending recommendations</span>
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
        {!loading && !error && pending && pending.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nothing pending — all caught up.</p>
        )}
        {!loading && pending && pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((rec) => (
              <ModerationCard key={rec._id} rec={rec} onDone={handleDone} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
