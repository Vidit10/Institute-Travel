import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { User } from "@/models/User";
import { ArrivalIntent } from "@/models/ArrivalIntent";
import { track } from "@/lib/analytics";
import { resolveCompanions } from "@/lib/companionInvites";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { splitByProximity } from "@/lib/timeProximity";
import { notifyUser } from "@/lib/notify";
import {
  PICKUP_LOCATIONS,
  CAMPUS_LOCATIONS,
  DEFAULT_DESTINATION,
  DIRECTIONS,
  LISTING_TYPES,
  TRAVEL_TYPES,
  TRIP_MODES,
  VEHICLE_TYPES,
  MAX_ADVANCE_HOURS,
  ACTIVE_TRIP_STATUSES,
  MAX_ACTIVE_TRIPS_PER_HOST,
  resolveTripCombo,
  routeFor,
  routeIndex,
  isOnTheWay,
} from "@/lib/constants";

function isLocalCombo(combo: ReturnType<typeof resolveTripCombo>) {
  return combo === "local-return" || combo === "local-departure";
}

const createTripSchema = z
  .object({
    mode: z.enum(TRIP_MODES),
    vehicleType: z.enum(VEHICLE_TYPES),
    pickupLocation: z.string().min(1).max(100),
    destination: z.string().min(1).max(100).optional(),
    direction: z.enum(DIRECTIONS).optional().default("to-campus"),
    listingType: z.enum(LISTING_TYPES).optional().default("long-distance"),
    travelType: z.enum(TRAVEL_TYPES).optional().default("leisure"),
    departureTime: z.string().datetime(),
    trainNumber: z.string().optional(),
    flightNumber: z.string().optional(),
    totalCapacity: z.number().int().min(1).max(10),
    numTravelers: z.number().int().min(1),
    companionEmails: z.array(z.string().email()).max(9).optional().default([]),
    girlsOnly: z.boolean().optional(),
    expectedFare: z.number().min(0),
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
          : true; // local-return: free text, any non-empty string (already enforced by min(1))
    if (!pickupOk) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid pickup location for this trip type", path: ["pickupLocation"] });
    }

    if (combo !== "arrival") {
      const destinationOk =
        combo === "departure-long"
          ? !!data.destination && longDistanceSet.includes(data.destination)
          : combo === "local-return"
            ? !!data.destination && campusSet.includes(data.destination)
            : !!data.destination; // local-departure: free text
      if (!destinationOk) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid destination for this trip type", path: ["destination"] });
      }
    }
  })
  .refine((data) => data.numTravelers < data.totalCapacity, {
    message: "Leave at least one seat open for someone else to join",
    path: ["totalCapacity"],
  })
  // Companion emails are optional pre-registration, not required — the form no
  // longer collects them (hosts are just nudged to invite friends to onboard
  // instead), but a caller that does supply some still can't exceed party size.
  .refine((data) => data.companionEmails.length <= data.numTravelers - 1, {
    message: "Can't list more companion emails than your party size",
    path: ["companionEmails"],
  })
  .refine(
    (data) => new Set(data.companionEmails.map((e) => e.toLowerCase())).size === data.companionEmails.length,
    { message: "Companion emails must be unique", path: ["companionEmails"] }
  )
  .refine(
    (data) => {
      const departure = new Date(data.departureTime);
      const now = Date.now();
      return departure.getTime() > now && departure.getTime() <= now + MAX_ADVANCE_HOURS * 60 * 60 * 1000;
    },
    {
      message: `Trips can only be listed for departures within the next ${MAX_ADVANCE_HOURS} hours`,
      path: ["departureTime"],
    }
  );

