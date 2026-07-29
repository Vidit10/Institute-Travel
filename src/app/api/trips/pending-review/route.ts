import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { TripReview } from "@/models/TripReview";

// The single most-recently-completed trip the caller participated in
// (hosted, or was accepted onto) that they haven't reviewed yet — powers
// the in-app "how did your trip go?" popup on the home page. Read-only,
// no schema involved beyond fields that already exist.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const userId = session.user.id;

  const acceptedRequests = await JoinRequest.find({ riderId: userId, status: "accepted" })
    .select("tripId")
    .lean();
  const riddenTripIds = acceptedRequests.map((r) => r.tripId);

  const completedTripsDocs = await Trip.find({
    status: "completed",
    $or: [{ hostId: userId }, { _id: { $in: riddenTripIds } }],
  })
    .sort({ departureTime: -1 })
    .limit(20)
    .select("pickupLocation destination departureTime")
    .lean();
  const completedTrips = completedTripsDocs as unknown as Array<{
    _id: string;
    pickupLocation: string;
    destination: string;
    departureTime: Date;
  }>;

  if (completedTrips.length === 0) {
    return NextResponse.json({ trip: null });
  }

  const alreadyReviewed = await TripReview.find({
    userId,
    tripId: { $in: completedTrips.map((t) => t._id) },
  })
    .select("tripId")
    .lean();
  const reviewedIds = new Set(alreadyReviewed.map((r) => r.tripId.toString()));

  const pending = completedTrips.find((t) => !reviewedIds.has(t._id.toString()));

  return NextResponse.json({ trip: pending || null });
}
