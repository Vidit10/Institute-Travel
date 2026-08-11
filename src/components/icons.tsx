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
// Blocky rectangular teeth around a ring with a center hole — NOT thin
// radiating lines. That "circle + spokes" shape is what the ThemeToggle sun
// icon looks like; a settings gear needs to read as visually distinct from
// it at a glance, not as the same glyph in a different context.
const GEAR_TOOTH_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function GearIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      {GEAR_TOOTH_ANGLES.map((angle) => (
        <rect
          key={angle}
          x="9.3"
          y="1.6"
          width="1.4"
          height="2.4"
          rx="0.4"
          fill="currentColor"
          transform={`rotate(${angle} 10 10)`}
        />
      ))}
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="10" cy="10" r="1.3" stroke="currentColor" strokeWidth="1.3" fill="none" />
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

// --- Action icons (bare — no circle, unlike the Status* icons above, which
// represent state. These represent something you're about to DO.) ---
export function WarningTriangleIcon({ className }: IconProps) {
  return svg(14, className, (
    <>
      <path d="M10 2.5L18 16H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </>
  ));
}
export function XIcon({ className }: IconProps) {
  return svg(14, className, (
    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  ));
}
export function CheckIcon({ className }: IconProps) {
  return svg(14, className, (
    <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ));
}

// --- Trip mode ---
export function TrainIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <rect x="4.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 8.5h11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 5.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.2" cy="16" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12.8" cy="16" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 13.5l-2 3M13.5 13.5l2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ));
}
export function PlaneIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M10 2.5v11.5M10 2.5l3.5 3.5-1 .5-2.5-1.7-2.5 1.7-1-.5L10 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 11l6 3 6-3-1.3-1-4.7 1.4L5.3 10 4 11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.3 14.7l1.7 2.8 1.7-2.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </>
  ));
}
export function BusModeIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <rect x="3" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="15.5" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="15.5" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}

// --- Vehicle type ---
export function AutoIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M3.5 13V9.3c0-.5.3-.9.7-1.1l3.6-1.7h4.7l3 2.4c.3.2.5.6.5 1V13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3.5 13h13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.8 6.5V4.5h2.6v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6.3" cy="15" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.7" cy="15" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}
export function CabIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M4 12.5V10l1.6-3.8c.2-.5.7-.8 1.2-.8h6.4c.5 0 1 .3 1.2.8L16 10v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 12.5h12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6.5" cy="14.7" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="14.7" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}
export function TumTumIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <rect x="3" y="5.5" width="14" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 5.5v7.5M11 5.5v7.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="15" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="14" cy="15" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}

// --- Feedback categories ---
export function LightbulbIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M10 2.5a5 5 0 00-3 9c.5.4.8 1 .8 1.7v.3h4.4v-.3c0-.6.3-1.3.8-1.7a5 5 0 00-3-9z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.3 16.5h3.4M8.7 18h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ));
}
export function BugIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <circle cx="10" cy="11" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 7V4.5M7 8.5L4.5 6M13 8.5L15.5 6M6 11H3M17 11h-3M6.5 14.5L4 17M13.5 14.5L16 17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ));
}
export function ProfileIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 17c0-3.3 3-5 6.5-5s6.5 1.7 6.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}

// --- Recommendation "leisure" sub-types ---
export function CafeIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M4 6h9v6a4.5 4.5 0 01-4.5 4.5H8.5A4.5 4.5 0 014 12V6z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 7.5h1.5a2 2 0 010 4H13" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 3.5c-.5.6-.5 1.1 0 1.7M9.5 3.5c-.5.6-.5 1.1 0 1.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ));
}
export function ParkIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M10 2.5l4 6h-2.5l3 5H5.5l3-5H6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M10 13.5V17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function ArcadeIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <circle cx="10" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 8.3V12" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5" y="12" width="10" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </>
  ));
}
export function ShoppingIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M5.5 7h9l-.7 9.5a1.5 1.5 0 01-1.5 1.4H7.7a1.5 1.5 0 01-1.5-1.4L5.5 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 7V5.5a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4" />
    </>
  ));
}
export function SpaIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M10 3c3.5 2 5 5 5 8a5 5 0 01-10 0c0-3 1.5-6 5-8z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 8v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ));
}
export function FitnessIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="2" y="8" width="2.2" height="4" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="15.8" y="8" width="2.2" height="4" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5" y="6.5" width="1.6" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="13.4" y="6.5" width="1.6" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </>
  ));
}
export function NightlifeIcon({ className }: IconProps) {
  return svg(15, className, (
    <path d="M14.5 11.3A6 6 0 018.7 3a6 6 0 106 8.3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  ));
}

// --- Program ---
export function UndergradIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M2 8l8-3.5L18 8l-8 3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 9.8v3c0 1 2 2 4.5 2s4.5-1 4.5-2v-3" stroke="currentColor" strokeWidth="1.3" />
    </>
  ));
}
export function PostgradIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <rect x="3" y="7" width="14" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 7V5.3a1.3 1.3 0 011.3-1.3h2.4a1.3 1.3 0 011.3 1.3V7" stroke="currentColor" strokeWidth="1.4" />
    </>
  ));
}
export function PhdIcon({ className }: IconProps) {
  return svg(15, className, (
    <>
      <path d="M3 4.5h6a2 2 0 012 2v9a2 2 0 00-2-1H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M17 4.5h-6a2 2 0 00-2 2v9a2 2 0 012-1h6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ));
}

// Year isn't hand-drawn per-value (that'd be 15+ near-identical icons for
// something that's just an ordinal) — a circled digit, computed from
// whichever year value the caller passes in.
export function YearBadgeIcon({ className, digit }: IconProps & { digit: string }) {
  return svg(15, className, (
    <>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" />
      <text x="10" y="13.3" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">
        {digit}
      </text>
    </>
  ));
}

// Shared by settings + onboarding's IconSelect for the "Year" field — picks
// out the trailing digit from a value like "UG-3" for YearBadgeIcon, falling
// back to OtherCategoryIcon for "Others".
export function yearIconFor(value: string): (props: IconProps) => React.JSX.Element {
  const match = value.match(/-(\d+)$/);
  if (match) {
    const digit: string = match[1];
    function BoundYearBadgeIcon(props: IconProps) {
      return <YearBadgeIcon {...props} digit={digit} />;
    }
    return BoundYearBadgeIcon;
  }
  return OtherCategoryIcon;
}

export function DownloadIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}

// --- Help-page topic headings + a couple of other named-section headings
// that were missing the <icon> <name> treatment applied everywhere else. ---
export function HomeMenuIcon({ className }: IconProps) {
  // Same glyph as BottomTabBar's own (local, unexported) HomeIcon — kept in
  // sync by eye since that one's tab-bar-specific sizing isn't worth sharing.
  return svg(16, className, (
    <>
      <path d="M3 9l7-6 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4.5 8v8h11V8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ));
}
export function QuickActionsIcon({ className }: IconProps) {
  return svg(16, className, (
    <path d="M11 2L4 11h4l-1 7 7-9h-4l1-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  ));
}
export function BrowseIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ));
}
export function IdCardIcon({ className }: IconProps) {
  return svg(16, className, (
    <>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 13c.5-1.5 1.8-2 2.5-2s2 .5 2.5 2M11.5 8h4M11.5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ));
}
