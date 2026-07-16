import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { sweepExpired } from "@/lib/expireRequests";

export type RespondResult =
  | { ok: true; joinRequest: unknown; trip?: unknown }
  | { ok: false; error: string; status: number };

// Core accept/decline logic, factored out of the API route so it can be exercised
// directly by tests without needing to fake a Next.js request/session.
// See docs/SPEC.md section 5 for the concurrency requirement this implements.
export async function respondToJoinRequest(
  tripId: string,
  requestId: string,
  hostId: string,
  action: "accept" | "decline"
): Promise<RespondResult> {
  const trip = await Trip.findById(tripId);
  if (!trip || trip.hostId.toString() !== hostId) {
    return { ok: false, error: "not found", status: 404 };
  }

  await sweepExpired({ tripId: trip._id });

  const joinRequest = await JoinRequest.findOne({
    _id: requestId,
    tripId: trip._id,
    status: "pending",
  });
  if (!joinRequest) {
    return { ok: false, error: "request not found, already resolved, or expired", status: 404 };
  }

  if (action === "decline") {
    joinRequest.status = "declined";
    joinRequest.respondedAt = new Date();
    await joinRequest.save();
    return { ok: true, joinRequest };
  }

  // Atomically claim a seat so two concurrent accepts can never overbook the last spot.
  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: trip._id, seatsRemaining: { $gt: 0 } },
    { $inc: { seatsRemaining: -1 } },
    { new: true }
  );

  if (!updatedTrip) {
    return { ok: false, error: "no seats remaining", status: 409 };
  }

  if (updatedTrip.seatsRemaining === 0) {
    updatedTrip.status = "full";
    await updatedTrip.save();
  }

  joinRequest.status = "accepted";
  joinRequest.respondedAt = new Date();
  await joinRequest.save();

  return { ok: true, joinRequest, trip: updatedTrip };
}
