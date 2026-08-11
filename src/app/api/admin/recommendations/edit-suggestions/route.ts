import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { RecommendationEditSuggestion } from "@/models/RecommendationEditSuggestion";

// GET: every pending edit suggestion, oldest first — admin-only, same pattern
// as src/app/api/admin/recommendations/route.ts. Populates both the proposed
// fields (on the doc itself) and the current live recommendation, so the
// admin UI can show a before/after diff.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await dbConnect();
  const suggestions = await RecommendationEditSuggestion.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .populate("suggestedBy", "name email")
    .populate("recommendationId")
    .lean();

  return NextResponse.json({ suggestions });
}
