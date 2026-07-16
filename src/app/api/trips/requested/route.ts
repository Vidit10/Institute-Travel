import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { JoinRequest } from "@/models/JoinRequest";
import { sweepExpired } from "@/lib/expireRequests";

// Trips the current user has requested to join, with their request status —
// the rider-side counterpart of /api/trips/mine.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await sweepExpired({ riderId: session.user.id });

  const requests = await JoinRequest.find({ riderId: session.user.id })
    .sort({ createdAt: -1 })
    .populate({
      path: "tripId",
      populate: { path: "hostId", select: "name phone contactShareDefaultConsent" },
    })
    .lean();

  return NextResponse.json({
    requests: requests.map((r) => {
      const rr = r as unknown as {
        _id: string;
        status: string;
        createdAt: string;
        expiresAt: string;
        tripId: {
          _id: string;
          mode: string;
          pickupLocation: string;
          destination: string;
          departureTime: string;
          hostId: { name: string; phone: string; contactShareDefaultConsent: boolean };
        };
      };
      return {
        _id: rr._id,
        status: rr.status,
        expiresAt: rr.expiresAt,
        trip: {
          _id: rr.tripId._id,
          mode: rr.tripId.mode,
          pickupLocation: rr.tripId.pickupLocation,
          destination: rr.tripId.destination,
          departureTime: rr.tripId.departureTime,
          hostName: rr.tripId.hostId?.name,
          hostPhone:
            rr.status === "accepted" && rr.tripId.hostId?.contactShareDefaultConsent
              ? rr.tripId.hostId.phone
              : null,
        },
      };
    }),
  });
}
