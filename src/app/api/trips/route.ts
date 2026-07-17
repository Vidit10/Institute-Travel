import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";
import { resolveCompanions } from "@/lib/companionInvites";
import {
  PICKUP_LOCATIONS,
  TRIP_MODES,
  VEHICLE_TYPES,
  MAX_ADVANCE_HOURS,
} from "@/lib/constants";

const createTripSchema = z
  .object({
    mode: z.enum(TRIP_MODES),
    vehicleType: z.enum(VEHICLE_TYPES),
    pickupLocation: z.enum(PICKUP_LOCATIONS),
    departureTime: z.string().datetime(),
    trainNumber: z.string().optional(),
    flightNumber: z.string().optional(),
    totalCapacity: z.number().int().min(1).max(10),
    numTravelers: z.number().int().min(1),
    companionEmails: z.array(z.string().email()).max(9).optional().default([]),
    girlsOnly: z.boolean().optional(),
    expectedFare: z.number().min(0),
  })
  .refine((data) => data.numTravelers <= data.totalCapacity, {
    message: "Your party size can't exceed the total capacity",
    path: ["numTravelers"],
  })
  .refine((data) => data.companionEmails.length === data.numTravelers - 1, {
    message: "Number of companion emails must match party size minus you",
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

export async function GET() {
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

  const trips = await Trip.find({
    status: "open",
    departureTime: { $gt: gracePeriodCutoff },
    ...visibilityFilter,
  })
    .sort({ departureTime: 1 })
    .populate("hostId", "name year program")
    .lean();

  return NextResponse.json({ trips });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const host = await User.findById(session.user.id);
  if (!host?.onboarded) {
    return NextResponse.json({ error: "complete onboarding first" }, { status: 403 });
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

  const trip = await Trip.create({
    mode: parsed.data.mode,
    vehicleType: parsed.data.vehicleType,
    pickupLocation: parsed.data.pickupLocation,
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

  if (companionEmails.length > 0) {
    await resolveCompanions(trip, host._id.toString(), companionEmails);
  }

  track(session.user.id, "trip_created", { mode: parsed.data.mode });

  return NextResponse.json({ trip }, { status: 201 });
}
