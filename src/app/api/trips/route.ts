import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";
import {
  PICKUP_LOCATIONS,
  DESTINATIONS,
  TRIP_MODES,
} from "@/lib/constants";

const createTripSchema = z.object({
  mode: z.enum(TRIP_MODES),
  vehicleType: z.string().min(1).max(40),
  pickupLocation: z.enum(PICKUP_LOCATIONS),
  destination: z.enum(DESTINATIONS),
  departureTime: z.string().datetime(),
  trainNumber: z.string().optional(),
  flightNumber: z.string().optional(),
  totalCapacity: z.number().int().min(1).max(10),
  girlsOnly: z.boolean().optional(),
  referenceFareNote: z.string().max(120).optional(),
});

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

  const trip = await Trip.create({
    ...parsed.data,
    departureTime: new Date(parsed.data.departureTime),
    hostId: host._id,
    seatsRemaining: parsed.data.totalCapacity,
  });

  track(session.user.id, "trip_created", { mode: parsed.data.mode });

  return NextResponse.json({ trip }, { status: 201 });
}
