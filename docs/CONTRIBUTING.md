# Contributing to CoRide

Thanks for considering contributing. This doc is the detailed reference for anyone who
wants to fork, run locally, or send a PR — the root [README.md](../README.md) stays short
on purpose; this is where the real detail lives.

## Project motto

**Campus travel, simplified — for IIT Dharwad.** Every feature decision should serve that:
solving discovery + safe coordination for students travelling to/from campus, without
turning into a general-purpose ride-sharing app. See [SPEC.md](SPEC.md) for what's in
scope and what's explicitly deferred.

## Architecture overview

- **Framework**: Next.js App Router. All pages under `src/app`, API routes co-located as
  `route.ts` files under `src/app/api/**`.
- **Database**: MongoDB Atlas via Mongoose. Models live in `src/models/`:
  - `User` — profile + onboarding + settings fields
  - `Trip` — a host's listing
  - `JoinRequest` — a rider's request to join a trip (pending/accepted/declined/expired)
  - `ArrivalIntent` — a lightweight "I'm arriving around here, around then" board entry
    (see the arrivals-board bullet below)
  - `TripReview` — a post-trip check-in, one per `{tripId, userId}` (see the post-trip
    reviews bullet below)
  - `Recommendation` — a restaurant/place-to-visit board entry, no relation to Trip/ArrivalIntent
  - `PushSubscription` — web-push endpoints per user
  - `AbuseLog` — rate-limit lockout records (see the rate-limiting bullet below)
  - **No data-deletion cron, and don't add one for "cleanup."** The existing cron
    (`src/app/api/cron/expire-requests/route.ts`) only ever flips status
    (`pending`→`expired`, `open`→`completed`) — nothing in this app deletes historical
    documents. On the free M0 tier, storage isn't a real constraint for a long time (see
    DEPLOYMENT.md's MongoDB Atlas section for the numbers), and historical `Trip`/
    `JoinRequest` data has value beyond its original purpose — don't add a job that deletes
    it without a real, specific reason.
- **Auth**: Auth.js (`next-auth`) with the Google provider, restricted server-side to
  `@iitdh.ac.in` emails in `src/lib/auth.ts` — the `hd` param on the provider is just a UX
  hint to Google's account chooser, the actual enforcement is the `signIn` callback.
- **Middleware** (`src/middleware.ts`): redirects any authenticated-but-not-onboarded user
  to `/onboarding` before they can touch the rest of the app.
- **Concurrency**: seat capacity is claimed with an atomic
  `findOneAndUpdate({ seatsRemaining: { $gt: 0 } }, { $inc: { seatsRemaining: -1 } })` at
  accept-time (see `src/app/api/trips/[id]/requests/[requestId]/route.ts`) — this is
  intentional and should not be "simplified" into a read-then-write, since that reintroduces
  the overbooking race it exists to prevent.
- **Consent-gated contact info**: a user's phone number is only ever included in an API
  response if the requester is the host and the rider's request was accepted, or vice versa
  — see the visibility logic in `src/app/api/trips/[id]/route.ts`. Any change touching
  contact info must preserve this — don't just return the full user object.
