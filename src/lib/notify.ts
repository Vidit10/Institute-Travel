import { PushSubscription } from "@/models/PushSubscription";
import { sendPush } from "@/lib/webpush";

// Sends push for a transactional event (essential per docs/SPEC.md section 10).
// Email was removed as a notification channel — push (VAPID) is now the only
// channel. Best-effort: failures here must never break the calling flow.
export async function notifyUser(
  userId: string,
  { title, body, url }: { title: string; body: string; url: string }
) {
  const subs = await PushSubscription.find({ userId });

  await Promise.all(subs.map((sub) => sendPush(sub, { title, body, url })));
}
