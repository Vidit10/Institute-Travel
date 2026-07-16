// Fixed list per docs/SPEC.md section 6 — extend here if scope grows beyond IIT Dharwad's immediate area.
export const PICKUP_LOCATIONS = [
  "Jubilee Circle",
  "Court Circle",
  "Dharwad New Bus Stand",
  "Dharwad Railway Station",
  "Hubli Railway Station",
  "Hubli Airport",
] as const;

export const DESTINATIONS = [
  "IIT Dharwad Main Gate",
  "IIT Dharwad Hostels",
] as const;

// Illustrative estimates only (docs/SPEC.md section 9) — informational, not enforced,
// and not matched against actual fares. Should be refined with real data over time.
export const REFERENCE_FARES: Record<string, string> = {
  "Jubilee Circle": "₹150–250",
  "Court Circle": "₹150–250",
  "Dharwad New Bus Stand": "₹200–300",
  "Dharwad Railway Station": "₹250–350",
  "Hubli Railway Station": "₹500–700",
  "Hubli Airport": "₹800–1100",
};

export const TRIP_MODES = ["train", "flight", "bus"] as const;

export const TRIP_STATUSES = ["open", "full", "cancelled", "completed"] as const;

export const REQUEST_STATUSES = ["pending", "accepted", "declined", "expired"] as const;

// How long a join request stays pending before auto-expiring if the host doesn't respond.
export const REQUEST_EXPIRY_HOURS = 6;

export const ALLOWED_EMAIL_DOMAIN = "iitdh.ac.in";
