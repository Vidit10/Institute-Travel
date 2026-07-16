import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient() {
  const key = process.env.POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    });
  }
  return client;
}

// Server-side event capture for the PM metrics listed in docs/SPEC.md section 11.
// No-ops silently if POSTHOG_KEY isn't set, so analytics is never a hard dependency.
export function track(distinctId: string, event: string, properties?: Record<string, unknown>) {
  getClient()?.capture({ distinctId, event, properties });
}
