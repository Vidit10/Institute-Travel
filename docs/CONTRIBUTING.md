# Contributing to Campus Travel

Thanks for considering contributing. This doc is the detailed reference for anyone who
wants to fork, run locally, or send a PR — the root [README.md](../README.md) stays short
on purpose; this is where the real detail lives.

## Project motto

**Campus travel, simplified — for IIT Dharwad.** Every feature decision should serve that:
solving discovery + safe coordination for students travelling to/from campus, without
turning into a general-purpose ride-sharing app. See [SPEC.md](SPEC.md) for what's in
scope for V1 and what's explicitly deferred.

## Architecture overview

- **Framework**: Next.js App Router. All pages under `src/app`, API routes co-located as
  `route.ts` files under `src/app/api/**`.
- **Database**: MongoDB Atlas via Mongoose. Models live in `src/models/`:
  - `User` — profile + onboarding + settings fields
  - `Trip` — a host's listing
  - `JoinRequest` — a rider's request to join a trip (pending/accepted/declined/expired)
  - `PushSubscription` — web-push endpoints per user
  - `AbuseLog` — rate-limit lockout records (see the rate-limiting bullet below)
  - **No data-deletion cron, and don't add one for "cleanup."** The existing cron
    (`src/app/api/cron/expire-requests/route.ts`) only ever flips status
    (`pending`→`expired`, `open`→`completed`) — nothing in this app deletes historical
    documents. On the free M0 tier (512MB), this app's documents stay small enough (a few
    KB per user across every collection combined) that storage isn't a real constraint until
    somewhere around 8,000–15,000 users' worth of accumulated data — well past a single
    campus's population, indefinitely. More importantly, the admin dashboard's totals and
    trend charts (below) are sums over that same historical `Trip`/`JoinRequest` data —
    deleting "old" rows would quietly corrupt the exact numbers that dashboard exists to
    report. If a real constraint ever shows up, it'll be the 500-connection cap or shared
    CPU under a concurrent traffic spike, not storage.
- **Auth**: Auth.js (`next-auth`) with the Google provider, restricted server-side to
  `@iitdh.ac.in` emails (or an address listed in `ADMIN_EMAILS`, see below) in
  `src/lib/auth.ts` — the `hd` param on the provider is just a UX hint to Google's account
  chooser, the actual enforcement is the `signIn` callback.
- **Middleware** (`src/middleware.ts`): redirects any authenticated-but-not-onboarded user
  to `/onboarding` before they can touch the rest of the app — except `/admin`, which an
  admin address can reach regardless of onboarded status (checked before that redirect).
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
  cancelled. Best-effort and swallows failures — a failed notification must never break
  the underlying accept/decline/request flow. Push is the only notification channel; email
  was removed as a communication medium entirely (see docs/SPEC.md section 16). The one
  remaining use of `src/lib/email.ts` is the companion-invite claim-link email in
  `src/lib/companionInvites.ts`, which is being replaced with a copyable link separately.
- **Live tracking** (`src/app/api/tracking/route.ts`): best-effort only. If no API key is
  configured, or the provider call fails, it returns `{ live: false }` and the UI should
  fall back to the user's self-reported ETA/train/flight number — never show a broken state.
- **Analytics**: `src/lib/analytics.ts` wraps PostHog server-side capture; no-ops silently
  if `POSTHOG_KEY` isn't set, so analytics is never a hard dependency for local dev.
- **Navigation** (see SPEC.md section 17): `src/components/NavBar.tsx` renders a simplified
  top nav on `sm`+ and mounts `BottomTabBar.tsx` (fixed, mobile-only) below it. Both surfaces
  share one `AccountMenu.tsx` for Settings/My Rides/Sign out — extend that component, don't
  add a second copy of its links to either trigger. `/trips/mine` and `/trips/requested`
  stay separate routes, tied together only by the `RidesTabs.tsx` link pair.
- **Feedback categories** (`src/models/Feedback.ts`, `src/app/api/feedback/route.ts`,
  `src/app/feedback/page.tsx`): a fixed enum kept in sync across all three files — feedback
  itself has no resolve/dismiss action yet (read-only in the admin dashboard, see below), so
  every category (including `profile_correction`, see SPEC.md section 18) still ultimately
  needs a manual look in Mongo to act on.
- **Admin dashboard** (`src/app/admin/`, `src/app/api/admin/metrics/route.ts`, see SPEC.md
  section 19): access is env-driven via `ADMIN_EMAILS` (`src/lib/admin.ts`), not a `User`
  role — checked in the `signIn` callback, `src/middleware.ts`, and the metrics route itself.
  All metrics are computed straight from MongoDB at request time; there's no dependency on
  the PostHog integration. The money-saved figure is a modeled estimate
  (`src/lib/adminMetrics.ts`) — read the doc comment before changing the formula, it's
  unit-tested for a reason.

## Local setup

```bash
git clone <this-repo>
cd campus-travel
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
5. Add or update a test if you touch `src/lib/tripRequests.ts`, `src/lib/expireRequests.ts`,
   or `src/lib/adminMetrics.ts` — these are the places correctness actually matters
   (seat-race safety, expiry, and a money-saved figure that needs to stay defensible).

## Good first issues

- End-to-end tests (Playwright) for the full browser flow — the current Vitest suite only
  covers the data-layer logic, not the UI.
- Real app icons — `public/icon.svg` is a placeholder "CT" mark; a proper logo (and PNG
  variants for platforms that don't support SVG manifest icons) would help.
- Bus last-mile leg matching (explicitly deferred in SPEC.md — open for discussion on design).
- Netlify Scheduled Function equivalent of the Vercel Cron request-expiry sweep (see
  DEPLOYMENT.md section 10) if Netlify becomes the primary deployment target.
- A real admin UI for feedback (mark reviewed/resolved) and abuse-log review (unban a user
  early) — today both are read-only in `/admin` (see SPEC.md section 19) and any action still
  means editing MongoDB by hand.
