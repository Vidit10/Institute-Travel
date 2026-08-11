// One-off cleanup for the companion-auto-accept bug fixed in
// src/lib/companionInvites.ts: before that fix, a companion email matching
// ANY existing User row (even one that only ever signed in and never
// finished onboarding) got auto-accepted onto a trip. This script finds every
// still-accepted JoinRequest whose rider hasn't finished onboarding and
// reverts it to the same state the fixed code would have created: the seat
// is released back to the trip, the bad JoinRequest is removed, and (for
// trips that are still active) a CompanionInvite claim link takes its place
// so the host's original intent isn't lost — that person can claim the seat
// themselves once they actually onboard. The host is notified either way.
//
// Defaults to a dry run (reports what it would do, changes nothing). Pass
// --apply to actually write. Run with: node scripts/backfill-unonboarded-companions.mjs [--apply]

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import webpush from "web-push";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const INVITE_EXPIRY_DAYS = 7;

// --- Load .env.local manually (this script runs outside the Next.js runtime,
// which is what normally loads it) ---
function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:admin@iitdh.ac.in", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Minimal schemas — just the fields this script touches, `strict: false` so
// reading/writing doesn't clash with fields the real app models declare that
// aren't relevant here.
const User = mongoose.model("User", new mongoose.Schema({}, { strict: false, collection: "users" }));
const Trip = mongoose.model("Trip", new mongoose.Schema({}, { strict: false, collection: "trips" }));
const JoinRequest = mongoose.model("JoinRequest", new mongoose.Schema({}, { strict: false, collection: "joinrequests" }));
const CompanionInvite = mongoose.model("CompanionInvite", new mongoose.Schema({}, { strict: false, collection: "companioninvites" }));
const PushSubscription = mongoose.model("PushSubscription", new mongoose.Schema({}, { strict: false, collection: "pushsubscriptions" }));

async function notifyHost(hostId, body) {
  const subs = await PushSubscription.find({ userId: hostId }).lean();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title: "One of your riders needs to finish signing up", body, url: "/trips/mine" })
      );
    } catch (err) {
      console.error(`  ! push to host ${hostId} failed:`, err.message);
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "campus_travel" });
  console.log(`Connected. Mode: ${APPLY ? "APPLY (writing changes)" : "DRY RUN (no changes)"}\n`);

  const accepted = await JoinRequest.find({ status: "accepted" }).lean();
  console.log(`Checking ${accepted.length} accepted join request(s)...\n`);

  let affected = 0;
  let reverted = 0;
  let skippedFinished = 0;

  for (const jr of accepted) {
    const rider = await User.findById(jr.riderId).lean();
    if (!rider || rider.onboarded) continue; // fine — either onboarded, or rider was deleted (separate issue)

    affected++;
    const trip = await Trip.findById(jr.tripId).lean();
    if (!trip) {
      console.log(`- JoinRequest ${jr._id}: rider ${rider.email} not onboarded, but trip ${jr.tripId} no longer exists — skipping.`);
      continue;
    }

    const tripLabel = `${trip.pickupLocation} → ${trip.destination} @ ${new Date(trip.departureTime).toLocaleString()}`;
    const active = trip.status === "open" || trip.status === "full";

    if (!active) {
      console.log(`- Trip "${tripLabel}" (${trip.status}): rider ${rider.email} not onboarded. Trip already ${trip.status} — removing the stale request only, no seat/invite changes.`);
      skippedFinished++;
      if (APPLY) {
        await JoinRequest.deleteOne({ _id: jr._id });
      }
      continue;
    }

    console.log(`- Trip "${tripLabel}" (${trip.status}): rider ${rider.email} not onboarded. Releasing seat + leaving a claim link.`);
    reverted++;

    if (APPLY) {
      await JoinRequest.deleteOne({ _id: jr._id });

      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(
        Math.min(new Date(trip.departureTime).getTime(), Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      );
      await CompanionInvite.create({
        tripId: trip._id,
        invitedByHostId: trip.hostId,
        email: rider.email,
        token,
        status: "pending",
        expiresAt,
      });

      await Trip.updateOne(
        { _id: trip._id },
        { $inc: { seatsRemaining: 1 }, $set: { status: "open" } }
      );

      await notifyHost(
        trip.hostId,
        `${rider.name || rider.email} hasn't finished signing up yet — we've released their seat and left them a link to claim it once they do.`
      );
    }
  }

  console.log(`\nDone. ${affected} accepted request(s) from not-yet-onboarded riders found.`);
  console.log(`  ${reverted} on active trips ${APPLY ? "reverted (seat released, claim link created, host notified)" : "would be reverted"}.`);
  console.log(`  ${skippedFinished} on already-finished/cancelled trips ${APPLY ? "had their stale request removed" : "would just have the stale request removed"}.`);
  if (!APPLY) console.log("\nThis was a dry run — re-run with --apply to actually write these changes.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
