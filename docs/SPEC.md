# Campus Travel Coordination Platform — Product Spec (V1)

**Motto:** Campus travel, simplified — for IIT Dharwad.

This is the settled specification, derived from brainstorming notes and a scoping discussion. It supersedes the earlier draft — every open question in that draft has a decision recorded here.

---

## 1. Problem

Students returning to IIT Dharwad travel via train, flight, or bus, and have no easy way to discover others on campus arriving around the same time/place to split a cab. This is a **discovery** problem, not a coordination problem — once two people know about each other, they coordinate themselves. V1 solves discovery + consent-gated contact sharing.

Self-driving students are explicitly **not** a V1 target (per the notes' "Target X" — deferred, not solved now).

## 2. Target users & access

- IIT Dharwad students only, gated by **Google Workspace OAuth**, domain-restricted to `@iitdh.ac.in`. No separate email/OTP verification layer — Google login is sufficient proof of identity.
- No general public access, no manual admin approval step.

## 3. Onboarding (first login only)

Collected once, editable later from Settings:

| Field | Type | Notes |
|---|---|---|
| Name | string | from Google profile, editable |
| Gender | enum | used only for the girls-only toggle feature |
| Phone number | string | shown to other users only after mutual consent on a specific trip |
| Year | enum | e.g. 1st–4th (UG), 1st/2nd (PG) |
| Program | enum | UG / PG |
| Non-essential email notifications | boolean toggle | opt-in/opt-out at onboarding; **transactional emails (request accepted/declined) always send regardless of this toggle** |
| Default contact-sharing consent | boolean | can be overridden per-trip |

All of the above are editable later under **Settings**.

## 4. Core entities (data model preview — full schema in ARCHITECTURE.md)

- **User** — profile fields above + auth identity.
- **Trip (listing)** — created by a host:
  - Mode: train / flight / bus
  - Vehicle type on arrival at campus: e.g. Nischayan / Cab / Tumtum (free text or small fixed list)
  - Pickup location (fixed list, see §6)
  - Destination: IIT Dharwad Main Gate **or** IIT Dharwad Hostels
  - Date/time (self-reported ETA; see §7 for live tracking)
  - Train number / flight number (optional, for tracking)
  - Total capacity, seats remaining
  - Girls-only flag (see §8)
  - Reference fare shown to viewers (see §9)
  - Status: open / full / cancelled / completed
- **Request** — a rider asking to join a trip:
  - Status: pending / accepted / declined / expired
  - Created-at, expiry time
- **Event log** (analytics) — see §11.

## 5. Ride-matching flow (request → host approves)

1. **Host books their own travel first**, then creates a Trip listing (vehicle, time, pickup, destination, capacity).
2. Listing appears in everyone's home feed.
3. Interested riders send a **join request** on that trip.
4. Host **accepts or declines** each request.
5. Only on **accept**: phone numbers are revealed between host and that specific rider (subject to each user's contact-sharing consent setting), and the trip's remaining-seats count is atomically decremented.
6. **Requests auto-expire** (e.g. after a configurable window, or at trip time, whichever is sooner) if the host never responds — the rider is notified their request expired so they can look elsewhere instead of assuming they're in.

**Known trade-off, accepted deliberately:** this flow depends on the host being notified and responsive quickly, since everything is time-sensitive (a train doesn't wait). Push notifications (§10) and expiry are load-bearing for this flow to not feel broken — not optional polish.

**Concurrency requirement:** seat capacity must be checked and decremented atomically at accept-time (e.g. a single `findOneAndUpdate` with a `seatsRemaining > 0` condition), so two near-simultaneous accepts can never overbook the last seat.

## 6. Pickup locations (V1 fixed list)

- Jubilee Circle
- Court Circle
- Dharwad New Bus Stand
- Dharwad Railway Station
- Hubli Railway Station
- Hubli Airport

Destinations are fixed to: IIT Dharwad Main Gate, IIT Dharwad Hostels.

Bus riders being dropped at a stand and needing a last-mile leg (auto/jubilee) is a **known, acknowledged gap** — not solved in V1.

## 7. Live tracking (train/flight)

No free official IRCTC API exists, and flight-tracking APIs (e.g. AviationStack) have small free tiers that are likely to run out exactly during peak return-travel windows. V1 approach:

- User optionally enters their train number or flight number.
- Server-side route attempts a live-status lookup against a free-tier API.
- On success: show live ETA/delay.
- On failure or quota exhaustion: **fall back silently** to whatever the user entered (train/flight number, self-reported ETA) — never a broken/blank state.
- All third-party API calls happen server-side only, so keys are never exposed to the client.

This can be upgraded to a paid tier later if usage justifies it — no rebuild required, just swapping/adding a provider behind the same lookup route.

## 8. Girls-only option (V1, included)

- If the host is marked as female (from onboarding gender field), they get a toggle on trip creation: **"Girls only"**.
- When enabled, only users marked female in their profile can see/request to join that specific trip (or: are shown a clear "girls only" label and blocked from requesting — exact enforcement point to confirm during build).
- This is a per-trip toggle, not a platform-wide mode.

## 9. Reference rates (informational only)

- A per-route reference price table (e.g. "Hubli Airport → Campus: ~₹250–350") shown to users when creating or viewing a trip, purely as a decision aid.
- **Not enforced, not matched against, not a pricing/payment feature.** No money changes hands inside the app.

## 10. Notifications

- **Push** (web-push/VAPID via service worker, since this is a PWA) for time-critical events: new join request, request accepted/declined, request expiring soon.
- **Email** for the same transactional events, always sent regardless of the user's non-essential-email toggle (that toggle only suppresses non-critical emails, e.g. digest/marketing-style messages, not "your ride was accepted").

## 11. Analytics (PM metrics — personal use)

Instrumented via PostHog (free tier). Baseline events to track from day one:
- Sign-up completed / onboarding completed (activation rate)
- Trip created (by mode: train/flight/bus)
- Join request sent
- Request accepted / declined / expired (and time-to-response)
- Time from trip creation to "full"
- Girls-only toggle usage rate
- Retention across return-to-campus windows (semester start/end spikes expected)
- Contact-reveal consent opt-in rate

## 12. Explicitly out of scope for V1

- Self-driving users as hosts/riders (Target X — deferred)
- Bus last-mile leg matching
- In-app payments/settlement of fare
- Native mobile app (V1 is a mobile-first PWA)
- Paid live-tracking tier (start on free tier with graceful fallback)

## 13. Open items to confirm during build (not blocking, but flagged)

- Exact enforcement point for girls-only visibility (hidden from feed entirely vs. visible-but-blocked).
- Expiry window length for pending requests (fixed duration vs. tied to trip time).

## 14. First-draft review revisions (post-launch-draft feedback)

Superseding the relevant parts of sections 3, 6, 8, 9 above:

- **Name and gender are locked after onboarding** — shown read-only in Settings, not editable. Year/program/phone remain editable.
- **Program enum**: `UG`, `PG`, `PhD` (renamed from Masters/Doctoral). **Year depends on the selected program** (not a flat shared list): UG → 1st–5th year (`UG-1..5`), PG → 1st/2nd year (`PG-1/2`), PhD → `PhD-1..5` (labeled "PhD – Year N"); each also offers "Others". Choosing a different program resets the year selection since the old value may not be valid for the new list. See `src/lib/constants.ts` (`PROGRAMS`, `YEAR_OPTIONS_BY_PROGRAM`, `YEAR_LABELS`) for the single source of truth both onboarding and settings read from.
- **Destination is fixed** to IIT Dharwad Hostels for V1 — no selector shown; Main Gate is dropped entirely.
- **Vehicle is now a fixed dropdown**: Auto Rickshaw, Cab (5-seater), Cab (7-seater), Tum Tum — replacing free text. Each has a recommended-capacity estimate (comfort/luggage-based, not enforced) shown as a hint.
- **Party size + companion invites**: host enters `numTravelers` (their own party size, including themselves) instead of manually subtracting from capacity. For `numTravelers - 1` additional people, the host provides their `@iitdh.ac.in` emails. An email matching an existing account is auto-linked (an accepted request, no separate approval step). An email with no account yet gets emailed an invite link; visiting it while signed in with a matching account claims the reserved seat. Seats are reserved from `numTravelers` at trip creation regardless of whether companions have accounts yet.
- **Dynamic fare**: host enters a numeric `expectedFare` (required) instead of a free-text reference note. Per-person share (`expectedFare / current traveler count`) is shown live at creation and on the trip page, recalculating as riders are accepted.
- **Pre-dated listings capped**: trips can only be created for departures within the next 72 hours (see `MAX_ADVANCE_HOURS`).
- **Onboarding is now a two-step flow**: fill in → review summary → confirm. All fields mandatory, marked with `*`.
- **Feedback is a native in-app page** (`/feedback`, stored in Mongo), not an external form link.
- **Trip cancellation uses an in-app confirmation** (not the browser's native `confirm()`), with friendlier copy.
