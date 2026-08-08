import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";

// Events the current user is hosting, plus an RSVP count for each — the
// host-side dashboard, mirrors /api/trips/mine.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const eventsDocs = await Event.find({ hostId: session.user.id })
    .sort({ startTime: -1 })
    .lean();
  const events = eventsDocs as unknown as Array<{ _id: string; [key: string]: unknown }>;

  const counts = await EventRSVP.aggregate([
    { $match: { eventId: { $in: events.map((e) => e._id) } } },
    { $group: { _id: "$eventId", partySize: { $sum: "$partySize" } } },
  ]);
  const rsvpCountByEvent = new Map<string, number>();
  for (const c of counts) {
    rsvpCountByEvent.set(c._id.toString(), c.partySize);
  }

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      rsvpCount: rsvpCountByEvent.get(e._id.toString()) || 0,
    })),
  });
}
