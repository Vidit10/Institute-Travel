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
import {
  PICKUP_LOCATIONS,
  CAMPUS_LOCATIONS,
  DIRECTIONS,
  LISTING_TYPES,
  TRIP_MODES,
  MAX_ADVANCE_HOURS,
  getClusterMates,
  resolveTripCombo,
  routeFor,
  routeIndex,
  routeLabel,
} from "@/lib/constants";

function isLocal(combo: ReturnType<typeof resolveTripCombo>) {
  return combo === "local-return" || combo === "local-departure";
}

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
  // Defaults preserve the pre-Phase-2 behavior for callers that don't pass these.
  const direction = req.nextUrl.searchParams.get("direction") || "to-campus";
  const listingType = req.nextUrl.searchParams.get("listingType") || "long-distance";
  const combo = resolveTripCombo(listingType, direction);
  const visibilityFilter = me?.gender === "female" ? {} : { girlsOnly: { $ne: true } };

  const myEntries = await ArrivalIntent.find({ userId: session.user.id, status: "active" }).lean();
  const myProfile = { gender: me?.gender, arrivalsGirlsOnlyDefault: me?.arrivalsGirlsOnlyDefault || false };

  if (!location) {
    const all = await ArrivalIntent.find({ status: "active", direction, listingType, ...visibilityFilter })
      .select("pickupLocation partySize")
      .lean();

    if (isLocal(combo)) {
      // The local flow's "location" is a whole corridor, not an independent
      // point — one bucket for the entire route rather than one chip per stop
      // (which would otherwise show near-identical counts on every chip).
      const label = routeLabel(direction);
      const totals = all.reduce(
        (acc, e) => ({ count: acc.count + 1, people: acc.people + e.partySize }),
        { count: 0, people: 0 }
      );
      return NextResponse.json({
        overview: [{ location: label, ...totals }],
        myEntries,
        myProfile,
      });
    }

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

  // Local combos: symmetric whole-route browsing by default (no vehicle/direction
  // committed yet, so everyone on the corridor is shown together) — unless the
  // caller passes `directional=true` + `targetTime` (used by the trip-creation
  // "who's on this route" nudge), which instead applies the real "on the way"
  // rule (r >= p) relative to `location` as the trip's own pickup point.
  const directional = req.nextUrl.searchParams.get("directional") === "true";
  const targetTimeParam = req.nextUrl.searchParams.get("targetTime");
  const targetTime = targetTimeParam ? new Date(targetTimeParam) : null;

  let locationFilter: Record<string, unknown>;
  if (isLocal(combo)) {
    if (directional && targetTime && !isNaN(targetTime.getTime())) {
      const p = routeIndex(direction, location);
      locationFilter = { pickupLocation: p === -1 ? location : { $in: routeFor(direction).slice(p) } };
    } else {
      locationFilter = { pickupLocation: { $in: routeFor(direction) } };
    }
  } else {
    locationFilter = { pickupLocation: location };
  }

  const entriesDocs = await ArrivalIntent.find({
    ...locationFilter,
    direction,
    listingType,
    status: "active",
    ...visibilityFilter,
  })
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

  const myEntryHere = myEntries.find((e) => {
    if (e.direction !== direction || e.listingType !== listingType) return false;
    return isLocal(combo) ? routeFor(direction).includes(e.pickupLocation) : e.pickupLocation === location;
  });
  const reference = directional && targetTime && !isNaN(targetTime.getTime())
    ? targetTime
    : myEntryHere
      ? new Date(myEntryHere.arrivalTime)
      : new Date();

  const { exact, nearby } = splitByProximity(
    entries.map((e) => ({ ...e, time: new Date(e.arrivalTime) })),
    reference
  );

  // Cluster-mates are opt-in — only fetched when the caller explicitly asks
  // ("look around your surroundings"), never merged into exact/nearby above.
  // Same exact/nearby time windows as everywhere else in the app (not "every
  // date/time at that location") — someone arriving next week at a
  // cluster-mate location isn't a useful match for right now. Only defined for
  // the original long-distance arrival flow — the local flow's whole-route
  // browsing above already serves the same purpose natively.
  const clusterMates = combo === "arrival" ? getClusterMates(location) : [];
  let clusterEntries: unknown[] = [];
  if (clusterMates.length > 0 && req.nextUrl.searchParams.get("includeCluster") === "true") {
    const clusterDocs = await ArrivalIntent.find({
      pickupLocation: { $in: clusterMates },
      direction,
      listingType,
      status: "active",
      ...visibilityFilter,
    })
      .populate("userId", "name year program")
      .sort({ arrivalTime: 1 })
      .lean();
    const { exact: clusterExact, nearby: clusterNearby } = splitByProximity(
      clusterDocs.map((e) => ({ ...e, time: new Date(e.arrivalTime) })),
      reference
    );
    clusterEntries = [...clusterExact, ...clusterNearby];
  }

  return NextResponse.json({
    myEntries,
    myProfile,
    exact,
    nearby,
    clusterLocations: clusterMates,
    clusterEntries,
  });
}

const createSchema = z
  .object({
    pickupLocation: z.string().min(1).max(100),
    direction: z.enum(DIRECTIONS).optional().default("to-campus"),
    listingType: z.enum(LISTING_TYPES).optional().default("long-distance"),
    arrivalTime: z.string().datetime(),
    mode: z.enum(TRIP_MODES).optional(),
    trainNumber: z.string().max(20).optional(),
    flightNumber: z.string().max(20).optional(),
    partySize: z.number().int().min(1).max(10),
    girlsOnly: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const combo = resolveTripCombo(data.listingType, data.direction);
    const campusSet: readonly string[] = CAMPUS_LOCATIONS;
    const longDistanceSet: readonly string[] = PICKUP_LOCATIONS;
    const pickupOk =
      combo === "arrival"
        ? longDistanceSet.includes(data.pickupLocation)
        : combo === "departure-long" || combo === "local-departure"
          ? campusSet.includes(data.pickupLocation)
          : true; // local-return: free text
    if (!pickupOk) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid location for this arrival type", path: ["pickupLocation"] });
    }
  })
  .refine(
    (data) => {
      const t = new Date(data.arrivalTime).getTime();
      const now = Date.now();
      return t > now && t <= now + MAX_ADVANCE_HOURS * 60 * 60 * 1000;
    },
    { message: `Arrival time must be in the future, within the next ${MAX_ADVANCE_HOURS / 24} days`, path: ["arrivalTime"] }
  );

// Creates or replaces (upserts) the caller's one active entry — a person can
// only be arriving at one place at a time, so posting at any location
// replaces whatever was previously active, even if it was a different
// location entirely.
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
    { userId: session.user.id, status: "active" },
    {
      userId: session.user.id,
      pickupLocation: parsed.data.pickupLocation,
      direction: parsed.data.direction,
      listingType: parsed.data.listingType,
      arrivalTime: new Date(parsed.data.arrivalTime),
      mode: parsed.data.mode,
      trainNumber: parsed.data.trainNumber,
      flightNumber: parsed.data.flightNumber,
      partySize: parsed.data.partySize,
      girlsOnly,
      status: "active",
    },
    { upsert: true, new: true }
  );

  track(session.user.id, "arrival_intent_posted", { pickupLocation: parsed.data.pickupLocation });

  return NextResponse.json({ entry }, { status: 201 });
}
