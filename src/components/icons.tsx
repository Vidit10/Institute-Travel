import type { RECOMMENDATION_CATEGORIES, EVENT_CATEGORIES } from "@/lib/constants";

// Small, hand-drawn inline icons — same construction style used throughout
// this app (QuickActions/HelpButton/BottomTabBar: short stroke paths,
// strokeWidth ~1.4-1.5, no icon-library dependency). Kept in one shared
// module so category/status/menu icons stay visually consistent instead of
// each page redrawing its own. See memory/decisions-log.md for why this was
// hand-drawn rather than pulling in an icon library — fast load was the
// deciding factor.

type IconProps = { className?: string };

function svg(size: number, className: string | undefined, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      {children}
    </svg>
  );
}

// --- Recommendation categories ---
export function FoodIcon({ className }: IconProps) {
  return svg(14, className, (
    <path d="M6 2v6M8 2v6M6 8v10M8 8v10M6 5H8M14 2c-1 1-1 4 0 5s1-4 0-5zM14 7v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ));
}
export function LeisureIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <path d="M4 8h10v4a5 5 0 01-5 5 5 5 0 01-5-5V8z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 9h1.5a2 2 0 010 4H14" stroke="currentColor" strokeWidth="1.5" />
    </>
  ));
}
export function MovieIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 7.5l4 2.5-4 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ));
}
export function SightseeingIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <path d="M2 16l5-8 3 4.5 2-3L18 16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="14.5" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}
export function OtherCategoryIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <circle cx="5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
    </>
  ));
}

// --- Event categories ---
export function SportsIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3v14M3 10h14M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </>
  ));
}
export function SocialIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <circle cx="7" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 16c.5-2.7 2.3-4 4.5-4s4 1.3 4.5 4M12 16c.4-2 1.7-3.3 3.5-3.3s3 1.1 3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function AcademicIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <path d="M3 5.5l7-2.5 7 2.5-7 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 7.5v4.5c0 1 1.8 2 4 2s4-1 4-2V7.5" stroke="currentColor" strokeWidth="1.4" />
    </>
  ));
}

export const RECOMMENDATION_CATEGORY_ICON: Record<(typeof RECOMMENDATION_CATEGORIES)[number], (props: IconProps) => React.JSX.Element> = {
  food: FoodIcon,
  leisure: LeisureIcon,
  movie: MovieIcon,
  sightseeing: SightseeingIcon,
  other: OtherCategoryIcon,
};

export const EVENT_CATEGORY_ICON: Record<(typeof EVENT_CATEGORIES)[number], (props: IconProps) => React.JSX.Element> = {
  sports: SportsIcon,
  social: SocialIcon,
  academic: AcademicIcon,
  other: OtherCategoryIcon,
};

// --- Status (open/pending = dot, accepted/completed = check, declined/cancelled/expired = x) ---
export function StatusOkIcon({ className }: IconProps) {
  return svg(13, className, (
    <>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.8 10.2l2 2 4.2-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ));
}
export function StatusNoIcon({ className }: IconProps) {
  return svg(13, className, (
    <>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ));
}
export function StatusDotIcon({ className }: IconProps) {
  return svg(13, className, (
    <>
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" />
    </>
  ));
}

// --- Account menu ---
export function AdminIcon({ className }: IconProps) {
  return svg(16, className, (
    <path d="M10 2.5l6 2.2v4c0 4-2.6 7-6 8.8-3.4-1.8-6-4.8-6-8.8v-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  ));
}
export function RidesMenuIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8h8M6 11.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function BookmarkMenuIcon({ className }: IconProps) {
  return svg(16, className, (
    <path d="M5 3.5h10a.5.5 0 01.5.5v13l-5.5-3.5-5.5 3.5V4a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  ));
}
export function CalendarMenuIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <rect x="3" y="4" width="14" height="12.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 7.5h14M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function GearIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 3v2M10 15v2M17 10h-2M5 10H3M15 5l-1.4 1.4M6.4 13.6L5 15M15 15l-1.4-1.4M6.4 6.4L5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function MessageIcon({ className }: IconProps) {
  return svg(16, className, (
    <path d="M3 4.5h14v9H8l-3.5 3v-3H3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  ));
}
export function SignOutIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <path d="M8 3H4.5v14H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.5 10h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ));
}
