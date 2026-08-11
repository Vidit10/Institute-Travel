import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { joinEvent, leaveEvent } from "@/lib/eventRsvp";
import { notifyUser } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";

const rsvpSchema = z.object({
  partySize: z.number().int().min(1).max(20).optional().default(1),
});

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

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "events:rsvp");
  if (limited) return limited;

  const parsed = rsvpSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await joinEvent(id, session.user.id, parsed.data.partySize);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  track(session.user.id, "event_rsvp", { eventId: id });

  const [event, rider] = await Promise.all([
    Event.findById(id),
    User.findById(session.user.id),
  ]);
  if (event) {
    await notifyUser(event.hostId.toString(), {
      title: "New RSVP",
      body: `${rider?.name || "Someone"} is going to your event.`,
      url: `/events/${id}`,
    });
  }

  return NextResponse.json({ rsvp: result.rsvp }, { status: 201 });
}

// Leaving an event doesn't notify the host — same "reverse notification
// deliberately not built, to avoid spam" precedent as the arrivals board.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const result = await leaveEvent(id, session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  track(session.user.id, "event_rsvp_cancelled", { eventId: id });

  return NextResponse.json({ ok: true });
}
