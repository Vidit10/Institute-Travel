import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { EventRSVP } from "@/models/EventRSVP";

// Events the current user has RSVP'd to — the rider-side counterpart of
// /api/events/mine. Simpler than /api/trips/requested since RSVPs have no
// pending/accepted status to filter on.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const rsvps = await EventRSVP.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .populate({ path: "eventId", populate: { path: "hostId", select: "name" } })
    .lean();

  return NextResponse.json({
    rsvps: rsvps.map((r) => {
      const rr = r as unknown as { _id: string; partySize: number; eventId: Record<string, unknown> };
      return { _id: rr._id, partySize: rr.partySize, event: rr.eventId };
    }),
  });
}
