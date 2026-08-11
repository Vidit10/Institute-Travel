import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { Recommendation } from "@/models/Recommendation";
import { notifyUser } from "@/lib/notify";
import { recommendationFieldsSchema } from "@/lib/recommendationValidation";
import { castVote } from "@/lib/recommendationVoting";

// PATCH: admin edits the submitted fields (same validation as the public
// create form — src/app/api/recommendations/route.ts's recommendationFieldsSchema)
// and, in the same action, approves the post — there's no separate
// "save draft" step, editing and publishing are one admin action. Notifies
// the submitter it's live (best-effort, must never fail the approval itself).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await dbConnect();

  const parsed = recommendationFieldsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recommendation = await Recommendation.findByIdAndUpdate(
    id,
    {
      category: parsed.data.category,
      title: parsed.data.title,
      note: parsed.data.note,
      area: parsed.data.area,
      mapLink: parsed.data.mapLink,
      suggestedDays: parsed.data.category === "sightseeing" ? parsed.data.suggestedDays : undefined,
      foodType: parsed.data.category === "food" ? parsed.data.foodType : undefined,
      dishes: parsed.data.category === "food" ? parsed.data.dishes : undefined,
      leisureType: parsed.data.category === "leisure" ? parsed.data.leisureType : undefined,
      vibeTags: parsed.data.vibeTags,
      status: "approved",
    },
    { new: true }
  );

  if (!recommendation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Reddit-style: the poster's own post starts at their own upvote. Safe to
  // call unconditionally — the public vote endpoint 404s on non-approved
  // recommendations, so a submitter can never have voted before this exact
  // moment; this is always a fresh vote, never a toggle-off.
  try {
    await castVote(recommendation._id.toString(), recommendation.userId.toString(), 1);
  } catch {
    // Best-effort — a vote failure must never undo the approval that already happened.
  }

  try {
    await notifyUser(recommendation.userId.toString(), {
      title: "Your recommendation is live!",
      body: `"${recommendation.title}" was approved and is now visible on the recommendations board.`,
      url: "/recommendations",
    });
  } catch {
    // Best-effort — a push failure must never undo the approval that already happened.
  }

  return NextResponse.json({ recommendation });
}

// DELETE: reject — silently discard, no reason stored or shown to the
// submitter (product decision: keep this low-friction for a low-stakes board).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await dbConnect();

  const recommendation = await Recommendation.findByIdAndDelete(id);
  if (!recommendation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
