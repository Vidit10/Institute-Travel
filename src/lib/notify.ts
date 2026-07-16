import { User } from "@/models/User";
import { PushSubscription } from "@/models/PushSubscription";
import { sendPush } from "@/lib/webpush";
import { sendEmail } from "@/lib/email";

// Sends both push and email for a transactional event (essential per docs/SPEC.md
// section 10 — email always sends regardless of the user's non-essential-email
// toggle; that toggle only governs non-essential/marketing mail, which doesn't
// exist yet). Best-effort: failures here must never break the calling flow.
export async function notifyUser(
  userId: string,
  { title, body, url }: { title: string; body: string; url: string }
) {
  const [userDoc, subs] = await Promise.all([
    User.findById(userId).select("email").lean(),
    PushSubscription.find({ userId }),
  ]);
  const user = userDoc as unknown as { email?: string } | null;

  await Promise.all([
    ...subs.map((sub) => sendPush(sub, { title, body, url })),
    user?.email ? sendEmail(user.email, title, body) : Promise.resolve(),
  ]);
}
