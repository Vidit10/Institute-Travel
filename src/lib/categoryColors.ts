import type { RECOMMENDATION_CATEGORIES, EVENT_CATEGORIES } from "@/lib/constants";

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
