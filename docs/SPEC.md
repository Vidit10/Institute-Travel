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

Self-driving students are explicitly not a target — see [out of scope](#20-explicitly-out-of-scope).

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
  girls-only flag, expected fare, status (open/full/cancelled/completed), plus
  `direction`/`listingType`/`travelType` (see [§22](#22-phase-2-local-campus-city-trips)).
- **JoinRequest** — a rider's request to join a trip: status (pending/accepted/declined/expired),
  expiry time.
- **ArrivalIntent** — a lightweight arrivals-board entry (see [§11](#11-arrivals-board) and
  [§22](#22-phase-2-local-campus-city-trips)).
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
6. **Requests auto-expire** (currently 15 hours, or the trip's departure time if sooner) if
   the host never responds — the rider is notified their request expired so they can look
   elsewhere instead of assuming they're in.

This flow depends on the host being notified and responsive quickly, since everything is
time-sensitive (a train doesn't wait). Push notifications and expiry are load-bearing for
this flow to not feel broken — not optional polish.

**Concurrency**: seat capacity is checked and decremented atomically at accept-time (a single
`findOneAndUpdate` with a `seatsRemaining > 0` condition), so two near-simultaneous accepts
can never overbook the last seat.

## 6. Trip creation rules

- **Vehicle** is a fixed dropdown (Auto Rickshaw, Cab 5-seater, Cab 7-seater, Tum Tum).
  Selecting one auto-fills `totalCapacity` from a recommended-capacity table — the host can
  still edit the number afterward, it's a smart default, not a lock. Two separate tables:
  `RECOMMENDED_CAPACITY` (long-distance, reduced from the vehicle's max for luggage room —
  Auto 2, 5-seater 3, 7-seater 5, Tum Tum 7) and `LOCAL_RECOMMENDED_CAPACITY` (local trips
  have no such luggage constraint, closer to real seating — Auto 4, 5-seater 5, 7-seater 8,
  Tum Tum 10), both in `src/lib/constants.ts`. Switching trip type re-derives the number from
  whichever table applies. The "reduced for luggage" caption only makes sense for the
  long-distance table and is hidden for local trips.
- **Party size**: host enters `numTravelers` (their own party size, including themselves)
  instead of manually subtracting from capacity — seats are reserved from `numTravelers` at
  creation. The form no longer collects companion emails to pre-register fellow travellers;
  when `numTravelers > 1` it just nudges the host to have their friends onboard the app
  themselves. The backend (`CompanionInvite`, `resolveCompanions` — an email matching an
  existing, **already-onboarded** account auto-linked, anything else (no account, or an
  account that only ever signed in and never finished onboarding) getting a copyable claim
  link instead) still exists and still works if a caller supplies `companionEmails`, just no
  longer required to match `numTravelers - 1` exactly — it's optional pre-registration, not
  part of the standard flow. The onboarded check matters: a `User` row is created the instant
  someone signs in with Google, before they've set a phone/gender/year/program — auto-linking
  on email alone could silently turn that half-signed-up row into a "confirmed" rider with
  none of that set, breaking the phone-reveal and girls-only checks and rendering as literal
  `"undefined"` wherever their year/program is displayed. The claim-link path forces
  onboarding first (same auth+onboarding gate as every other page) before they can become a
  real rider.
- **Fare**: host enters a numeric total fare (required). Per-person share is shown live at
  creation and on the trip page, recalculating as riders are accepted. There's no
  payment/settlement inside the app — this is informational only, for splitting the fare
  outside the app.
- **Minimum party size**: a trip must leave at least one seat open (`numTravelers < totalCapacity`)
  — listing yourself with zero room for anyone else is rejected.
- **Advance window**: trips can only be created for departures within the next 30 days,
  and must be in the future. The date field defaults to today (still editable) rather than
  blank, since most listings are same-day.
- **Default time (local trips only)**: the time picker defaults to 9:00 PM for `to-campus`
  and 2:00 PM for `from-campus` (`defaultTime()` in `src/app/trips/new/page.tsx` and
  `src/components/ArrivalForm.tsx`) — a convenience nudge toward the times people actually
  tend to travel, always overridable. Long-distance trips keep a plain 9:00 AM default, since
  that flow's time is dictated by a train/flight/bus, not a daily routine.
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

For the original long-distance, semester-start arrival flow (`listingType: "long-distance"`,
`direction: "to-campus"`), destination is fixed to **IIT Dharwad Hostels** — no selector
shown, unchanged from V1. Phase 2's local flow uses a different location pairing — see
[§22](#22-phase-2-local-campus-city-trips).

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
discovery board, not a booking: once a group looks worth combining, anyone in it can
convert it into a real Trip listing, which is where the actual concurrency-safe seat/fare/
consent machinery lives.

There is no standalone `/arrivals` page — this board lives directly on the home page, behind
a 3-way tab switcher (`src/components/ArrivalsTabs.tsx`) that renders one
`src/components/ArrivalsBoard.tsx` instance at a time for the active tab, see §12. A prior
version had a single page trying to be both the long-distance board and the local day-to-day
board at once (trip-type chips, direction chips, location chips, and a form all stacked) —
split into three focused sections when the board first moved to the home page, then (once all
three stacked at once turned out to be its own "too much to scroll past" problem) collapsed
back into tabs so only one section renders at a time. `ArrivalsBoard` itself is unchanged by
this — it's just how many instances are mounted simultaneously.

- **One active entry per person, full stop** — a person can only be arriving/heading out at
  one place at a time, across *every* section. Posting in one section replaces whatever was
  active anywhere else; if that's about to happen, the post form says so first.
  Posting again, even at a different location, replaces the existing entry rather than
  adding a second.
- Fields: pickup location, date/time, mode (optional, long-distance only), girls-only
  (female users only).
- **Browsing is the default view, posting is behind a button** — each section leads with
  who's already posted, not a form; "Post my status" reveals `ArrivalForm` inline. The two
  local sections' overview always collapses to a single whole-route bucket (route-based
  matching, §22) with no location chips to click — there's only ever one thing to browse.
  The long-distance section keeps per-location chips (its locations aren't a single route)
  and a live people-count per location, refreshing automatically roughly every 30 seconds
  while the page is open.
- Entries are grouped by proximity to a reference time — an "exact" match (within ~30
  minutes) and a looser "nearby" match (within ~3 hours) — the same clustering logic powers
  the home feed's own time/location search.
- An entry expires automatically a short grace period after its own arrival time passes.
- **Optional train/flight number**, mirroring the fields on a Trip listing — lets someone
  browsing double-check they've got the right person before reaching out.
- **Location clustering** (long-distance only): a small set of nearby-but-distinct pickup
  points (Court Circle, Jubilee Circle, Dharwad New Bus Stand, Dharwad Railway Station) can
  be expanded into on request — "Didn't find enough people? Look around your surroundings" —
  using the same exact/nearby time windows as everything else (not every date/time at that
  location). Never shown for locations outside a defined cluster, and never merged into the
  default results automatically; opt-in only. See `LOCATION_CLUSTERS` in
  `src/lib/constants.ts`. Not defined for the two local sections — their route-based
  matching (§22) already covers the equivalent ground natively.
- **"Create a trip for this group"** (turning a cluster of arrivals-board posts directly
  into a Trip listing) is not available from these sections — dropped when the board moved
  onto the home page, to keep each section to "post or browse," not a third action.

## 12. Home page & navigation

- **Home page**: a personalized greeting, then a **quick actions row** (§23 — bus tracker,
  SAM portal, ID card; small/secondary, not the page's main content), then the arrivals board
  as a 3-way tab switcher ahead of everything else — "Are you outside right now?" (local,
  to-campus), "Heading out?" (local, from-campus), and "Going home or coming back?"
  (long-distance, with its own to-campus/from-campus toggle — kept as a separate tab rather
  than folded into the local toggle, since it's a different-enough use case — once/twice a
  semester, its own location list — that merging it back in would recreate the clutter the
  split was meant to fix; see §11), plus a "Already booked a vehicle? List it →" button below
  the tabs. Below a divider, the full open-trips feed is shown by default under a "Browse all
  trips" heading, with a time/location search collapsed behind a toggle rather than always
  visible. This structure (quick actions → primary arrivals/list action → de-emphasized
  browse-everything feed) replaced an earlier version that stacked all three arrivals sections
  plus the feed in one long scroll with no visual hierarchy.
- **Mobile** (below the `sm` breakpoint): a fixed bottom tab bar — Home, Recommendations, a
  center "List a trip" action, My Rides, Account. (Arrivals no longer has a tab — it's not a
  standalone page anymore, see §11 — and Recommendations, previously reachable only via the
  Account menu, took the freed slot.)
- **Desktop/tablet**: a simplified top nav — brand, one primary "List a trip" CTA,
  notification bell, theme toggle, Account. Low-frequency actions (including
  Recommendations) live inside the Account item, shared between both nav layouts via one
  component so they can't drift apart.
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

## 16. Post-trip reviews

Sent after a trip's departure time passes and it's automatically marked `completed` (the
same cron that expires stale join requests) — a short, optional check-in for the host and
every accepted rider, distinct from the general Feedback inbox ([§14](#14-feedback)) since
this is structured survey data tied to one trip and one person, not a free-text blob.

- Four questions: did the trip happen as planned (yes/no), roughly how much splitting the
  ride saved vs. going alone (₹, optional), would you use CoRide again (yes/no/maybe), and
  an optional open comment.
- Reachable two ways: a push notification linking to `/trips/[id]/review`, and — since not
  everyone has push enabled — a dismissible in-app popup on the home page for anyone with an
  unreviewed completed trip. Only one popup shows at a time; see [§18](#18-invite-friends-nudge).
- One review per person per trip (a `TripReview` document, unique on `{tripId, userId}`).
- Feeds a real, self-reported "money saved" figure on the admin dashboard, explicitly kept
  separate from — not a replacement for — the modeled estimate ([§10](#10-reference-fares)'s
  fare data run through `src/lib/adminMetrics.ts`), since early sample sizes are too small to
  trust alone.

## 17. Recommendations board

A simple, low-stakes board for restaurants, places to visit, and things to do — for anyone on
campus, not framed as a junior-only feature. Anyone can post or browse, grouped by category.
No visibility rules beyond the normal login gate (unlike trips/arrivals, there's no girls-only
or consent concern here). On mobile it's a bottom tab (it took the slot the Arrivals tab used
to occupy, once the arrivals board moved onto the home page — see §11/§12); on desktop it's
still reached via the Account menu, same as before.

- **Categories** (`RECOMMENDATION_CATEGORIES` in `src/lib/constants.ts`): Food & Dining,
  Leisure, Movies, Sightseeing, Something else.
- **Category-specific fields**, in addition to the shared name/area/map-link/short-comment
  fields — which fields show depends on category, validated per-category server-side
  (`recommendationFieldsSchema` in `src/lib/recommendationValidation.ts`, shared between the
  public create route and the admin edit-and-approve route so the rules can't drift apart):
  - **Food & Dining**: veg/non-veg/both (`FOOD_TYPES`), recommended dishes (comma-separated,
    up to `MAX_RECOMMENDATION_DISHES`), and "good for" tags.
  - **Leisure**: a type (`LEISURE_TYPES` — Cafe, Park/Outdoors, Games/Arcade, Shopping,
    Spa/Wellness, Sports/Fitness, Nightlife, Other) and "good for" tags.
  - **Sightseeing**: suggested trip length in days (`MAX_RECOMMENDATION_DAYS`) and "good for"
    tags.
  - **Movies / Something else**: no extra structured fields — Name/Area/Map link/comment
    already cover it.
  - **"Good for" tags** (`VIBE_TAGS_BY_CATEGORY`, up to `MAX_RECOMMENDATION_VIBE_TAGS` each):
    a different tag pool per category (e.g. Date/Birthday/Group hangout for food & leisure;
    Day trip/Trek/Historical-Heritage for sightseeing) — not one flat list, since a "vibe" tag
    that fits a restaurant doesn't fit a waterfall.
  - The old single 500-char required `note` is now a short **optional** comment, capped at
    `MAX_RECOMMENDATION_COMMENT_LENGTH` (100 chars) — the structured fields above carry the
    substance now, the comment is just a supporting remark.
- **Map link**: the raw URL the poster pastes, required on new posts (enforced in the API's
  zod schema — the Mongoose field itself stays optional so recommendations posted before
  this requirement still read fine), stored as-is and shown as a "View on Maps" link on the
  card — never fetched or scraped server-side. Auto-fetching richer place data (rating,
  photo) would need the Google Places API, which isn't free beyond a $200/month account-wide
  credit and needs a managed API key; deliberately not built.
- **Moderation queue**: new posts are created with `status: "pending"` and don't appear on the
  public board (`GET /api/recommendations` only ever returns `status: "approved"`) until an
  admin reviews them at `/admin/recommendations` (linked from the main `/admin` dashboard,
  with a pending count) — admin-only, gated the same way as every other admin route
  (`isAdminEmail`, re-checked server-side per `src/lib/admin.ts`). The admin can edit any
  field before approving — one action ("Approve & publish") saves the edits and publishes in
  one step, there's no separate draft-save step. Rejecting silently deletes the submission, no
  reason stored or shown to the submitter (kept low-friction for a low-stakes board — they can
  always resubmit). The submitter gets a push notification (`notifyUser`, same pattern as
  join-request notifications) once their post is approved and goes live. Documents posted
  before this queue existed default to `status: "approved"` (no migration needed — same
  backward-compatible-default pattern used everywhere else in this app) so nothing already
  live disappears retroactively.
- **Admin display name**: on the public board, if a post's author's email is in
  `ADMIN_EMAILS`, their name is replaced with `"Admin"` server-side before the response is
  sent (`GET /api/recommendations`) — the real name never reaches the client. The admin
  moderation queue itself still shows the real submitter name, since that view only ever
  reaches admins and masking there would just remove information from them for no benefit.
- **Share CTA** (`src/components/ShareCTA.tsx`): the same dismissible share nudge used
  elsewhere in the app, but with this page's own `pitch`/`path` — the actual shared message
  is contextual per surface (recommendations vs. trip pages), not one generic pitch
  everywhere. Free to vary: it's a static string per call site, computed at share-click time
  either way, no extra fetch or work.
- **Reporting**: the existing Feedback "report" category (§14) covers recommendations too —
  relabeled "Report a trip, user, or recommendation" rather than adding a fourth separate
  category, since the underlying context-label mechanism already works for any content type.

## 18. Invite-friends nudge

A cold-start problem: with only a fraction of the student body signed up so far, match
results can look thin — which reads as "the app doesn't work" rather than "not enough
people yet." A one-time popup (tracked server-side on `User.inviteFriendsPromptShown`, not
localStorage, so it survives a cleared browser or a new device) nudges an onboarded user to
invite friends, using the same Web Share API + clipboard-fallback pattern already used for
sharing a trip. Coordinates with the post-trip review popup ([§16](#16-post-trip-reviews))
so the two never stack — the review popup always gets first refusal.

## 19. (Removed) Beta: arriving right now

Was a minimal, skip-the-date/time-picker quick post for a spontaneous "I'm here, who's
around" moment. Removed once the homepage gained its own direct "Are you outside right now?"
entry point ([§22](#22-phase-2-local-campus-city-trips)) — that's now the one place this kind
of post happens, with a real pickup time (not an auto +10-minute placeholder), so the
stripped-down beta variant became a redundant second path to the same thing rather than a
distinct feature. `ArrivalForm`'s `quickMode` prop was removed along with it.

## 20. Explicitly out of scope

- Self-driving users as hosts/riders
- Bus last-mile leg matching
- In-app payments/settlement of fare
- Native mobile app (this is a mobile-first PWA)
- Paid live-tracking tier (free tier with graceful fallback only)

## 21. Known gaps

- No end-to-end (browser) test coverage yet — the Vitest suite covers data-layer logic only.
- No admin/moderation UI for feedback or abuse-log review — both are handled by a manual
  look at the database today. (Recommendations (§17) are the exception — the first content
  type in the app to get an actual moderation queue, at `/admin/recommendations`.)

## 22. Phase 2: local campus↔city trips

The original flow (§5–§7) solves getting to campus at the start of a semester — used a
handful of times a year. Phase 2 adds a second, everyday use case: short campus↔city hops,
meant to be used far more often. Rather than a separate system, `Trip` and `ArrivalIntent`
were generalized in place — every field added here is additive with a default matching V1's
exact prior behavior, so listings created before this change keep behaving identically with
no migration.

- **`direction`**: `"to-campus"` (default — V1's only prior meaning) or `"from-campus"`.
- **`listingType`**: `"long-distance"` (default — the original train/flight/bus flow, §5–§7)
  or `"local"` (new).
- Four valid `(listingType, direction)` combinations, each with its own location pairing:

  | listingType | direction | pickup ∈ | destination ∈ |
  |---|---|---|---|
  | long-distance | to-campus (original flow, unchanged) | `PICKUP_LOCATIONS` | fixed "IIT Dharwad Hostels" |
  | long-distance | from-campus | `CAMPUS_LOCATIONS` | `PICKUP_LOCATIONS` |
  | local | to-campus | `CITY_LOCATIONS` (or free text via "Others") | `CAMPUS_LOCATIONS` |
  | local | from-campus | `CAMPUS_LOCATIONS` | `CITY_LOCATIONS` (or free text via "Others") |

- **`travelType`** (Trip only, not ArrivalIntent): `"leisure"` (default — a 30–45 min delay
  might be expected) or `"professional"` (not more than 15 min expected). Informational only,
  shown as an expectation-setter — never enforced or matched against.
- `ArrivalIntent` gains the same `direction`/`listingType` fields. For `direction:
  "from-campus"`, its anchor location is the on-campus meeting point (`CAMPUS_LOCATIONS`)
  people waiting to pool an outbound ride would coordinate around — the same role city points
  like Court Circle play for the original to-campus flow. Still one active entry per user
  across every direction/listingType, unchanged from §11.

### Route-based matching (local flow only)

Unlike the long-distance flow's independent, exact-match locations, the local flow's two
location lists are real **ordered corridors** that a vehicle physically drives through — a
person at any stop between a host's pickup point and the route's far end is a valid match,
not just someone at the exact same stop. `CAMPUS_LOCATIONS`/`CITY_LOCATIONS` (`src/lib/
constants.ts`) are ordered arrays in the direction of travel:

- **City route** (`CITY_LOCATIONS`, minus the free-text `"Others"`): Inox (Smart City Mall) →
  Court Circle → Jubilee Circle → Old Bus Terminal Dharwad → New Bus Stand Dharwad → campus.
- **Campus route** (`CAMPUS_LOCATIONS`): Mess Block → A1 (Engineering Block) → CLT (Central
  Learning Theatre) → A2 (Sciences Block) → Main Gate.

The matching rule (`isOnTheWay()` in `src/lib/constants.ts`): a party at route index `r` is
compatible with a trip whose own pickup point is at index `p` iff `r >= p` — the vehicle
starts at `p` and only ever moves toward the far end, passing every stop from `p` onward. The
relevant route is resolved from `direction` alone (`CITY_LOCATIONS` for to-campus,
`CAMPUS_LOCATIONS` for from-campus) since `ArrivalIntent` only ever stores one anchor point,
never both legs of a trip.

Two matching modes:
- **Symmetric board browsing** (`GET /api/arrivals`, no vehicle committed yet): the arrivals-
  board overview collapses to a single whole-route bucket for a local combo (instead of one
  chip per stop), and selecting it shows every active entry on the corridor together, sorted
  by time proximity — automatic, no opt-in click needed (unlike the long-distance flow's
  cluster expansion, which stays opt-in via `LOCATION_CLUSTERS`/`getClusterMates`, untouched).
- **Directional** (`r >= p`, a real vehicle/direction exists): applied to (a) `GET /api/trips
  ?pickupLocation=` when browsing/searching by a rider's own location, and (b) a push
  notification — when a local trip is listed, every active `ArrivalIntent` "on the way" and
  time-proximate (via the existing `splitByProximity` exact/nearby windows) is notified via
  `notifyUser` (`src/lib/notify.ts`, the same fire-and-forget push pattern used for join-
  request notifications) that a ride is now available, capped at ~20 recipients. The reverse
  (notifying a host about a new nearby arrivals-board post) is deliberately not built —
  deferred to avoid notification spam from casual browsing posts.
- Homepage (§12) leads with the tabbed `ArrivalsBoard` switcher (§11), ahead of the open-trips
  feed — post *and* browse inline, not just a count or a link out to another page.
- The homepage's collapsible time/location search also got a trip-type/direction selector,
  same pattern as the arrivals board and trip creation form, so it can search local trips too
  (its location dropdown switches between `PICKUP_LOCATIONS`/`CAMPUS_LOCATIONS`/
  `CITY_LOCATIONS` depending on the selected combo) — it isn't long-distance-only anymore.
- `/trips/new` shows a second nudge (alongside the existing same-trip duplicate nudge) for
  local trips: "N people on this route might want to join," querying the arrivals board's
  directional mode against the draft trip's own pickup + chosen time.

## 23. Quick actions (bus tracker, SAM portal, ID card)

A small row of secondary, frequent off-app actions (`src/components/QuickActions.tsx`),
placed on the home page directly below the greeting — not in the bottom tab bar, which is
reserved for the app's 5 core sections (§12).

- **Bus tracker**: opens the institute bus GPS tracker
  (`https://peg-iitdh.github.io/EDL2025-GPSTracker/HTML/Bus_Tracking.html`) in a new tab.
  Just a link — no integration.
- **SAM portal**: opens `https://sam.iitdh.ac.in/` (the outing-registration portal students
  must use before leaving campus) in a new tab. No auto-login: institute Google SSO has no
  session-handoff mechanism into a third-party portal, and iframing it would risk both
  breakage (frame/CSP headers) and looking like credential phishing. Users log in there
  themselves, same as if they'd navigated there directly.
- **ID card** (`src/components/IDCardViewer.tsx`, `src/lib/idCardStore.ts`): lets a user save
  a photo of their ID card for quick access when a security guard asks to see it on the way
  out. Stored **only on-device**, in IndexedDB — never uploaded to this app's server or any
  third party. Upload/replace/remove is also reachable from Settings. Tapping "Show my ID"
  opens it full-screen on a pure-white background and requests a Screen Wake Lock
  (`navigator.wakeLock`) to stop the screen sleeping mid-scan. This is **not** real brightness
  control — there is no web API for that on any platform — it's the same visual trick
  boarding-pass apps use (a bright white screen tends to read better and often nudges a
  phone's own auto-brightness up); the UI copy says so rather than overpromising.

## 24. Events

A generalization of the underlying "list something, others join it" idea beyond rides — e.g.
listing a cricket match. Deliberately a **separate model from Trip**, not a generalization of
it: Trip's fare/vehicle/seat-concurrency and girls-only machinery is ride-specific and doesn't
fit a generic activity. Reachable from the Account menu (`/events`), same starting point
Recommendations had before it was promoted to a bottom-tab slot — no bottom-tab-bar changes in
this pass.

- **Open RSVP, no host approval** — unlike Trip's request/accept flow, joining an event is
  immediate. There's no `JoinRequest`-style pending state; `EventRSVP` existence *is* "going,"
  and leaving deletes the doc outright rather than flipping a status.
- **Fields**: title, optional description, category (`EVENT_CATEGORIES`: Sports, Social,
  Academic, Something else), location (free text — an event's venue isn't drawn from a small
  closed set the way Trip's pickup locations are), optional map link (raw URL, shown as-is,
  same pattern as Recommendation's `mapLink`), start time (must be in the future, within
  `MAX_EVENT_ADVANCE_DAYS` — 60, longer than Trip's 30-day window since something like a fest
  may be planned further out), and an optional capacity (unset = unlimited).
- **RSVP for a group**: like Trip's `numTravelers`, an RSVP carries a `partySize` — you can
  RSVP for your own group, not just yourself.
- **Capacity is claimed atomically**, same concurrency-safe pattern as Trip's seat count (a
  conditional `findOneAndUpdate` guards against overbooking): a party's `partySize` is
  deducted from `spotsRemaining` only if enough spots remain, and the event flips to `full`
  at zero. Leaving an event releases those spots back and flips `full` back to `open`. A
  capacity-less event skips this step entirely — always joinable until the host cancels it or
  it completes.
- **Publishes immediately — no pre-moderation queue.** Events are time-bound and functional
  like Trips/Arrivals, not evergreen content like Recommendations, so they follow the Trips
  precedent: live the moment they're created, with the existing "Report a trip, user,
  recommendation, or event" Feedback category as the after-the-fact safety valve instead of a
  pending-review gate.
- **Full RSVP-list visibility, no phone reveal**: the host and every RSVP'd participant see
  the same list (name/year/program) via `GET /api/events/[id]`. There's no consent-gated
  contact-info reveal the way Trip has for accepted riders — there's no accept/decline step to
  gate it on, and it wasn't asked for.
- **No girls-only toggle for v1** — that's a Trip/Arrivals safety feature specifically for
  late-night travel coordination; not carried over to generic events unless a real need for it
  comes up later.
- **Cancellation**: host-only, notifies every RSVP'd participant (capped at ~20, same
  reasoning as the arrivals-board notify fan-out). No post-event review — that's Trip-specific
  and wasn't ported over.
- **Completion**: the existing cron (`src/app/api/cron/expire-requests/route.ts`) flips events
  whose start time has passed to `completed` in the same run it already completes trips —
  no second cron added.
- **Explicitly not built (deferred, not forgotten)**: pre-publish moderation, editing an event
  after creation (cancel-and-relist is the precedent, same as Trip), and any bottom-tab-bar
  placement beyond the Account menu link.
