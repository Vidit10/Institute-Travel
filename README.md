# CoRide — ride-sharing for IIT Dharwad students

A lightweight, campus-only platform that helps IIT Dharwad students find each other when
travelling to/from campus (train, flight, or bus) and split a cab — without the awkwardness
of posting in a WhatsApp group and hoping someone replies in time.

**Live discovery, consent-gated coordination.** A host lists their trip (vehicle, time,
pickup point, seats available); other students request to join; the host accepts or
declines; only on acceptance do phone numbers get shared.

This project is being built in public. Follow the journey, or jump straight to contributing.

## Status

Early build — core flow (Google sign-in, onboarding, trip listing, join requests,
accept/decline, push notifications) is implemented. See [docs/SPEC.md](docs/SPEC.md) for
the full product spec and [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) if you want to help
build it.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) — deployed on [Vercel](https://vercel.com)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) via Mongoose
- [Auth.js](https://authjs.dev) with Google OAuth, restricted to `@iitdh.ac.in`
- Web Push (VAPID) for notifications — installable as a PWA, no native app needed
- [PostHog](https://posthog.com) for product analytics

## Getting started locally

```bash
npm install
cp .env.example .env.local   # fill in the values — see docs/DEPLOYMENT.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Access

Restricted to `@iitdh.ac.in` Google accounts — this is a campus-only tool, not a public product.

## License

[MIT](LICENSE)
