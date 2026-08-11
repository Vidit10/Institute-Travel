import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { createEventSchema } from "@/lib/eventValidation";
import { EVENT_CATEGORIES, ACTIVE_EVENT_STATUSES, MAX_ACTIVE_EVENTS_PER_HOST } from "@/lib/constants";

// Every open/full event, soonest-first — no visibility rules beyond the
// normal login gate (events aren't sensitive content the way trips/arrivals
// are, same reasoning as Recommendations).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const category = req.nextUrl.searchParams.get("category");
  const query: Record<string, unknown> = { status: { $in: ACTIVE_EVENT_STATUSES } };
  if (category && (EVENT_CATEGORIES as readonly string[]).includes(category)) {
    query.category = category;
  }

  const events = await Event.find(query)
    .sort({ startTime: 1 })
    .populate("hostId", "name year program")
    .lean();

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "events:create");
  if (limited) return limited;

  const host = await User.findById(session.user.id);
  if (!host?.onboarded) {
    return NextResponse.json({ error: "complete onboarding first" }, { status: 403 });
  }

  const activeEventCount = await Event.countDocuments({
    hostId: host._id,
    status: { $in: ACTIVE_EVENT_STATUSES },
  });
  if (activeEventCount >= MAX_ACTIVE_EVENTS_PER_HOST) {
    return NextResponse.json(
      {
        error: `You already have ${MAX_ACTIVE_EVENTS_PER_HOST} active events — cancel one or wait for one to complete before listing another.`,
      },
      { status: 400 }
    );
  }

  const parsed = createEventSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await Event.create({
    hostId: host._id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    location: parsed.data.location,
    mapLink: parsed.data.mapLink,
    startTime: new Date(parsed.data.startTime),
    capacity: parsed.data.capacity ?? null,
    spotsRemaining: parsed.data.capacity ?? null,
  });

  track(session.user.id, "event_created", { category: parsed.data.category });

  return NextResponse.json({ event }, { status: 201 });
}
