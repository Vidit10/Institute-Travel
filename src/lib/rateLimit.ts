import { NextResponse } from "next/server";
import { RateLimitState } from "@/models/RateLimitState";
import { AbuseLog } from "@/models/AbuseLog";

// Application-level abuse protection — NOT network-level DDoS mitigation.
// Volumetric/network-layer attacks are handled by the hosting platform
// (Netlify's edge already does this); this only stops a signed-in user's
// script from hammering our own mutating endpoints.
const WINDOW_MS = 60_000; // 1 minute
const LIMIT_PER_WINDOW = 20; // generous for a real person, tight for a script
const BLOCK_DURATION_MS = 15 * 60_000; // 15 minutes

const WITTY_MESSAGE =
  "Slow down there — if you thought that was clever, it wasn't. Cooling off for 15 minutes.";

// Not perfectly atomic (a tiny race window exists between the read and the
// write below), which is fine here: the failure mode is "a couple of extra
// requests slip through," not "double-booked seats" — unlike the seat
// concurrency in src/lib/tripRequests.ts, this doesn't need a single atomic op.
export async function checkRateLimit(
  userId: string,
  userEmail: string,
  route: string
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  const now = new Date();
  const existingDoc = await RateLimitState.findById(userId).lean();
  const existing = existingDoc as unknown as {
    windowStart: Date;
    count: number;
    blockedUntil?: Date | null;
  } | null;

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return { allowed: false, message: WITTY_MESSAGE };
  }

  const windowExpired = !existing || existing.windowStart < new Date(now.getTime() - WINDOW_MS);

  if (windowExpired) {
    await RateLimitState.findByIdAndUpdate(
      userId,
      { windowStart: now, count: 1, blockedUntil: null },
      { upsert: true }
    );
    return { allowed: true };
  }

  const newCount = existing.count + 1;
  await RateLimitState.findByIdAndUpdate(userId, { $inc: { count: 1 } });

  if (newCount > LIMIT_PER_WINDOW) {
    const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
    await RateLimitState.findByIdAndUpdate(userId, { blockedUntil });
    await AbuseLog.create({
      userId,
      userEmail,
      route,
      reason: `exceeded ${LIMIT_PER_WINDOW} requests/${WINDOW_MS / 1000}s`,
    });
    return { allowed: false, message: WITTY_MESSAGE };
  }

  return { allowed: true };
}

// Convenience wrapper for API routes: returns a 429 NextResponse to return
// immediately if the user is rate-limited, or null if the request should proceed.
export async function rateLimitOrRespond(
  userId: string,
  userEmail: string,
  route: string
): Promise<NextResponse | null> {
  const result = await checkRateLimit(userId, userEmail, route);
  if (result.allowed) return null;
  return NextResponse.json({ error: result.message }, { status: 429 });
}