// Item 2 (search/filter): optional ?pickupLocation=&targetTime= narrow and
// re-sort the feed. With both given, results split into "exact" (same
// location, close in time) and "nearby" (same location, further out) using
// the same proximity logic as the arrivals board. With only targetTime,
// everything is just sorted by closeness (no location to group by). With
// neither, behavior is unchanged — open trips in chronological order.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const me = await User.findById(session.user.id);

  // Girls-only trips are hidden entirely from the feed for non-female users,
  // per docs/SPEC.md section 8.
  const visibilityFilter =
    me?.gender === "female" ? {} : { girlsOnly: { $ne: true } };

  // Departed trips fall out of the feed — allow a 30-minute grace window past
  // departure so a trip doesn't vanish the instant the clock ticks over.
  const gracePeriodCutoff = new Date(Date.now() - 30 * 60 * 1000);

  const pickupLocation = req.nextUrl.searchParams.get("pickupLocation");
  const targetTimeParam = req.nextUrl.searchParams.get("targetTime");
  const targetTime = targetTimeParam ? new Date(targetTimeParam) : null;
  // Only meaningful (and only applied) when pickupLocation is given — the
  // unfiltered default feed stays combo-agnostic, showing every direction/
  // listingType together (with a badge), exactly as before.
  const direction = req.nextUrl.searchParams.get("direction") || "to-campus";
  const listingType = req.nextUrl.searchParams.get("listingType") || "long-distance";

  const query: Record<string, unknown> = {
    status: "open",
    departureTime: { $gt: gracePeriodCutoff },
    ...visibilityFilter,
  };
  if (pickupLocation) {
    const combo = resolveTripCombo(listingType, direction);
    query.direction = direction;
    query.listingType = listingType;
    // Same corridor names can collide across combos (e.g. "Court Circle" exists
    // in both the long-distance list and the local city route) — scoping by
    // direction/listingType above keeps a location-based search from mixing them.
    if (isLocalCombo(combo)) {
      const r = routeIndex(direction, pickupLocation);
      // A trip whose own pickup index is <= the searcher's index will still
      // reach them (the vehicle passes every stop from its start onward).
      query.pickupLocation = r === -1 ? pickupLocation : { $in: routeFor(direction).slice(0, r + 1) };
    } else {
      query.pickupLocation = pickupLocation;
    }
  }

  const tripsDocs = await Trip.find(query)
    .sort({ departureTime: 1 })
    .populate("hostId", "name year program")
    .lean();

  if (!targetTime || isNaN(targetTime.getTime())) {
    return NextResponse.json({ trips: tripsDocs });
  }

  const withTime = tripsDocs.map((t) => ({ ...t, time: new Date(t.departureTime) }));

  if (pickupLocation) {
    const { exact, nearby } = splitByProximity(withTime, targetTime);
    return NextResponse.json({ exact, nearby });
  }

  // No location given — just sort everything by closeness, no exact/nearby split.
  const sorted = [...withTime].sort(
    (a, b) => Math.abs(a.time.getTime() - targetTime.getTime()) - Math.abs(b.time.getTime() - targetTime.getTime())
  );
  return NextResponse.json({ trips: sorted });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "trips:create");
  if (limited) return limited;

  const host = await User.findById(session.user.id);
  if (!host?.onboarded) {
    return NextResponse.json({ error: "complete onboarding first" }, { status: 403 });
  }

  const activeTripCount = await Trip.countDocuments({
    hostId: host._id,
    status: { $in: ACTIVE_TRIP_STATUSES },
  });
  if (activeTripCount >= MAX_ACTIVE_TRIPS_PER_HOST) {
    return NextResponse.json(
      {
        error: `You already have ${MAX_ACTIVE_TRIPS_PER_HOST} active trips — cancel one or wait for one to complete before listing another.`,
      },
      { status: 400 }
    );
  }

  const parsed = createTripSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.girlsOnly && host.gender !== "female") {
    return NextResponse.json(
      { error: "girls-only trips can only be created by users marked female" },
      { status: 403 }
    );
  }

  const hostEmail = host.email.toLowerCase();
  const companionEmails = parsed.data.companionEmails.map((e) => e.toLowerCase());
  if (companionEmails.includes(hostEmail)) {
    return NextResponse.json(
      { error: "You can't add yourself as a companion" },
      { status: 400 }
    );
  }

  const seatsRemaining = parsed.data.totalCapacity - parsed.data.numTravelers;

  const combo = resolveTripCombo(parsed.data.listingType, parsed.data.direction);
  // Never trust a client-supplied destination for the original arrival flow —
  // always force it server-side, same as V1's behavior.
  const destination = combo === "arrival" ? DEFAULT_DESTINATION : parsed.data.destination!;

  const trip = await Trip.create({
    mode: parsed.data.mode,
    vehicleType: parsed.data.vehicleType,
    pickupLocation: parsed.data.pickupLocation,
    destination,
    direction: parsed.data.direction,
    listingType: parsed.data.listingType,
    travelType: parsed.data.travelType,
    departureTime: new Date(parsed.data.departureTime),
    trainNumber: parsed.data.trainNumber,
    flightNumber: parsed.data.flightNumber,
    totalCapacity: parsed.data.totalCapacity,
    numTravelers: parsed.data.numTravelers,
    girlsOnly: parsed.data.girlsOnly,
    expectedFare: parsed.data.expectedFare,
    hostId: host._id,
    // The host's own party occupies seats immediately — riders only ever fill
    // whatever's left, per docs: "should not manually enter total capacity minus one."
    seatsRemaining,
    status: seatsRemaining === 0 ? "full" : "open",
  });

  // If this trip grew out of an arrivals-board entry, retire that entry so it
  // doesn't keep showing as an open "looking for a group" signal. Matched on
  // direction too, so a same-named location doesn't wrongly convert an intent
  // heading the opposite way.
  await ArrivalIntent.updateMany(
    {
      userId: host._id,
      pickupLocation: parsed.data.pickupLocation,
      direction: parsed.data.direction,
      status: "active",
    },
    { status: "converted" }
  );

  // Local trips only: push-notify anyone with an active, time-proximate
  // arrivals-board post "on the way" on this route/direction — closes the
  // loop between someone posting "I'm outside" and a matching ride appearing.
  // Best-effort — must never fail trip creation.
  if (isLocalCombo(combo)) {
    try {
      const candidatesDocs = await ArrivalIntent.find({
        status: "active",
        direction: parsed.data.direction,
        listingType: parsed.data.listingType,
        userId: { $ne: host._id },
      }).lean();
      const candidates = candidatesDocs as unknown as Array<{
        userId: { toString(): string };
        pickupLocation: string;
        arrivalTime: Date;
      }>;

      const onTheWay = candidates.filter((c) =>
        isOnTheWay(parsed.data.direction, parsed.data.pickupLocation, c.pickupLocation)
      );

      const { exact, nearby } = splitByProximity(
        onTheWay.map((c) => ({ ...c, time: new Date(c.arrivalTime) })),
        trip.departureTime
      );

      const recipients = [...exact, ...nearby].slice(0, 20);

      await Promise.all(
        recipients.map((entry) =>
          notifyUser(entry.userId.toString(), {
            title: "A ride is available",
            body: `A ride from ${trip.pickupLocation} around ${new Date(trip.departureTime).toLocaleString()} might work for you.`,
            url: `/trips/${trip._id}`,
          })
        )
      );
    } catch {
      // Notification pass failing must never break trip creation.
    }
  }

  let pendingInvites: Array<{ email: string; inviteUrl: string }> = [];
  if (companionEmails.length > 0) {
    pendingInvites = await resolveCompanions(trip, host._id.toString(), companionEmails);
  }

  track(session.user.id, "trip_created", { mode: parsed.data.mode });

  return NextResponse.json({ trip, pendingInvites }, { status: 201 });
}
