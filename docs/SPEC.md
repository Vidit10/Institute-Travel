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
- **In-app notification bell** (polling, see section 15) surfaces the same events for users browsing without push enabled.
- Push-only. Email is not a notification channel for this app (see section 16 — email was dropped as a communication medium entirely).

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

## 15. Second review pass

- **Minimum party size**: a trip must leave at least one seat open (`numTravelers < totalCapacity`) — listing yourself with zero room for anyone else is rejected.
- **Advance window widened to 30 days** (`MAX_ADVANCE_DAYS`, was 72 hours) — still a floor of "must be in the future."
- **Time-of-day picker replaced** with explicit Hour / Minute (5-minute steps) / AM-PM dropdowns instead of relying on the browser's native `datetime-local` control.
- **Trip listing now has a review-before-confirm step**, same pattern as onboarding.
- **Shareable trip link**: a Share/Copy button on the trip page using the Web Share API with a clipboard fallback. Since every route is already login-gated, this is just the existing trip URL — no separate public link exists. This closed a real gap: the login page previously ignored any `callbackUrl` middleware attaches when redirecting an unauthenticated visit, so a shared link would have dropped a signed-in user at the home feed instead of the trip; fixed by having the sign-in button read and forward `callbackUrl`.
- **Notification bell** (`src/components/NotificationBell.tsx`): polls `/api/notifications` every ~25s. Backed by two new booleans on `JoinRequest` — `hostSeen` (default false — new pending request is news to the host) and `riderSeen` (default true — a rider doesn't need telling about their own action, flips false whenever the request is accepted/declined/expired, or the trip is cancelled). Marking seen happens only when the bell dropdown is opened; per-page badges (e.g. the "New" tag on `/trips/requested`) read the same flags without clearing them. This is polling, not real-time push — no websocket/Pusher infrastructure was introduced.
- **Application-level rate limiting** (`src/lib/rateLimit.ts`, not network-level DDoS mitigation — that's the hosting platform's job): per-user sliding window (20 requests/minute) across the mutating endpoints (create trip, send/respond to a request, cancel a trip, submit feedback); exceeding it triggers a 15-minute lockout with a witty rejection message, logged to a separate `AbuseLog` collection.
- **Loading screen**: a shared `LoadingScreen` component (spinner + a random rotating fact) replaces bare "Loading..." text across the app.
- **Footer restructured**: "Made with ❤️ — for the IIT Dharwad Fraternity", plus GitHub and Feedback links moved here from the nav bar (nav bar no longer shows them).

## 16. Email channel removed

- **Decision: no email is sent by this app anymore.** Push (web-push/VAPID) remains the only notification channel — see section 10. The `nonEssentialEmailOptIn` onboarding/settings toggle was removed entirely since it no longer governs anything.
- The one exception is the companion-invite flow, which no longer emails a claim link either — it now generates a copyable/shareable invite link instead (see the trip-creation companion-invite feature for details).

## 17. Mobile-native navigation restructure

The app is used on phones the large majority of the time, so navigation was rebuilt to follow
native-mobile-app conventions on small screens rather than a shrunk-down desktop nav:

- **Bottom tab bar** (below the `sm` breakpoint), replacing the top hamburger menu: Home,
  Arrivals, a center elevated "List a trip" action, My Rides, Account. Fixed, always visible.
- **Simplified desktop/tablet top nav**: `Brand | List a trip | 🔔 🌙 Account` — one primary
  CTA instead of two competing ones, with low-frequency actions tucked into the Account item.
- **"Who's arriving" dropped as a persistent nav item** — it's promoted via a banner on the
  home page and reachable from the bottom tab bar's Arrivals tab, so a dedicated nav label
  was redundant.
- **`/trips/mine` and `/trips/requested` merged into one "My Rides" concept** (Hosting /
  Requested tabs) — both routes still exist (a shared `RidesTabs` component just links
  between them), fixing the naming ambiguity between "my trips" and "my requests" without a
  data-layer change.
- **One shared Account panel** (`src/components/AccountMenu.tsx`: My Rides, Settings, Sign
  out) rendered as a desktop dropdown or a mobile bottom sheet depending on context — the
  content lives in exactly one place so the two triggers can't drift apart.
- **Home feed search collapsed** behind a "Search by time/location ▾" toggle instead of five
  always-visible controls — most visits just need the banner + feed.
- **Install prompt moved from fixed-bottom to fixed-top** (`src/components/InstallPrompt.tsx`),
  since fixed-bottom now collides with the new tab bar.

## 18. Locked-profile correction request flow

Name and gender are locked after onboarding (section 14) with no self-serve edit path — but
mistakes happen (a misclicked gender option, a name typo carried over from the Google
profile), and there was previously no way to fix one short of a raw database edit requested
outside the app.

- **New feedback category, `profile_correction`** (`/feedback`): lets a user describe the
  correct name/gender. The Settings page links to it directly next to the locked fields,
  prefilling the context label with the user's current (wrong) values so whoever applies the
  fix knows the before-state.
- **No automated processing** — same as every other feedback category, this is read directly
  in Mongo, not surfaced through an admin UI (see CONTRIBUTING.md's "Good first issues" for
  the general admin-UI gap). The copy sets the expectation that a fix isn't instant: allow
  24–48 hours for someone to apply it, and sign out and back in afterward so any part of the
  UI still reading from the cached session (rather than a fresh `/api/settings` fetch) picks
  up the new value.

## 19. Admin dashboard

A single-page, desktop-oriented dashboard at `/admin` for tracking product usage — separate
from the PostHog analytics in section 11, and deliberately not dependent on it (no external
API call at request time, just the app's own MongoDB data).

- **Access**: gated by `ADMIN_EMAILS`, a comma-separated env var (not a database role) —
  keeps admin status out of the `User` schema entirely. In practice the current admin address
  is a normal `@iitdh.ac.in` account, so it signs in and onboards exactly like any other
  student — `ADMIN_EMAILS` just additionally unlocks `/admin` for it. The env var still
  accepts *any* email provider (it bypasses the domain restriction in the `signIn` callback
  as an OR condition, not an AND), so a non-institute admin remains possible later without a
  code change — see the "known friction" note below if that's ever used. Enforced in three
  places: the `signIn` callback (who's even allowed to authenticate at all), `src/middleware.ts`
  (redirect-before-render for `/admin/*`, and it runs *before* the onboarding-gate check, so
  `/admin` is reachable even for an admin who hasn't onboarded), and `/api/admin/metrics`
  itself (re-checks the session server-side, independent of the middleware layer) — the same
  "server enforces, an earlier redirect alone is not enough" posture already used for
  consent-gated contact info.
- **Known friction (only relevant for a future non-institute admin)**: the Google provider
  always sends the `hd=iitdh.ac.in` hint on sign-in (see section 2), which nudges Google's
  account chooser toward institute accounts. An admin signing in with a personal email may
  need "Use another account" rather than picking it straight from the chooser — a UX wrinkle,
  not a security gap (the `hd` param was never the enforcement boundary; the `signIn`
  callback is). Doesn't apply to the current `@iitdh.ac.in` admin account.
- **Metrics shown**, all computed live from Mongo: total/onboarded users, weekly/monthly
  active users (from a new `lastLoginAt` field on `User`, set once per sign-in), trips
  created (total, by mode, 30-day trend), join-request accept rate, girls-only usage (trips
  + arrivals board), program distribution, and an estimated money-saved figure.
- **Money saved is a modeled estimate, not a real figure** — the app has no payment data.
  Per trip with 2+ current travelers on a route with a known reference fare (section 9,
  excludes the one "TBD" route): every rider but the host is assumed to have otherwise paid
  the full reference-fare midpoint alone, instead paying an equal share of the actual fare;
  the difference is summed across all non-cancelled trips. See
  `src/lib/adminMetrics.ts` (unit-tested in `tests/adminMetrics.test.ts`) for the exact
  formula — worth reading before quoting the number anywhere it needs to be defended.
- **Feedback**, grouped by category, most recent first within each group — read-only for v1
  (see section 18 for the categories, including `profile_correction`).
- **Rate-limit lockouts**, not "DDoS attempts" — shown under that label deliberately. There is
  no network-level DDoS detection in this app (see CONTRIBUTING.md); what's shown is
  `AbuseLog`, the record of users who tripped the per-user rate limit (section 15). Calling
  it DDoS monitoring would overclaim what the app actually does.
