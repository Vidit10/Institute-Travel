import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { RecommendationEditSuggestion } from "@/models/RecommendationEditSuggestion";
import { approveEditSuggestion } from "@/lib/recommendationEditSuggestions";
import { notifyUser } from "@/lib/notify";

// PATCH: approve — applies the suggested fields onto the live Recommendation
// (src/lib/recommendationEditSuggestions.ts). Notifies the suggester (not the
// original poster — this is a distinct action from post approval).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await dbConnect();

  const result = await approveEditSuggestion(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const suggestion = result.suggestion as { suggestedBy: { toString(): string } };
  const recommendation = result.recommendation as { title: string };
  try {
    await notifyUser(suggestion.suggestedBy.toString(), {
      title: "Your suggested edit was approved",
      body: `Your change to "${recommendation.title}" is now live.`,
      url: "/recommendations",
    });
  } catch {
    // Best-effort — a push failure must never undo the approval that already happened.
  }

  return NextResponse.json({ recommendation: result.recommendation });
}

// DELETE: reject — same silent-discard-no-reason pattern as rejecting a new
// submission (src/app/api/admin/recommendations/[id]/route.ts).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await dbConnect();

  const suggestion = await RecommendationEditSuggestion.findByIdAndDelete(id);
  if (!suggestion) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
