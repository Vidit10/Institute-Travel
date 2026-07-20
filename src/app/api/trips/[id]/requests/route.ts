import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { User } from "@/models/User";
import { JoinRequest } from "@/models/JoinRequest";
import { notifyUser } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { REQUEST_EXPIRY_HOURS } from "@/lib/constants";
import { sweepExpired } from "@/lib/expireRequests";
import { rateLimitOrRespond } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "trips:request");
  if (limited) return limited;

  const [trip, rider] = await Promise.all([
    Trip.findById(id),
    User.findById(session.user.id),
  ]);

  if (!trip || trip.status !== "open") {
    return NextResponse.json({ error: "trip not available" }, { status: 404 });
  }
  if (trip.hostId.toString() === session.user.id) {
    return NextResponse.json({ error: "cannot request your own trip" }, { status: 400 });
  }
  if (trip.girlsOnly && rider?.gender !== "female") {
    return NextResponse.json({ error: "this trip is girls-only" }, { status: 403 });
  }

  await sweepExpired({ tripId: trip._id, riderId: session.user.id });

  // Expiry is whichever comes first: the configured window, or the trip's own departure time.
  const windowExpiry = new Date(Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000);
  const expiresAt = trip.departureTime < windowExpiry ? trip.departureTime : windowExpiry;

  let joinRequest;
  try {
    joinRequest = await JoinRequest.create({
      tripId: trip._id,
      riderId: session.user.id,
      expiresAt,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "you already requested this trip" }, { status: 409 });
    }
    throw err;
  }

  track(session.user.id, "join_request_sent", { tripId: trip._id.toString() });

  await notifyUser(trip.hostId.toString(), {
    title: "New ride request",
    body: `${rider?.name || "Someone"} wants to join your trip.`,
    url: "/trips/mine",
  });

  return NextResponse.json({ joinRequest }, { status: 201 });
}
