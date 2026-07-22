import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { User } from "@/models/User";
import { CompanionInvite } from "@/models/CompanionInvite";
import { sweepExpired } from "@/lib/expireRequests";

// Returns trip details. Host contact info is only included if the requester is
// an accepted rider on this trip (or the host themself) — consent-gated per
// docs/SPEC.md section 5. Symmetrically, the host only sees a rider's phone
// once that rider's request is accepted.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const tripDoc = await Trip.findById(id).populate("hostId", "name year program phone contactShareDefaultConsent").lean();
  if (!tripDoc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const trip = tripDoc as unknown as {
    _id: string;
    hostId: { _id: string; name: string; year: string; program: string; phone: string; contactShareDefaultConsent: boolean };
    [key: string]: unknown;
  };

  const isHost = trip.hostId._id.toString() === session.user.id;

  await sweepExpired({ tripId: trip._id });

  const myRequestDoc = await JoinRequest.findOne({
    tripId: trip._id,
    riderId: session.user.id,
  }).lean();
  const myRequest = myRequestDoc as unknown as { status: string } | null;

  const requestsDocs = isHost
    ? await JoinRequest.find({ tripId: trip._id })
        .populate("riderId", "name year program phone contactShareDefaultConsent")
        .lean()
    : [];
  const requests = requestsDocs as unknown as Array<{
    _id: string;
    status: string;
    createdAt: string;
    riderId: { _id: string; name: string; year: string; program: string; phone: string; contactShareDefaultConsent: boolean };
  }>;

  const host = trip.hostId as unknown as {
    _id: string; name: string; year: string; program: string; phone: string; contactShareDefaultConsent: boolean;
  };

  const hostContactVisible = isHost || myRequest?.status === "accepted";

  // Host-only: any companion invites still waiting to be claimed, so the host
  // can copy/re-share the link (no email is ever sent for this — item 6).
  const pendingInvitesDocs = isHost
    ? await CompanionInvite.find({ tripId: trip._id, status: "pending" }).lean()
    : [];
  const pendingInvites = (pendingInvitesDocs as unknown as Array<{ email: string; token: string }>).map(
    (invite) => ({
      email: invite.email,
      inviteUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${invite.token}`,
    })
  );

  return NextResponse.json({
    pendingInvites,
    trip: { ...trip, hostId: undefined },
    isHost,
    host: {
      name: host.name,
      year: host.year,
      program: host.program,
      phone: hostContactVisible && host.contactShareDefaultConsent ? host.phone : null,
    },
    myRequest,
    // For the host managing their trip: rider contact only shown for accepted requests.
    requests: requests.map((r) => {
      const rider = r.riderId as unknown as {
        _id: string; name: string; year: string; program: string; phone: string; contactShareDefaultConsent: boolean;
      };
      return {
        _id: r._id,
        status: r.status,
        createdAt: r.createdAt,
        rider: {
          name: rider.name,
          year: rider.year,
          program: rider.program,
          phone: r.status === "accepted" && rider.contactShareDefaultConsent ? rider.phone : null,
        },
      };
    }),
  });
}
