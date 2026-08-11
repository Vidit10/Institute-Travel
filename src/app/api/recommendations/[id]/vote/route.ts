import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Recommendation } from "@/models/Recommendation";
import { castVote } from "@/lib/recommendationVoting";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { track } from "@/lib/analytics";

const voteSchema = z.object({ value: z.union([z.literal(1), z.literal(-1)]) });

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

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "recommendations:vote");
  if (limited) return limited;

  const parsed = voteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recommendation = (await Recommendation.findById(id).lean()) as unknown as { status: string } | null;
  if (!recommendation || recommendation.status !== "approved") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const result = await castVote(id, session.user.id, parsed.data.value);

  track(session.user.id, "recommendation_voted", { recommendationId: id, value: parsed.data.value });

  return NextResponse.json(result);
}
