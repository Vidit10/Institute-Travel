import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { JoinRequest } from "@/models/JoinRequest";
import { Trip } from "@/models/Trip";
import { notifyUser } from "@/lib/notify";

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
      { status: "expired" }
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
  // showing up as joinable/actionable anywhere in the app.
  const completedResult = await Trip.updateMany(
    { status: { $in: ["open", "full"] }, departureTime: { $lt: new Date() } },
    { status: "completed" }
  );

  return NextResponse.json({
    expired: toExpire.length,
    completed: completedResult.modifiedCount,
  });
}
