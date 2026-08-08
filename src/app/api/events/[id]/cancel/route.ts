import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";
import { notifyUser } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";

// Host cancels their own event. Every RSVP'd participant is notified — capped
// at ~20 recipients, same reasoning as the arrivals-board notify fan-out.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "events:cancel");
  if (limited) return limited;

  const event = await Event.findById(id);
  if (!event || event.hostId.toString() !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (event.status === "cancelled" || event.status === "completed") {
    return NextResponse.json({ error: "event already closed" }, { status: 400 });
  }

  const rsvps = await EventRSVP.find({ eventId: event._id });

  event.status = "cancelled";
  await event.save();

  track(session.user.id, "event_cancelled", { eventId: event._id.toString() });

  await Promise.all(
    rsvps.slice(0, 20).map((r) =>
      notifyUser(r.userId.toString(), {
        title: "Event cancelled",
        body: `The host cancelled "${event.title}".`,
        url: "/events",
      })
    )
  );

  return NextResponse.json({ event });
}
