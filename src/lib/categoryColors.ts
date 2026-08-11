import type { RECOMMENDATION_CATEGORIES, EVENT_CATEGORIES, FOOD_TYPES } from "@/lib/constants";

// Additive-only accent palette for category badges/icons — the app's
// primary `brand` blue (buttons, links, active states) is untouched. Uses
// Tailwind's built-in color scales directly (no tailwind.config.ts changes
// needed), just curated to a small, consistent set so Recommendations/Events
// read as visually distinct content types instead of everything being the
// same gray badge.
type Accent = { badge: string; icon: string; dot: string };

const AMBER: Accent = {
  badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  icon: "text-amber-600 dark:text-amber-500",
  dot: "bg-amber-500 dark:bg-amber-500",
};
const EMERALD: Accent = {
  badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  icon: "text-emerald-600 dark:text-emerald-500",
  dot: "bg-emerald-500 dark:bg-emerald-500",
};
const VIOLET: Accent = {
  badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  icon: "text-violet-600 dark:text-violet-500",
  dot: "bg-violet-500 dark:bg-violet-500",
};
const SKY: Accent = {
  badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  icon: "text-sky-600 dark:text-sky-500",
  dot: "bg-sky-500 dark:bg-sky-500",
};
const SLATE: Accent = {
  badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  icon: "text-slate-600 dark:text-slate-400",
  dot: "bg-slate-400 dark:bg-slate-500",
};

export const RECOMMENDATION_CATEGORY_ACCENT: Record<(typeof RECOMMENDATION_CATEGORIES)[number], Accent> = {
  food: AMBER,
  leisure: EMERALD,
  movie: VIOLET,
  sightseeing: SKY,
  other: SLATE,
};

export const EVENT_CATEGORY_ACCENT: Record<(typeof EVENT_CATEGORIES)[number], Accent> = {
  sports: AMBER,
  social: EMERALD,
  academic: VIOLET,
  other: SLATE,
};

// Veg/non-veg/both: a subtle tint even unselected, full color when selected
// — a place's food type is meaningful at a glance the way a generic category
// label isn't (green/red/orange is a near-universal veg/non-veg convention).
type FoodAccent = { selected: string; unselected: string; badge: string };

export const FOOD_TYPE_ACCENT: Record<(typeof FOOD_TYPES)[number], FoodAccent> = {
  veg: {
    selected: "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-600",
    unselected:
      "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  "non-veg": {
    selected: "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-600",
    unselected:
      "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  both: {
    selected: "border-amber-600 bg-amber-500 text-white dark:border-amber-500 dark:bg-amber-600",
    unselected:
      "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
};
