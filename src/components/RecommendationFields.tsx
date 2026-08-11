"use client";

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

// Draft shape shared by every place this field set is edited — the public
// create form, the public suggest-edit form, and both admin review cards
// (new submissions, suggested edits). Numbers/arrays are kept as plain
// strings while editing (native input/textarea values), converted at submit
// time via toApiPayload — same "draft as strings, convert on submit" pattern
// the admin moderation card already used before this was extracted.
export type RecommendationDraft = {
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

export type RecommendationFieldsSource = {
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
};

export function emptyDraft(): RecommendationDraft {
  return {
    category: "food",
    title: "",
    note: "",
    area: "",
    mapLink: "",
    suggestedDays: "",
    foodType: "veg",
    dishes: "",
    leisureType: LEISURE_TYPES[0],
    vibeTags: [],
  };
}

export function draftFrom(rec: RecommendationFieldsSource): RecommendationDraft {
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

export function toApiPayload(draft: RecommendationDraft) {
  return {
    category: draft.category,
    title: draft.title,
    note: draft.note || undefined,
    area: draft.area || undefined,
    mapLink: draft.mapLink || undefined,
    suggestedDays: draft.category === "sightseeing" && draft.suggestedDays ? Number(draft.suggestedDays) : undefined,
    foodType: draft.category === "food" ? draft.foodType : undefined,
    dishes:
      draft.category === "food" && draft.dishes.trim()
        ? draft.dishes.split(",").map((d) => d.trim()).filter(Boolean)
        : undefined,
    leisureType: draft.category === "leisure" ? draft.leisureType : undefined,
    vibeTags: draft.vibeTags.length > 0 ? draft.vibeTags : undefined,
  };
}

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900";

// Renders just the fields (no <form>/submit button — callers wrap this in
// their own form and add their own submit control, since that differs per
// site: "Post recommendation" vs "Submit suggestion" vs "Approve & publish").
export default function RecommendationFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: RecommendationDraft;
  onChange: (next: RecommendationDraft) => void;
  // Admin review cards use a tighter layout (2-col grid, smaller labels) —
  // same field set, different density.
  compact?: boolean;
}) {
  function set<K extends keyof RecommendationDraft>(key: K, value: RecommendationDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function toggleVibeTag(tag: string) {
    if (draft.vibeTags.includes(tag)) {
      set("vibeTags", draft.vibeTags.filter((t) => t !== tag));
    } else if (draft.vibeTags.length < MAX_RECOMMENDATION_VIBE_TAGS) {
      set("vibeTags", [...draft.vibeTags, tag]);
    }
  }

  function changeCategory(next: Category) {
    onChange({ ...draft, category: next, vibeTags: [] });
  }

  const vibeTagOptions = VIBE_TAGS_BY_CATEGORY[draft.category];
  const labelClass = compact ? "block text-xs font-medium" : "block text-sm font-medium";
  const rowClass = compact ? "grid grid-cols-2 gap-2" : "space-y-3";

  return (
    <div className={compact ? "space-y-3" : "space-y-3"}>
      <div className={rowClass}>
        <div>
          <label className={labelClass}>
            Category {!compact && <span className="text-red-500">*</span>}
          </label>
          <select
            className={INPUT_CLASS}
            value={draft.category}
            onChange={(e) => changeCategory(e.target.value as Category)}
          >
            {RECOMMENDATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {RECOMMENDATION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {compact && (
          <div>
            <label className={labelClass}>Name</label>
            <input className={INPUT_CLASS} value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </div>
        )}
      </div>

      {!compact && (
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            required
            maxLength={100}
            placeholder="e.g. Hotel Nandan, or Yellapur Falls"
            className={INPUT_CLASS}
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
      )}

      <div className={rowClass}>
        <div>
          <label className={labelClass}>Area {!compact && "(optional)"}</label>
          <input
            maxLength={100}
            placeholder={compact ? undefined : "e.g. near Court Circle"}
            className={INPUT_CLASS}
            value={draft.area}
            onChange={(e) => set("area", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>
            {compact ? "Map link" : "Google Maps link"} {!compact && <span className="text-red-500">*</span>}
          </label>
          <input
            required={!compact}
            type="url"
            maxLength={500}
            placeholder={compact ? undefined : "Paste a Google Maps share link"}
            className={INPUT_CLASS}
            value={draft.mapLink}
            onChange={(e) => set("mapLink", e.target.value)}
          />
        </div>
      </div>

      {draft.category === "food" && (
        <div className={rowClass}>
          <div>
            <label className={labelClass}>Veg / Non-veg</label>
            {compact ? (
              <select
                className={INPUT_CLASS}
                value={draft.foodType}
                onChange={(e) => set("foodType", e.target.value as (typeof FOOD_TYPES)[number])}
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FOOD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 grid grid-cols-3 gap-2">
                {FOOD_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("foodType", t)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      draft.foodType === t
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {FOOD_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Recommended dishes {!compact && "(optional)"}</label>
            <input
              maxLength={300}
              placeholder={compact ? undefined : "Comma-separated, e.g. Butter chicken, Naan"}
              className={INPUT_CLASS}
              value={draft.dishes}
              onChange={(e) => set("dishes", e.target.value)}
            />
          </div>
        </div>
      )}

      {draft.category === "leisure" && (
        <div>
          <label className={labelClass}>Type</label>
          <select
            className={INPUT_CLASS}
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
          <label className={labelClass}>Suggested trip length, in days {!compact && "(optional)"}</label>
          <input
            type="number"
            min={1}
            max={MAX_RECOMMENDATION_DAYS}
            placeholder={compact ? undefined : "e.g. 2"}
            className={INPUT_CLASS}
            value={draft.suggestedDays}
            onChange={(e) => set("suggestedDays", e.target.value)}
          />
        </div>
      )}

      {vibeTagOptions && (
        <div>
          <label className={labelClass}>Good for {!compact && `(optional, up to ${MAX_RECOMMENDATION_VIBE_TAGS})`}</label>
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
        <label className={labelClass}>
          {compact ? "Comment" : `Any other comments (optional, max ${MAX_RECOMMENDATION_COMMENT_LENGTH} characters)`}
        </label>
        <textarea
          rows={compact ? 2 : 2}
          maxLength={MAX_RECOMMENDATION_COMMENT_LENGTH}
          className={INPUT_CLASS}
          value={draft.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </div>
    </div>
  );
}
