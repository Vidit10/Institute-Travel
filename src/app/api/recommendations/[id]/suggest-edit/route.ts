import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Recommendation } from "@/models/Recommendation";
import { RecommendationEditSuggestion } from "@/models/RecommendationEditSuggestion";
import { recommendationFieldsSchema } from "@/lib/recommendationValidation";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { track } from "@/lib/analytics";

// Open to any authenticated user, not just the original poster — the live
// Recommendation is never touched here, only once an admin approves the
// suggestion (src/app/api/admin/recommendations/edit-suggestions/[id]/route.ts).
// See docs/SPEC.md's Recommendations section for why an unresolved suggestion
// must never hide someone else's approved post from the board.
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

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "recommendations:suggest-edit");
  if (limited) return limited;

  const recommendation = (await Recommendation.findById(id).lean()) as unknown as { status: string } | null;
  if (!recommendation || recommendation.status !== "approved") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const parsed = recommendationFieldsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let suggestion;
  try {
    suggestion = await RecommendationEditSuggestion.create({
      recommendationId: id,
      suggestedBy: session.user.id,
      ...parsed.data,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "you already have a pending suggestion for this recommendation" },
        { status: 409 }
      );
    }
    throw err;
  }

  track(session.user.id, "recommendation_edit_suggested", { recommendationId: id });

  return NextResponse.json({ suggestion }, { status: 201 });
}