- **Notifications**: `src/lib/notify.ts` sends Web Push (VAPID, `src/lib/webpush.ts`,
  `public/sw.js`) for every essential event — request sent/accepted/declined/expired/trip
  cancelled/post-trip review nudge. Best-effort and swallows failures — a failed
  notification must never break the underlying accept/decline/request flow. Push is the
  only notification channel; email was removed as a communication medium entirely (see
  SPEC.md's notifications section). The one remaining use of `src/lib/email.ts` is the
  companion-invite claim-link email in `src/lib/companionInvites.ts`, superseded by a
  copyable link for the same flow.
- **The expiry cron does three things now**, not just request expiry
  (`src/app/api/cron/expire-requests/route.ts`): expires stale `JoinRequest`s, flips
  departed trips to `completed`, and — for trips *newly* flipped to `completed` in that same
  run — pushes a post-trip review nudge to the host and every accepted rider. It finds
  candidates before updating them (not a blind `updateMany`) specifically so it knows which
  trips are newly completed and doesn't re-notify on every subsequent cron run.
- **Live tracking** (`src/app/api/tracking/route.ts`): best-effort only. If no API key is
  configured, or the provider call fails, it returns `{ live: false }` and the UI should
  fall back to the user's self-reported ETA/train/flight number — never show a broken state.
- **Analytics**: `src/lib/analytics.ts` wraps PostHog server-side capture; no-ops silently
  if `POSTHOG_KEY` isn't set, so analytics is never a hard dependency for local dev.
- **Rate limiting** (`src/lib/rateLimit.ts`): application-level abuse protection, not
  network-level DDoS mitigation — that's the hosting platform's job. A per-user sliding
  window across mutating endpoints; exceeding it logs to `AbuseLog` and triggers a temporary
  lockout.
- **Navigation**: `src/components/NavBar.tsx` renders a simplified top nav on `sm`+ and
  mounts `BottomTabBar.tsx` (fixed, mobile-only) below it. Both surfaces share one
  `AccountMenu.tsx` for Settings/My Rides/Sign out — extend that component, don't add a
  second copy of its links to either trigger. `/trips/mine` and `/trips/requested` stay
  separate routes, tied together only by the `RidesTabs.tsx` link pair.
- **Arrivals board** (`src/models/ArrivalIntent.ts`, `src/components/ArrivalForm.tsx`,
  `src/app/arrivals/`): a person can only have **one active entry at a time**, enforced by a
  partial unique index on `{ userId }` (not per-location) — posting again, even at a
  different location, replaces the existing entry rather than adding a second. The form
  component is shared between the home page and `/arrivals`; don't duplicate its fields or
  submit logic in either place. `ArrivalForm` also takes a `quickMode` prop (skips the
  date/time picker, posts ~10 minutes out) used by the beta "arriving right now" flow —
  same backend, no separate endpoint.
- **Location clustering** (`LOCATION_CLUSTERS`, `getClusterMates()` in `src/lib/constants.ts`):
  opt-in only — `/api/arrivals`'s detail route only fetches cluster-mate entries when the
  client explicitly passes `includeCluster=true`, and always filters them through the same
  `splitByProximity` exact/nearby time windows used everywhere else. Don't merge cluster
  results into the default exact/nearby response, and don't drop the time filtering — an
  earlier version of this sorted cluster entries by proximity but forgot to actually exclude
  far-off ones, which defeated the point.
- **Active-trip cap** (`MAX_ACTIVE_TRIPS_PER_HOST` in `src/lib/constants.ts`): a host can
  have at most 5 trips with status `open`/`full` at once, enforced server-side in
  `POST /api/trips`. Raise the constant if this ever needs to change — don't special-case
  around it elsewhere.
- **Post-trip reviews** (`src/models/TripReview.ts`, `src/app/api/trips/[id]/review/`,
  `src/app/api/trips/pending-review/`): triggered by the cron above; surfaced via push *and*
  a home-page popup (`PostTripReviewPrompt.tsx`) for users without push enabled. Feeds
  `src/lib/adminMetrics.ts`'s real (self-reported) savings figures on the admin dashboard —
  kept visually and semantically separate from the modeled estimate there, not blended in.
- **Invite-friends nudge** (`InviteFriendsPrompt.tsx`, `User.inviteFriendsPromptShown`):
  server-tracked, not localStorage — the point is "once ever," which a client-only flag
  can't guarantee across devices/cleared browsers. Coordinates with
  `PostTripReviewPrompt` via an `onResolved` callback on the home page so the two popups
  never stack; the review prompt always gets first refusal. If you add a third home-page
  popup, extend that same coordination rather than letting popups race independently.
- **Recommendations** (`src/models/Recommendation.ts`, `src/app/api/recommendations/`,
  `src/app/recommendations/`): intentionally the simplest surface in the app — no
  visibility rules, no relation to any other model. Reachable only from the Account menu.
- **Feedback categories** (`src/models/Feedback.ts`, `src/app/api/feedback/route.ts`,
  `src/app/feedback/page.tsx`): a fixed enum kept in sync across all three files — there's no
  resolve/dismiss action yet, so every category (including `profile_correction`, see
  SPEC.md's feedback section) still ultimately needs a manual look in Mongo to act on.

## Local setup

```bash
git clone <this-repo>
cd coride
npm install
cp .env.example .env.local
```

Fill in `.env.local` — at minimum you need `MONGODB_URI`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
and `NEXTAUTH_SECRET` to sign in and use the app at all. See [DEPLOYMENT.md](DEPLOYMENT.md)
for where to get each of these. Everything else (push, analytics, live tracking) degrades
gracefully without keys.

```bash
npm run dev
```

## Conventions

- TypeScript, strict mode. Don't add `any` casts where a real type will do — the existing
  `as unknown as {...}` casts on Mongoose `.lean()` results are a known workaround for
  Mongoose's weak lean-query typing, not a pattern to copy elsewhere without reason.
- Fixed lists (pickup locations, destinations, trip modes, request statuses) live in
  `src/lib/constants.ts` — extend there, don't hardcode a new list somewhere else.
- Keep girls-only and consent-gating logic server-side (in the API route), never
  client-only — the client UI hiding something is not the same as the API refusing to
  return it.

## Sending a PR

1. Open an issue first for anything non-trivial (new feature, schema change) so we can
   agree on direction before you invest time.
2. Keep PRs scoped to one change. Reference the SPEC.md section it relates to if applicable.
3. Run `npm run build` locally before opening the PR — it type-checks and lints as part of
   the Next.js build.
4. Run `npm test` — a `mongodb-memory-server`-backed Vitest suite in `tests/` covers the
   accept/decline concurrency logic, request expiry, and the partial unique index (see
   `tests/tripRequests.test.ts`). No real MongoDB Atlas connection needed to run it.
5. Add or update a test if you touch `src/lib/tripRequests.ts` or `src/lib/expireRequests.ts`
   — these are the two places correctness actually matters (seat-race safety, expiry).

## Good first issues

- End-to-end tests (Playwright) for the full browser flow — the current Vitest suite only
  covers the data-layer logic, not the UI.
- Real app icons — `public/icon.svg` is a placeholder mark; a proper logo (and PNG
  variants for platforms that don't support SVG manifest icons) would help.
- Bus last-mile leg matching (explicitly deferred in SPEC.md — open for discussion on design).
- Netlify Scheduled Function equivalent of the Vercel Cron request-expiry sweep (see
  DEPLOYMENT.md) if Netlify becomes the primary deployment target.
