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

// Pickup points close enough in practice that someone who found too few
// matches at their exact location might want to combine with a cluster-mate
// instead. Opt-in only (see the arrivals GET route) — never merged into the
// default exact/nearby results, and locations outside a cluster (Hubli,
// Belagavi) get no such option at all.
export const LOCATION_CLUSTERS: readonly (readonly string[])[] = [
  ["Court Circle", "Jubilee Circle", "Dharwad New Bus Stand", "Dharwad Railway Station"],
];

export function getClusterMates(location: string): string[] {
  const cluster = LOCATION_CLUSTERS.find((c) => c.includes(location));
  return cluster ? cluster.filter((loc) => loc !== location) : [];
}

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

// Phase 2: local, everyday campus<->city hops — distinct from the long-distance
// PICKUP_LOCATIONS above (railway/airport), which stays the semester-start arrival flow.
// Ordered as a real route (hostel-side -> Main Gate) — this array's index IS the campus
// route position used by routeIndex()/isOnTheWay() below, not just a display order.
export const CAMPUS_LOCATIONS = [
  "Mess Block",
  "A1 - Engineering Block",
  "Central Learning Theatre (CLT)",
  "A2 - Sciences Block",
  "IIT Dharwad PC Main Gate",
] as const;

// Ordered as a real route (far-from-campus -> campus), same reasoning as CAMPUS_LOCATIONS.
// "Others" reveals a free-text field client-side (the typed value, not the literal string
// "Others", is what gets stored) and is deliberately excluded from route indexing — it's an
// escape hatch for an off-route location, not a route stop.
export const CITY_LOCATIONS = [
  "Inox (Smart City Mall)",
  "Court Circle",
  "Jubilee Circle",
  "Old Bus Terminal Dharwad",
  "New Bus Stand Dharwad",
  "Others",
] as const;

export const DIRECTIONS = ["to-campus", "from-campus"] as const;
export const DIRECTION_LABELS: Record<(typeof DIRECTIONS)[number], string> = {
  "to-campus": "Returning to campus",
  "from-campus": "Heading out",
};

// Distinguishes the original semester-start long-haul flow (PICKUP_LOCATIONS <-> Hostels)
// from the everyday local campus<->city flow (CAMPUS_LOCATIONS <-> CITY_LOCATIONS).
export const LISTING_TYPES = ["long-distance", "local"] as const;

// Informational only (shown as an expectation-setter) — not enforced or matched against.
export const TRAVEL_TYPES = ["leisure", "professional"] as const;
export const TRAVEL_TYPE_DELAY_HINTS: Record<(typeof TRAVEL_TYPES)[number], string> = {
  leisure: "A 30–45 min delay might be expected",
  professional: "Not more than 15 min delay expected",
};

export type TripCombo = "arrival" | "departure-long" | "local-return" | "local-departure";

// Resolves which (listingType, direction) combination applies, since each of
// the four has its own location-list pairing (Trip and ArrivalIntent APIs both
// need this). "arrival" is the original semester-start flow; the other three
// are the Phase 2 additions.
export function resolveTripCombo(listingType: string, direction: string): TripCombo {
  if (listingType === "long-distance" && direction === "to-campus") return "arrival";
  if (listingType === "long-distance" && direction === "from-campus") return "departure-long";
  if (listingType === "local" && direction === "to-campus") return "local-return";
  return "local-departure";
}

// --- Local-flow route matching ---
// Both CAMPUS_LOCATIONS and CITY_LOCATIONS (minus "Others") are ordered as real
// corridors, in the direction of travel (increasing index = further along the
// route away from the start). Only ever used for `listingType: "local"` — the
// long-distance flow (PICKUP_LOCATIONS/LOCATION_CLUSTERS) has no route concept
// and stays exact-match + opt-in-cluster, untouched by any of this.

// The relevant route for a direction: the city corridor for to-campus, the
// campus corridor for from-campus — ArrivalIntent only ever stores one anchor
// point (never both), so a single route always suffices for any comparison.
export function routeFor(direction: string): readonly string[] {
  return direction === "from-campus" ? CAMPUS_LOCATIONS : CITY_LOCATIONS.slice(0, -1);
}

// -1 for a location not on the relevant route (e.g. "Others" free text, or a
// long-distance location passed in by mistake).
export function routeIndex(direction: string, location: string): number {
  return routeFor(direction).indexOf(location);
}

// A vehicle starting at `hostPickupLocation` only ever moves toward the far end
// of the route, so it passes every stop from its own index onward — this is
// what "on the way" means. False if either point isn't on a defined route.
export function isOnTheWay(direction: string, hostPickupLocation: string, otherLocation: string): boolean {
  const p = routeIndex(direction, hostPickupLocation);
  const r = routeIndex(direction, otherLocation);
  return p !== -1 && r !== -1 && r >= p;
}

// Human label for the whole corridor, e.g. "Inox (Smart City Mall) → New Bus Stand Dharwad".
export function routeLabel(direction: string): string {
  const route = routeFor(direction);
  return `${route[0]} → ${route[route.length - 1]}`;
}

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

