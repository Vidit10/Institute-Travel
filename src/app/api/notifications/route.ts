import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";

// Bell feed: unseen items only (not a full history) — new pending requests on
// trips the current user hosts, and status updates on requests they made.
// Polled from the client every ~25s (src/components/NotificationBell.tsx).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const myTripIds = (await Trip.find({ hostId: session.user.id }).select("_id").lean()).map(
    (t) => t._id
  );

  const [hostItemsDocs, riderItemsDocs] = await Promise.all([
    JoinRequest.find({ tripId: { $in: myTripIds }, status: "pending", hostSeen: false })
      .sort({ createdAt: -1 })
      .populate("tripId", "pickupLocation destination")
      .populate("riderId", "name")
      .lean(),
    JoinRequest.find({
      riderId: session.user.id,
      riderSeen: false,
      status: { $in: ["accepted", "declined", "expired"] },
    })
      .sort({ updatedAt: -1 })
      .populate("tripId", "pickupLocation destination status")
      .lean(),
  ]);

  const hostItems = hostItemsDocs as unknown as Array<{
    _id: string;
    tripId: { _id: string; pickupLocation: string; destination: string };
    riderId: { name: string };
    createdAt: string;
  }>;
  const riderItems = riderItemsDocs as unknown as Array<{
    _id: string;
    tripId: { _id: string; pickupLocation: string; destination: string; status: string };
    status: string;
    updatedAt: string;
  }>;

  const items = [
    ...hostItems.map((r) => ({
      kind: "host_pending" as const,
      requestId: r._id,
      tripId: r.tripId?._id,
      label: `${r.riderId?.name || "Someone"} wants to join ${r.tripId?.pickupLocation} → ${r.tripId?.destination}`,
      at: r.createdAt,
    })),
    ...riderItems.map((r) => {
      const cancelled = r.tripId?.status === "cancelled";
      const verb = cancelled
        ? "was cancelled"
        : r.status === "accepted"
          ? "was accepted"
          : r.status === "declined"
            ? "was declined"
            : "expired";
      return {
        kind: "rider_update" as const,
        requestId: r._id,
        tripId: r.tripId?._id,
        label: `Your request for ${r.tripId?.pickupLocation} → ${r.tripId?.destination} ${verb}`,
        at: r.updatedAt,
      };
    }),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ items, count: items.length });
}

// Marks every currently-unseen item (for this user, in either role) as seen.
// Called when the bell dropdown is opened.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const myTripIds = (await Trip.find({ hostId: session.user.id }).select("_id").lean()).map(
    (t) => t._id
  );

  await Promise.all([
    JoinRequest.updateMany(
      { tripId: { $in: myTripIds }, status: "pending", hostSeen: false },
      { hostSeen: true }
    ),
    JoinRequest.updateMany(
      { riderId: session.user.id, riderSeen: false },
      { riderSeen: true }
    ),
  ]);

  return NextResponse.json({ ok: true });
}
