# CoRide — Product Spec

**Motto:** Campus travel, simplified — for IIT Dharwad.

This describes the app as it currently behaves. It's a living document — when a feature
changes, this file changes with it in the same PR, rather than being left to drift.

---

## 1. Problem

Students returning to IIT Dharwad travel via train, flight, or bus, and have no easy way to
discover others on campus arriving around the same time/place to split a cab. This is a
**discovery** problem, not a coordination problem — once two people know about each other,
they coordinate themselves. CoRide solves discovery + consent-gated contact sharing.

Self-driving students are explicitly not a target — see [out of scope](#12-explicitly-out-of-scope).

## 2. Access

- IIT Dharwad students only, gated by Google OAuth, domain-restricted to `@iitdh.ac.in`. No
  separate email/OTP verification layer — Google login is sufficient proof of identity.
- No general public access, no manual approval step.

## 3. Onboarding & profile

Collected once at first login, most fields editable later from Settings:

| Field | Type | Editable later? |
|---|---|---|
| Name | string, from Google profile | No — locked after onboarding |
| Gender | `female` \| `male` | No — locked after onboarding (used only for the girls-only feature) |
| Phone number | string | Yes — shown to other users only after mutual consent on a specific trip |
| Year | enum, depends on program | Yes |
| Program | `UG` \| `PG` \| `PhD` | Yes |
| Default contact-sharing consent | boolean | Yes — can be overridden per-trip |

Year options depend on the selected program (not a flat shared list): UG → 1st–5th year,
PG → 1st/2nd year, PhD → 1st–5th year (each also offers "Others"). Changing program resets
the year selection since the old value may not be valid for the new list. See
`src/lib/constants.ts` (`PROGRAMS`, `YEAR_OPTIONS_BY_PROGRAM`, `YEAR_LABELS`) for the single
source of truth both onboarding and settings read from.

Onboarding is a two-step flow: fill in → review summary → confirm.

**Fixing a locked field:** name and gender have no self-serve edit path, but mistakes happen
(a misclicked gender option, a name typo carried over from Google). The Settings page links
directly to a dedicated feedback category (`profile_correction`, see [§14](#14-feedback))
prefilled with the user's current values, so there's an actual path to a fix instead of a
dead end. It's a manual fix (read out of the Feedback collection, not an automated flow) —
the copy sets that expectation, including that the user should sign out and back in
afterward once it's applied.

## 4. Core entities

- **User** — profile fields above + auth identity + settings.
- **Trip** — a host's listing: mode (train/flight/bus), vehicle type, pickup location,
  destination, departure time, optional train/flight number, capacity, seats remaining,
  girls-only flag, expected fare, status (open/full/cancelled/completed).
- **JoinRequest** — a rider's request to join a trip: status (pending/accepted/declined/expired),
  expiry time.
- **ArrivalIntent** — a lightweight arrivals-board entry (see [§11](#11-arrivals-board)).
- **Feedback** — a category + message, optionally linked to a specific trip/user/entry.
- **CompanionInvite** — a claim link for a companion without an account yet.
- **PushSubscription** — a device's web-push endpoint.

## 5. Ride-matching flow

1. **Host books their own travel first**, then creates a Trip listing (vehicle, time, pickup,
   capacity, fare).
2. The listing appears in everyone's home feed.
3. Interested riders send a **join request** on that trip.
4. Host **accepts or declines** each request.
5. Only on **accept**: phone numbers are revealed between host and that specific rider
   (subject to each user's contact-sharing consent setting), and the trip's remaining-seats
   count is atomically decremented.
6. **Requests auto-expire** (currently 6 hours) if the host never responds — the rider is
   notified their request expired so they can look elsewhere instead of assuming they're in.

This flow depends on the host being notified and responsive quickly, since everything is
time-sensitive (a train doesn't wait). Push notifications and expiry are load-bearing for
this flow to not feel broken — not optional polish.

**Concurrency**: seat capacity is checked and decremented atomically at accept-time (a single
`findOneAndUpdate` with a `seatsRemaining > 0` condition), so two near-simultaneous accepts
can never overbook the last seat.

## 6. Trip creation rules

- **Vehicle** is a fixed dropdown (Auto Rickshaw, Cab 5-seater, Cab 7-seater, Tum Tum), each
  with a recommended-capacity hint (comfort/luggage-based, not enforced).
- **Party size + companion invites**: host enters `numTravelers` (their own party size,
  including themselves) instead of manually subtracting from capacity. For each additional
  person, the host provides an `@iitdh.ac.in` email. An email matching an existing account
  is auto-linked (an accepted request, no separate approval step). An email with no account
  yet gets a copyable claim link the host shares themselves — visiting it while signed in
  with a matching account claims the reserved seat. Seats are reserved from `numTravelers` at
  creation regardless of whether companions have accounts yet.
- **Fare**: host enters a numeric total fare (required). Per-person share is shown live at
  creation and on the trip page, recalculating as riders are accepted. There's no
  payment/settlement inside the app — this is informational only, for splitting the fare
  outside the app.
- **Minimum party size**: a trip must leave at least one seat open (`numTravelers < totalCapacity`)
  — listing yourself with zero room for anyone else is rejected.
- **Advance window**: trips can only be created for departures within the next 30 days,
  and must be in the future.
- **Active-trip cap**: a host can have at most 5 trips with status `open`/`full` at once —
  cancel one or wait for one to complete before listing another.
- **Duplicate nudge**: while filling the form, if an open trip already exists from the same
  pickup location around the same time, a dismissible banner links to it. It's a nudge, not
  a gate — the host can still list their own trip regardless.
- Listing has a review-before-confirm step, same pattern as onboarding.
- Cancelling a trip uses an in-app confirmation (not the browser's native `confirm()`).

## 7. Pickup locations & destination

Fixed list (`PICKUP_LOCATIONS` in `src/lib/constants.ts`): Jubilee Circle, Court Circle,
Dharwad New Bus Stand, Dharwad Railway Station, Hubli Railway Station, Hubli Airport,
Belagavi Airport.

Destination is fixed to **IIT Dharwad Hostels** — no selector shown.

Bus riders being dropped at a stand and needing a last-mile leg (auto/jubilee) is a known,
acknowledged gap — not solved.

## 8. Live tracking (train/flight)

No free official IRCTC API exists, and flight-tracking APIs have small free tiers that are
likely to run out exactly during peak return-travel windows. Approach:

- User optionally enters their train number or flight number.
- A server-side route attempts a live-status lookup against a free-tier API.
- On success: shows live ETA/delay. On failure or quota exhaustion: falls back silently to
  whatever the user entered — never a broken/blank state.
- All third-party API calls happen server-side only, so keys are never exposed to the client.

## 9. Girls-only option

- If the host (or arrivals-board poster) is marked as female, they get a "Girls only" toggle.
- When enabled, only users marked female can see or request to join that trip / see that
  arrivals-board entry — hidden from the feed entirely for everyone else, not just
  visible-but-blocked.
- Per-listing toggle, not a platform-wide mode. A one-time Settings preference lets a female
  user default their arrivals-board posts to girls-only, still overridable per post.

## 10. Reference fares

A per-route reference price table (e.g. "Hubli Airport → Campus: ~₹600–1000") is shown on
the trip detail page as a decision aid. Not enforced, not matched against, not a
pricing/payment feature — no money changes hands inside the app.

## 11. Arrivals board

A lightweight "I'm arriving around here, around then" signal for people who haven't
committed to a specific vehicle yet — deliberately has no vehicle, fare, or capacity. It's a
discovery board, not a booking: once a cluster looks worth combining, anyone in it can
convert it into a real Trip listing, which is where the actual concurrency-safe seat/fare/
consent machinery lives.

- **One active entry per person, full stop** — a person can only be arriving at one place at
  a time. Posting again, even at a different location, replaces the existing entry rather
  than adding a second.
- Fields: pickup location, date/time, mode (optional), girls-only (female users only).
- **Browse by location**: shows a live people-count per location, refreshing automatically
  roughly every 30 seconds while the page is open.
- Entries are grouped by proximity to a reference time — an "exact" match (within ~30
  minutes) and a looser "nearby" match (within ~3 hours) — the same clustering logic powers
  the home feed's own time/location search.
- An entry expires automatically a short grace period after its own arrival time passes.
- This is also the app's landing-page focus: the home page shows either your current
  arrival status (with a one-tap way to change it) or the logging form directly, ahead of
  the trip feed below it.

## 12. Home page & navigation

- **Home page**: the arrivals section (§11) is the primary focus at the top — either your
  current status or the form to post one. Below it, the full open-trips feed is shown by
  default, with a time/location search collapsed behind a toggle rather than always visible.
- **Mobile** (below the `sm` breakpoint): a fixed bottom tab bar — Home, Arrivals, a center
  "List a trip" action, My Rides, Account.
- **Desktop/tablet**: a simplified top nav — brand, one primary "List a trip" CTA,
  notification bell, theme toggle, Account. Low-frequency actions live inside the Account
  item, shared between both nav layouts via one component so they can't drift apart.
- **My Rides**: `/trips/mine` (hosting) and `/trips/requested` (requested) are presented as
  one "My Rides" concept via a shared tab-link component, even though they remain separate
  routes.

## 13. Notifications

- **Push** (web-push/VAPID via service worker, since this is a PWA) for time-critical
  events: new join request, request accepted/declined, request expiring soon.
- **In-app notification bell** (polling, ~25s) surfaces the same events for users browsing
  without push enabled.
- Push is the only notification channel — no email is sent by this app.

## 14. Feedback

A native in-app page (`/feedback`, stored in Mongo), not an external form link. Categories:
recommendation, bug, report a trip/user, fix a locked profile field (§3), something else.
Read-only today — every category still needs a manual look to act on.

## 15. Rate limiting / abuse protection

Application-level, not network-level DDoS mitigation (that's the hosting platform's job): a
per-user sliding window across mutating endpoints (create trip, send/respond to a request,
cancel a trip, submit feedback, post an arrival); exceeding it triggers a temporary lockout,
logged separately for review.

## 16. Explicitly out of scope

- Self-driving users as hosts/riders
- Bus last-mile leg matching
- In-app payments/settlement of fare
- Native mobile app (this is a mobile-first PWA)
- Paid live-tracking tier (free tier with graceful fallback only)

## 17. Known gaps

- No end-to-end (browser) test coverage yet — the Vitest suite covers data-layer logic only.
- No admin/moderation UI for feedback or abuse-log review — both are handled by a manual
  look at the database today.
