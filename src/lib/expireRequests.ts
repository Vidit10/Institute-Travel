import { JoinRequest } from "@/models/JoinRequest";

// Belt-and-suspenders alongside the hourly Vercel Cron (src/app/api/cron/expire-requests):
// flips any pending request past its expiresAt to "expired" right before it's read or
// acted on, so a rider/host never sees a stale "pending" state just because the cron
// hasn't swept yet. Cheap (single indexed updateMany), safe to call on every read.
export async function sweepExpired(filter: Record<string, unknown> = {}) {
  await JoinRequest.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() }, ...filter },
    { status: "expired" }
  );
}
