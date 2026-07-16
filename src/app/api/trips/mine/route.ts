import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { sweepExpired } from "@/lib/expireRequests";

// Trips the current user is hosting, plus a pending-request count for each —
// this is the dashboard a host needs to find their own listings again without
// scrolling the full public feed.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const tripsDocs = await Trip.find({ hostId: session.user.id })
    .sort({ departureTime: -1 })
    .lean();
  const trips = tripsDocs as unknown as Array<{ _id: string; [key: string]: unknown }>;

  await sweepExpired({ tripId: { $in: trips.map((t) => t._id) } });

  const counts = await JoinRequest.aggregate([
    { $match: { tripId: { $in: trips.map((t) => t._id) } } },
    { $group: { _id: { tripId: "$tripId", status: "$status" }, count: { $sum: 1 } } },
  ]);

  const pendingByTrip = new Map<string, number>();
  for (const c of counts) {
    if (c._id.status === "pending") {
      pendingByTrip.set(c._id.tripId.toString(), c.count);
    }
  }

  return NextResponse.json({
    trips: trips.map((t) => ({
      ...t,
      pendingRequestCount: pendingByTrip.get(t._id.toString()) || 0,
    })),
  });
}
