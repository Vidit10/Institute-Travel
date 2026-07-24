// Fixed list per docs/SPEC.md section 6 — extend here if scope grows beyond IIT Dharwad's immediate area.
export const PICKUP_LOCATIONS = [
  "Jubilee Circle",
  "Court Circle",
  "Dharwad New Bus Stand",
  "Dharwad Railway Station",
  "Hubli Railway Station",
  "Hubli Airport",
  "Belagavi Airport",
] as const;

// V1 destination is fixed to a single value (product decision) — no selector shown
// in the create form, every trip ends here.
export const DEFAULT_DESTINATION = "IIT Dharwad Hostels" as const;
export const DESTINATIONS = [DEFAULT_DESTINATION] as const;

// Estimates only (docs/SPEC.md section 9) — informational, not enforced, and not
// matched against actual fares.
export const REFERENCE_FARES: Record<string, string> = {
  "Jubilee Circle": "₹200–300",
  "Court Circle": "₹200–300",
  "Dharwad New Bus Stand": "₹150–200",
  "Dharwad Railway Station": "₹200–300",
  "Hubli Railway Station": "₹400–600",
  "Hubli Airport": "₹600–1000",
  // No confirmed estimate yet — shown as "TBD" rather than a guessed range.
  "Belagavi Airport": "TBD",
};

export const TRIP_MODES = ["train", "flight", "bus"] as const;

export const TRIP_STATUSES = ["open", "full", "cancelled", "completed"] as const;

// A trip counts as "active" (for the per-host listing cap below) while it's
// still joinable or full but not yet departed/cancelled.
export const ACTIVE_TRIP_STATUSES = ["open", "full"] as const;

// Keeps a host from accumulating an unbounded number of simultaneous
// listings — cancel or let one complete before listing another.
export const MAX_ACTIVE_TRIPS_PER_HOST = 5;

export const REQUEST_STATUSES = ["pending", "accepted", "declined", "expired"] as const;

// Fixed vehicle options for trip creation (replaces free-text entry).
export const VEHICLE_TYPES = [
  "Auto Rickshaw",
  "Cab (5-seater)",
  "Cab (7-seater)",
  "Tum Tum",
] as const;

// Recommended capacity, reduced from the vehicle's max seats because of
// luggage constraints — shown as a suggestion only, the host can still set
// a different total capacity.
export const RECOMMENDED_CAPACITY: Record<string, number> = {
  "Auto Rickshaw": 2,
  "Cab (5-seater)": 3,
  "Cab (7-seater)": 5,
  "Tum Tum": 7,
};

// How long a join request stays pending before auto-expiring if the host doesn't respond.
export const REQUEST_EXPIRY_HOURS = 6;

// A trip's departure can't be scheduled further out than this — up to a month
// ahead, not a general far-future-scheduling tool.
export const MAX_ADVANCE_DAYS = 30;
export const MAX_ADVANCE_HOURS = MAX_ADVANCE_DAYS * 24;

// Minute increments offered in the time-of-day picker (item 3: AM/PM dropdown).
export const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

// Companion email invites (docs: host pre-adds known travellers) expire after this
// long if unclaimed, same reasoning as request expiry.
export const INVITE_EXPIRY_DAYS = 7;

export const ALLOWED_EMAIL_DOMAIN = "iitdh.ac.in";

// Arrival-board clustering windows (docs/SPEC.md — arrivals board): an "exact"
// match is within this many minutes of the reference time; anything wider but
// still within the "nearby" window is shown as a secondary, looser match.
// Same reasoning powers the home feed's date/time search (item 2).
export const EXACT_MATCH_WINDOW_MINUTES = 30;
export const NEARBY_MATCH_WINDOW_HOURS = 3;

// How long an arrival-board entry stays visible past its own arrival time
// before the cron sweeps it away, same reasoning as REQUEST_EXPIRY_HOURS.
export const ARRIVAL_INTENT_GRACE_MINUTES = 30;

// Single source of truth for program/year — the year options shown depend on
// the selected program (a UG student never sees PhD years and vice versa).
export const PROGRAMS = ["UG", "PG", "PhD"] as const;

export const PROGRAM_LABELS: Record<(typeof PROGRAMS)[number], string> = {
  UG: "Undergraduate",
  PG: "Postgraduate",
  PhD: "PhD",
};

export const YEAR_OPTIONS_BY_PROGRAM: Record<(typeof PROGRAMS)[number], readonly string[]> = {
  UG: ["UG-1", "UG-2", "UG-3", "UG-4", "UG-5", "Others"],
  PG: ["PG-1", "PG-2", "Others"],
  PhD: ["PhD-1", "PhD-2", "PhD-3", "PhD-4", "PhD-5", "Others"],
};

export const YEAR_LABELS: Record<string, string> = {
  "UG-1": "1st year",
  "UG-2": "2nd year",
  "UG-3": "3rd year",
  "UG-4": "4th year",
  "UG-5": "5th year",
  "PG-1": "1st year",
  "PG-2": "2nd year",
  "PhD-1": "PhD – Year 1",
  "PhD-2": "PhD – Year 2",
  "PhD-3": "PhD – Year 3",
  "PhD-4": "PhD – Year 4",
  "PhD-5": "PhD – Year 5",
  Others: "Others",
};

// Flat list for the Mongoose/zod enums — the union of every program's options.
// Cast to a non-empty tuple (rather than `as const`) since it's built at
// runtime from Object.values(...).flat() — zod's z.enum() requires that shape.
export const YEARS = [...new Set(Object.values(YEAR_OPTIONS_BY_PROGRAM).flat())] as [
  string,
  ...string[],
];
