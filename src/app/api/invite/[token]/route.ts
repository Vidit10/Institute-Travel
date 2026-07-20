import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { CompanionInvite } from "@/models/CompanionInvite";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";

// Claims a companion invite for the currently signed-in user. Called by the
// /invite/[token] page on mount — the seat itself was already reserved when the
// host created the trip (numTravelers accounted for it in seatsRemaining), this
// just creates the JoinRequest record linking it to a real account.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  await dbConnect();

  const invite = await CompanionInvite.findOne({ token });
  if (!invite) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }

  if (invite.status === "claimed") {
    const trip = await Trip.findById(invite.tripId);
    return NextResponse.json({ ok: true, tripId: invite.tripId, alreadyClaimed: true, tripStatus: trip?.status });
  }

  if (invite.expiresAt < new Date()) {
    invite.status = "expired";
    await invite.save();
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite is no longer valid." }, { status: 410 });
  }

  if (session.user.email.toLowerCase() !== invite.email) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Please sign in with that account.` },
      { status: 403 }
    );
  }

  const trip = await Trip.findById(invite.tripId);
  if (!trip || trip.status !== "open") {
    return NextResponse.json({ error: "This trip is no longer available." }, { status: 410 });
  }

  try {
    await JoinRequest.create({
      tripId: trip._id,
      riderId: session.user.id,
      status: "accepted",
      expiresAt: trip.departureTime,
      respondedAt: new Date(),
      hostSeen: false, // the host needs to find out their invitee confirmed
      riderSeen: true, // the rider just did this themselves
    });
  } catch (err: unknown) {
    // Already has an active request on this trip (e.g. requested separately before
    // claiming) — that's fine, the invite is still considered claimed.
    if ((err as { code?: number }).code !== 11000) throw err;
  }

  invite.status = "claimed";
  invite.claimedByUserId = session.user.id;
  await invite.save();

  return NextResponse.json({ ok: true, tripId: trip._id });
}
