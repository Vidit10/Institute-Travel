import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { ArrivalIntent } from "@/models/ArrivalIntent";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { splitByProximity } from "@/lib/timeProximity";
import { PICKUP_LOCATIONS, TRIP_MODES, MAX_ADVANCE_HOURS } from "@/lib/constants";

// GET: overview of every location with an active cluster (count + total people),
// or — when ?location=X is passed — the detailed, proximity-sorted list for
// that one location, split into "exact" and "nearby" relative to the caller's
// own posted arrival time at that location (if they have one). Girls-only
// entries are hidden from non-female viewers entirely, mirroring Trip.girlsOnly.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const me = await User.findById(session.user.id);
  const location = req.nextUrl.searchParams.get("location");
  const visibilityFilter = me?.gender === "female" ? {} : { girlsOnly: { $ne: true } };

  const myEntries = await ArrivalIntent.find({ userId: session.user.id, status: "active" }).lean();
  const myProfile = { gender: me?.gender, arrivalsGirlsOnlyDefault: me?.arrivalsGirlsOnlyDefault || false };

  if (!location) {
    const all = await ArrivalIntent.find({ status: "active", ...visibilityFilter })
      .select("pickupLocation partySize")
      .lean();
    const byLocation = new Map<string, { count: number; people: number }>();
    for (const entry of all) {
      const current = byLocation.get(entry.pickupLocation) || { count: 0, people: 0 };
      current.count += 1;
      current.people += entry.partySize;
      byLocation.set(entry.pickupLocation, current);
    }
    return NextResponse.json({
      overview: PICKUP_LOCATIONS.map((loc) => ({
        location: loc,
        count: byLocation.get(loc)?.count || 0,
        people: byLocation.get(loc)?.people || 0,
      })),
      myEntries,
      myProfile,
    });
  }

  const entriesDocs = await ArrivalIntent.find({ pickupLocation: location, status: "active", ...visibilityFilter })
    .populate("userId", "name year program")
    .sort({ arrivalTime: 1 })
    .lean();

  const entries = entriesDocs as unknown as Array<{
    _id: string;
    arrivalTime: Date;
    mode?: string;
    partySize: number;
    girlsOnly?: boolean;
    userId: { _id: string; name: string; year: string; program: string };
  }>;

  const myEntryHere = myEntries.find((e) => e.pickupLocation === location);
  const reference = myEntryHere ? new Date(myEntryHere.arrivalTime) : new Date();

  const { exact, nearby } = splitByProximity(
    entries.map((e) => ({ ...e, time: new Date(e.arrivalTime) })),
    reference
  );

  return NextResponse.json({
    myEntries,
    myProfile,
    exact,
    nearby,
  });
}

const createSchema = z
  .object({
    pickupLocation: z.enum(PICKUP_LOCATIONS),
    arrivalTime: z.string().datetime(),
    mode: z.enum(TRIP_MODES).optional(),
    partySize: z.number().int().min(1).max(10),
    girlsOnly: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const t = new Date(data.arrivalTime).getTime();
      const now = Date.now();
      return t > now && t <= now + MAX_ADVANCE_HOURS * 60 * 60 * 1000;
    },
    { message: `Arrival time must be in the future, within the next ${MAX_ADVANCE_HOURS / 24} days`, path: ["arrivalTime"] }
  );

// Creates or replaces (upserts) the caller's own active entry for that
// location — posting again at the same location updates it rather than
// erroring on the unique-active-entry index.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "arrivals:create");
  if (limited) return limited;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const me = await User.findById(session.user.id);
  if (parsed.data.girlsOnly && me?.gender !== "female") {
    return NextResponse.json(
      { error: "Only accounts marked female can post a girls-only entry" },
      { status: 403 }
    );
  }
  // Falls back to the user's saved default when the client doesn't send an
  // explicit value (e.g. an older cached form) rather than silently unsetting it.
  const girlsOnly = parsed.data.girlsOnly ?? (me?.gender === "female" && !!me?.arrivalsGirlsOnlyDefault);

  const entry = await ArrivalIntent.findOneAndUpdate(
    { userId: session.user.id, pickupLocation: parsed.data.pickupLocation, status: "active" },
    {
      userId: session.user.id,
      pickupLocation: parsed.data.pickupLocation,
      arrivalTime: new Date(parsed.data.arrivalTime),
      mode: parsed.data.mode,
      partySize: parsed.data.partySize,
      girlsOnly,
      status: "active",
    },
    { upsert: true, new: true }
  );

  track(session.user.id, "arrival_intent_posted", { pickupLocation: parsed.data.pickupLocation });

  return NextResponse.json({ entry }, { status: 201 });
}
