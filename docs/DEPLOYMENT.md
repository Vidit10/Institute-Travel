# Deployment checklist

The codebase is fully written and builds locally (`npm run build` passes). What's left is
account creation and pasting a handful of keys — none of which can be done on your behalf,
so this is the morning-after checklist. Should take about 15–20 minutes total.

## 1. MongoDB Atlas (free, ~5 min)

1. Sign up / log in at https://cloud.mongodb.com.
2. Create a new project, then build a database → choose the **M0 Free** tier cluster.
3. Under **Database Access**, create a database user (username + password).
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) — fine for this scale;
   Vercel serverless functions don't have fixed IPs.
5. Click **Connect** → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Paste it into `.env.local` (and later, Vercel env vars) as `MONGODB_URI`.

## 2. Google OAuth client (free, ~5 min)

1. Go to https://console.cloud.google.com/apis/credentials (create a new project if you
   don't have one — name it something like "Campus Travel").
2. Configure the OAuth consent screen first if prompted: External user type is fine, app
   name "Campus Travel", your email as support/contact. You don't need Google verification
   for a small user base initially (a warning screen shows until verified — acceptable for
   a campus tool, or apply for verification later once this has more users).
3. Create **Credentials → OAuth client ID → Web application**.
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-vercel-domain>/api/auth/callback/google` (add after you deploy and know the domain)
5. Copy the **Client ID** and **Client Secret** into `.env.local` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

## 3. Auth secret

Generate one locally and paste into `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

(No `openssl`? Any random 32+ character string works — e.g. from a password manager.)

## 4. Web push (VAPID) — free, ~1 min

```bash
npx web-push generate-vapid-keys
```

Paste the output into `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and also copy the public key
into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value, needed on both server and client).

## 5. PostHog (optional, free tier)

Sign up at https://posthog.com, create a project, copy the project API key into
`NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_KEY`. Skip this entirely if you don't want analytics
yet — the app runs fine without it.

## 6. Live tracking (optional)

Sign up for a free-tier key at https://aviationstack.com if you want best-effort flight
status lookups, paste into `AVIATIONSTACK_API_KEY`. Train tracking has no wired-up provider
yet (no good free option exists) — leave `RAILWAY_API_KEY` blank; the app falls back to the
user's self-entered train number automatically.

## 7. App icon (optional upgrade)

`public/icon.svg` is a placeholder "CT" mark used by the manifest. It works fine for most
browsers, but Android's install prompt looks better with real PNGs (192x192 and 512x512) —
swap in a real logo later if you want.

## 8. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add every env var from your `.env.local` into the Vercel project's **Environment
   Variables** settings (Production + Preview).
4. Set `NEXTAUTH_URL` to your real Vercel URL (e.g. `https://campus-travel.vercel.app`).
5. Deploy. Then go back to the Google Cloud Console and add the real callback URL (step 2
   above) — Google login will fail with a redirect_uri_mismatch error until you do this.
6. If using the request-expiry cron (`vercel.json`), also set `CRON_SECRET` to a random
   string in Vercel env vars — Vercel automatically sends it as a bearer token when
   triggering the cron. Note: Vercel's Hobby (free) plan may restrict cron jobs to once/day
   rather than hourly — if so, requests will still show their real expiry time in the UI
   correctly, they just won't flip to "expired" status in the database until the next daily
   sweep. Upgrading to hourly sweeps (or checking `expiresAt` lazily at read-time) is listed
   as a good-first-issue in CONTRIBUTING.md.

Once deployed, sign in with an `@iitdh.ac.in` account and you're live.

## 9. Deploy to Netlify (secondary target)

Since Vercel is known to be flaky for some users on some networks, this repo also builds on
Netlify via `netlify.toml` (uses `@netlify/plugin-nextjs`, already in `package.json`).

1. https://app.netlify.com/start → pick the same GitHub repo.
2. Add the same env vars as Vercel under **Site settings → Environment variables**.
3. Set `NEXTAUTH_URL` to the Netlify domain instead, and add
   `https://<netlify-domain>/api/auth/callback/google` as an **additional** authorized
   redirect URI in Google Cloud Console (you can have both Vercel's and Netlify's URLs
   registered at once — Google allows multiple).
4. **Known gap:** the request-expiry cron (`vercel.json`) is Vercel-specific and won't run
   on Netlify. If Netlify becomes the primary deployment, that sweep needs to be
   reimplemented as a [Netlify Scheduled Function](https://docs.netlify.com/functions/scheduled-functions/)
   — not done yet, tracked as a good-first-issue.
