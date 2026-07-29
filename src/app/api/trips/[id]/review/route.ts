import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { TripReview } from "@/models/TripReview";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { WOULD_USE_AGAIN_OPTIONS } from "@/lib/constants";

async function wasParticipant(tripId: string, userId: string, hostId: string) {
  if (hostId === userId) return true;
  const accepted = await JoinRequest.findOne({ tripId, riderId: userId, status: "accepted" });
  return !!accepted;
}

// GET: whether the caller already submitted a review for this trip (so the
// page can show a "thanks, already submitted" state instead of the form).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const trip = await Trip.findById(id);
  if (!trip) return NextResponse.json({ error: "not found" }, { status: 404 });

  const eligible = await wasParticipant(id, session.user.id, trip.hostId.toString());
  if (!eligible) return NextResponse.json({ error: "not found" }, { status: 404 });

  const existing = await TripReview.findOne({ tripId: id, userId: session.user.id }).lean();
  return NextResponse.json({ alreadySubmitted: !!existing });
}

const reviewSchema = z.object({
  happened: z.boolean(),
  amountSaved: z.number().min(0).max(100000).optional(),
  wouldUseAgain: z.enum(WOULD_USE_AGAIN_OPTIONS),
  comments: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "trips:review");
  if (limited) return limited;

  const trip = await Trip.findById(id);
  if (!trip) return NextResponse.json({ error: "not found" }, { status: 404 });

  const eligible = await wasParticipant(id, session.user.id, trip.hostId.toString());
  if (!eligible) {
    return NextResponse.json({ error: "only trip participants can submit a review" }, { status: 403 });
  }

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await TripReview.create({
      tripId: id,
      userId: session.user.id,
      happened: parsed.data.happened,
      amountSaved: parsed.data.happened ? parsed.data.amountSaved : undefined,
      wouldUseAgain: parsed.data.wouldUseAgain,
      comments: parsed.data.comments,
    });
  } catch (err: unknown) {
    // Duplicate submission (unique tripId+userId index) — treat as success
    // rather than an error, since the user's intent (already told us) is met.
    if (typeof err === "object" && err && "code" in err && (err as { code?: number }).code === 11000) {
      return NextResponse.json({ ok: true, alreadySubmitted: true });
    }
    throw err;
  }

  track(session.user.id, "trip_review_submitted", { tripId: id, happened: parsed.data.happened });

  return NextResponse.json({ ok: true }, { status: 201 });
}
