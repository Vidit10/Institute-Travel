"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import ShareCTA from "@/components/ShareCTA";
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

type Recommendation = {
  _id: string;
  category: (typeof RECOMMENDATION_CATEGORIES)[number];
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
  userId?: { name: string };
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

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
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
      <p className="mt-1 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
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
        <Link
          href={`/feedback?category=report&context=${encodeURIComponent(
            `Recommendation "${rec.title}" (id: ${rec._id})`
          )}`}
          className="hover:underline"
        >
          Report
        </Link>
      </p>
    </li>
  );
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState<(typeof RECOMMENDATION_CATEGORIES)[number]>("food");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [area, setArea] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [suggestedDays, setSuggestedDays] = useState("");
  const [foodType, setFoodType] = useState<(typeof FOOD_TYPES)[number]>("veg");
  const [dishes, setDishes] = useState("");
  const [leisureType, setLeisureType] = useState<(typeof LEISURE_TYPES)[number]>(LEISURE_TYPES[0]);
  const [vibeTags, setVibeTags] = useState<string[]>([]);
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

  // Resets whenever category changes, since the available tags/fields differ
  // per category — an old selection could otherwise get silently submitted
  // for a category it no longer applies to.
  function changeCategory(next: (typeof RECOMMENDATION_CATEGORIES)[number]) {
    setCategory(next);
    setVibeTags([]);
  }

  function toggleVibeTag(tag: string) {
    setVibeTags((tags) => {
      if (tags.includes(tag)) return tags.filter((t) => t !== tag);
      if (tags.length >= MAX_RECOMMENDATION_VIBE_TAGS) return tags;
      return [...tags, tag];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosting(true);
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        title,
        note: note || undefined,
        area: area || undefined,
        mapLink: mapLink || undefined,
        suggestedDays: category === "sightseeing" && suggestedDays ? Number(suggestedDays) : undefined,
        foodType: category === "food" ? foodType : undefined,
        dishes:
          category === "food" && dishes.trim()
            ? dishes.split(",").map((d) => d.trim()).filter(Boolean)
            : undefined,
        leisureType: category === "leisure" ? leisureType : undefined,
        vibeTags: vibeTags.length > 0 ? vibeTags : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setPosting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't post — try again.");
      return;
    }
    setTitle("");
    setNote("");
    setArea("");
    setMapLink("");
    setSuggestedDays("");
    setDishes("");
    setVibeTags([]);
    setShowForm(false);
    setSubmitted(true);
    // The public board only ever shows approved posts, so there's nothing to
    // reload into view yet — the success message is the whole story here.
  }

  const byCategory: Record<string, Recommendation[]> = {};
  for (const rec of recommendations) {
    (byCategory[rec.category] ||= []).push(rec);
  }

  const vibeTagOptions = VIBE_TAGS_BY_CATEGORY[category];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">Recommendations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Restaurants, cafes, places to visit, things to do — whatever's worth knowing about
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
            Thanks! We'll review it, and it'll be live soon.
          </p>
        )}

        {showForm && (
          <form
            onSubmit={submit}
            className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <label className="block text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={category}
                onChange={(e) => changeCategory(e.target.value as (typeof RECOMMENDATION_CATEGORIES)[number])}
              >
                {RECOMMENDATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {RECOMMENDATION_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                maxLength={100}
                placeholder="e.g. Hotel Nandan, or Yellapur Falls"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Area (optional)</label>
              <input
                maxLength={100}
                placeholder="e.g. near Court Circle"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Google Maps link <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="url"
                maxLength={500}
                placeholder="Paste a Google Maps share link"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
              />
            </div>

            {category === "food" && (
              <>
                <div>
                  <label className="block text-sm font-medium">Veg / Non-veg</label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {FOOD_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFoodType(t)}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          foodType === t
                            ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-400"
                            : "border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {FOOD_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Recommended dishes (optional)</label>
                  <input
                    maxLength={300}
                    placeholder="Comma-separated, e.g. Butter chicken, Naan"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    value={dishes}
                    onChange={(e) => setDishes(e.target.value)}
                  />
                </div>
              </>
            )}

            {category === "leisure" && (
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={leisureType}
                  onChange={(e) => setLeisureType(e.target.value as (typeof LEISURE_TYPES)[number])}
                >
                  {LEISURE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {category === "sightseeing" && (
              <div>
                <label className="block text-sm font-medium">Suggested trip length, in days (optional)</label>
                <input
                  type="number"
                  min={1}
                  max={MAX_RECOMMENDATION_DAYS}
                  placeholder="e.g. 2"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={suggestedDays}
                  onChange={(e) => setSuggestedDays(e.target.value)}
                />
              </div>
            )}

            {vibeTagOptions && (
              <div>
                <label className="block text-sm font-medium">
                  Good for (optional, up to {MAX_RECOMMENDATION_VIBE_TAGS})
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {vibeTagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleVibeTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        vibeTags.includes(tag)
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
              <label className="block text-sm font-medium">
                Any other comments (optional, max {MAX_RECOMMENDATION_COMMENT_LENGTH} characters)
              </label>
              <textarea
                rows={2}
                maxLength={MAX_RECOMMENDATION_COMMENT_LENGTH}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

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
          <p className="mt-4 text-gray-500 dark:text-gray-400">No recommendations yet — be the first.</p>
        )}

        {!loading &&
          CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((c) => (
            <div key={c} className="mt-4">
              <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {RECOMMENDATION_CATEGORY_LABELS[c]}
              </h2>
              <ul className="mt-2 space-y-2">
                {byCategory[c].map((rec) => (
                  <RecommendationCard key={rec._id} rec={rec} />
                ))}
              </ul>
            </div>
          ))}
      </main>
    </>
  );
}
