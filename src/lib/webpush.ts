import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not set. Generate with `npx web-push generate-vapid-keys` and add to .env.local."
    );
  }
  webpush.setVapidDetails(
    "mailto:admin@iitdh.ac.in",
    publicKey,
    privateKey
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Best-effort: a failed push should never break the calling flow (e.g. accepting
// a request should still succeed even if the notification fails to deliver).
export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
) {
  try {
    ensureConfigured();
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error("push notification failed", err);
  }
}
