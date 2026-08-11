import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";

// Event details + full RSVP list (name/year/program only — no phone reveal,
// no consent-gating; per docs/SPEC.md, host and every RSVP'd participant see
// the same list).
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
  const eventDoc = await Event.findById(id).populate("hostId", "name year program").lean();
  if (!eventDoc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const event = eventDoc as unknown as {
    _id: string;
    hostId: { _id: string; name: string; year: string; program: string };
    [key: string]: unknown;
  };

  const isHost = event.hostId._id.toString() === session.user.id;

  const rsvpsDocs = await EventRSVP.find({ eventId: event._id })
    .populate("userId", "name year program")
    .sort({ createdAt: 1 })
    .lean();
  const rsvps = rsvpsDocs as unknown as Array<{
    _id: string;
    partySize: number;
    userId: { _id: string; name: string; year: string; program: string };
  }>;

  const myRsvp = rsvps.find((r) => r.userId._id.toString() === session.user.id) || null;

  return NextResponse.json({
    event: { ...event, hostId: undefined },
    host: event.hostId,
    isHost,
    myRsvp,
    rsvps: rsvps.map((r) => ({
      _id: r._id,
      partySize: r.partySize,
      person: { name: r.userId.name, year: r.userId.year, program: r.userId.program },
    })),
  });
}
