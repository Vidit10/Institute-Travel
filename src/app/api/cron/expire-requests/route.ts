import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { JoinRequest } from "@/models/JoinRequest";
import { Trip } from "@/models/Trip";
import { ArrivalIntent } from "@/models/ArrivalIntent";
import { notifyUser } from "@/lib/notify";
import { ARRIVAL_INTENT_GRACE_MINUTES } from "@/lib/constants";

// Marks pending requests past their expiresAt as "expired" and notifies each rider
// exactly once (docs/SPEC.md section 5: "the rider is notified their request
// expired so they can look elsewhere"). Invoked by Vercel Cron (see vercel.json) —
// protected by CRON_SECRET so it can't be triggered publicly.
//
// Note: the lazy sweep in src/lib/expireRequests.ts (called on every trip read)
// deliberately does NOT notify — only this cron does, so a rider isn't emailed
// every time someone happens to load the trip page after the deadline passed.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const toExpire = await JoinRequest.find({
    status: "pending",
    expiresAt: { $lt: new Date() },
  });

  if (toExpire.length > 0) {
    await JoinRequest.updateMany(
      { _id: { $in: toExpire.map((r) => r._id) } },
      { status: "expired", riderSeen: false }
    );

    await Promise.all(
      toExpire.map((r) =>
        notifyUser(r.riderId.toString(), {
          title: "Request expired",
          body: "The host didn't respond in time — look for another trip.",
          url: "/trips/requested",
        })
      )
    );
  }

  // Mark trips whose departure time has passed as completed, so they stop
  // showing up as joinable/actionable anywhere in the app. Found first (not
  // just updateMany'd) so we know exactly which trips newly completed, to
  // nudge their participants toward a post-trip review exactly once.
  const newlyCompleted = await Trip.find({
    status: { $in: ["open", "full"] },
    departureTime: { $lt: new Date() },
  });

  if (newlyCompleted.length > 0) {
    await Trip.updateMany(
      { _id: { $in: newlyCompleted.map((t) => t._id) } },
      { status: "completed" }
    );

    const acceptedRequests = await JoinRequest.find({
      tripId: { $in: newlyCompleted.map((t) => t._id) },
      status: "accepted",
    });
    const ridersByTrip = new Map<string, string[]>();
    for (const r of acceptedRequests) {
      const key = r.tripId.toString();
      const riders = ridersByTrip.get(key) || [];
      riders.push(r.riderId.toString());
      ridersByTrip.set(key, riders);
    }

    await Promise.all(
      newlyCompleted.flatMap((trip) => {
        const tripId = trip._id.toString();
        const participantIds = [trip.hostId.toString(), ...(ridersByTrip.get(tripId) || [])];
        return participantIds.map((userId) =>
          notifyUser(userId, {
            title: "Thanks for riding with CoRide 🙌",
            body: "Got 2 minutes? We'd love to hear how your trip went.",
            url: `/trips/${tripId}/review`,
          })
        );
      })
    );
  }

  const completedResult = { modifiedCount: newlyCompleted.length };

  // Arrival-board entries past their own arrival time (plus a grace window)
  // stop being useful signal — sweep them the same way as trips.
  const arrivalCutoff = new Date(Date.now() - ARRIVAL_INTENT_GRACE_MINUTES * 60 * 1000);
  const expiredArrivals = await ArrivalIntent.updateMany(
    { status: "active", arrivalTime: { $lt: arrivalCutoff } },
    { status: "expired" }
  );

  return NextResponse.json({
    expired: toExpire.length,
    completed: completedResult.modifiedCount,
    expiredArrivals: expiredArrivals.modifiedCount,
  });
}
