"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key && !posthog.__loaded) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        capture_pageview: true,
      });
    }
  }, []);

  // Ties client-side events (pageviews) to the same distinct ID the backend
  // uses for track() calls (src/lib/analytics.ts, keyed by User._id) — without
  // this, a signed-in user's pageviews and their backend events (trip
  // created, request accepted, etc.) would show up as two unrelated people
  // in PostHog instead of one person's timeline.
  useEffect(() => {
    if (session?.user?.id && posthog.__loaded) {
      posthog.identify(session.user.id);
    }
  }, [session?.user?.id]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