// Local (intracity) trips don't carry the same luggage constraint as the
// long-distance flow, so the recommended capacity sits closer to the
// vehicle's real seating — still a suggestion the host can override.
export const LOCAL_RECOMMENDED_CAPACITY: Record<string, number> = {
  "Auto Rickshaw": 4,
  "Cab (5-seater)": 5,
  "Cab (7-seater)": 8,
  "Tum Tum": 10,
};

// How long a join request stays pending before auto-expiring if the host doesn't
// respond — the real expiry is min(trip.departureTime, now + this), so it's only
// ever the binding constraint when the trip departs further out than this. 15h
// covers a full night's sleep (e.g. a request at 1 AM shouldn't expire before an
// 8 AM host wakes up) — 6h was too easy to blow past overnight.
export const REQUEST_EXPIRY_HOURS = 15;

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

// Post-trip review (src/models/TripReview.ts) — a short, optional check-in
// sent after a trip completes, distinct from the general Feedback inbox.
export const WOULD_USE_AGAIN_OPTIONS = ["yes", "no", "maybe"] as const;

// Recommendations board (src/models/Recommendation.ts) — restaurants, places
// to visit, and things to do, for anyone on campus.
export const RECOMMENDATION_CATEGORIES = ["food", "leisure", "movie", "sightseeing", "other"] as const;
export const RECOMMENDATION_CATEGORY_LABELS: Record<(typeof RECOMMENDATION_CATEGORIES)[number], string> = {
  food: "Food & Dining",
  leisure: "Leisure",
  movie: "Movies",
  sightseeing: "Sightseeing",
  other: "Something else",
};

// Sightseeing recommendations can be a day trip or a multi-day one — shown
// only for that category, since "days" doesn't mean anything for a restaurant.
export const MAX_RECOMMENDATION_DAYS = 30;

export const FOOD_TYPES = ["veg", "non-veg", "both"] as const;
export const FOOD_TYPE_LABELS: Record<(typeof FOOD_TYPES)[number], string> = {
  veg: "Veg",
  "non-veg": "Non-veg",
  both: "Both",
};

export const LEISURE_TYPES = [
  "Cafe",
  "Park/Outdoors",
  "Games/Arcade",
  "Shopping",
  "Spa/Wellness",
  "Sports/Fitness",
  "Nightlife",
  "Other",
] as const;

// Which "good for" tags are offered depends on category — one shared pool
// (VIBE_TAGS_BY_CATEGORY, keyed by RECOMMENDATION_CATEGORIES) rather than
// three near-duplicate lists. Movies/Other get no tags at all.
export const VIBE_TAGS_BY_CATEGORY: Partial<Record<(typeof RECOMMENDATION_CATEGORIES)[number], readonly string[]>> = {
  food: ["Date", "Birthday/Celebration", "Group hangout", "Quick bite", "Study/Work-friendly", "Late-night", "Budget-friendly", "Family-friendly"],
  leisure: ["Date", "Birthday/Celebration", "Group hangout", "Study/Work-friendly", "Late-night", "Budget-friendly", "Family-friendly"],
  sightseeing: ["Day trip", "Weekend trip", "Trek", "Nature/Waterfall", "Historical/Heritage", "Adventure", "Family-friendly"],
};

export const MAX_RECOMMENDATION_VIBE_TAGS = 4;
export const MAX_RECOMMENDATION_DISHES = 8;
// The old free-text `note` was 500 chars and required; now a short optional
// remark, since the structured fields above carry the main content.
export const MAX_RECOMMENDATION_COMMENT_LENGTH = 100;

// Flat list for the Mongoose/zod enums — the union of every program's options.
// Cast to a non-empty tuple (rather than `as const`) since it's built at
// runtime from Object.values(...).flat() — zod's z.enum() requires that shape.
export const YEARS = [...new Set(Object.values(YEAR_OPTIONS_BY_PROGRAM).flat())] as [
  string,
  ...string[],
];

// Events (src/models/Event.ts, src/models/EventRSVP.ts) — generic "list a
// happening, others RSVP" activities (e.g. a cricket match), distinct from
// Trip: no fare/vehicle/seat-race machinery, open RSVP instead of host
// approval. See docs/SPEC.md's Events section.
export const EVENT_CATEGORIES = ["sports", "social", "academic", "other"] as const;
export const EVENT_CATEGORY_LABELS: Record<(typeof EVENT_CATEGORIES)[number], string> = {
  sports: "Sports",
  social: "Social",
  academic: "Academic",
  other: "Something else",
};

export const EVENT_STATUSES = ["open", "full", "cancelled", "completed"] as const;
// Mirrors ACTIVE_TRIP_STATUSES — still joinable or full but not yet
// completed/cancelled, used for the per-host active-event cap below.
export const ACTIVE_EVENT_STATUSES = ["open", "full"] as const;

export const MAX_EVENT_TITLE_LENGTH = 100;
export const MAX_EVENT_DESCRIPTION_LENGTH = 500;
// Longer than Trip's MAX_ADVANCE_DAYS (30) — an event like a fest may
// reasonably be planned further out than a ride ever is.
export const MAX_EVENT_ADVANCE_DAYS = 60;
// Same reasoning as MAX_ACTIVE_TRIPS_PER_HOST — keeps a host from
// accumulating an unbounded number of simultaneous listings.
export const MAX_ACTIVE_EVENTS_PER_HOST = 5;
