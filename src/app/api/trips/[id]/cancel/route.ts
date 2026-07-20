import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { notifyUser } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";

// Host cancels their own trip. Every rider who was pending or already accepted is
// notified — an accepted rider had made real plans around this seat, not just a
// pending one, so both need to hear it.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "trips:cancel");
  if (limited) return limited;

  const trip = await Trip.findById(id);
  if (!trip || trip.hostId.toString() !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (trip.status === "cancelled" || trip.status === "completed") {
    return NextResponse.json({ error: "trip already closed" }, { status: 400 });
  }

  const affectedRequests = await JoinRequest.find({
    tripId: trip._id,
    status: { $in: ["pending", "accepted"] },
  });

  trip.status = "cancelled";
  await trip.save();

  await JoinRequest.updateMany(
    { tripId: trip._id, status: "pending" },
    { status: "declined", respondedAt: new Date(), riderSeen: false }
  );
  // Accepted riders keep their status as-is (the trip itself is what changed),
  // but still need to see a "this trip was cancelled" notification.
  await JoinRequest.updateMany(
    { tripId: trip._id, status: "accepted" },
    { riderSeen: false }
  );

  track(session.user.id, "trip_cancelled", { tripId: trip._id.toString() });

  await Promise.all(
    affectedRequests.map((r) =>
      notifyUser(r.riderId.toString(), {
        title: "Trip cancelled",
        body: "A trip you were part of was cancelled by the host.",
        url: "/trips/requested",
      })
    )
  );

  return NextResponse.json({ trip });
}
