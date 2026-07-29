import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Recommendation } from "@/models/Recommendation";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/admin";
import { recommendationFieldsSchema } from "@/lib/recommendationValidation";

// GET: every *approved* recommendation, newest first — same login-gate as the
// rest of the app, no other visibility rules beyond moderation status (unlike
// trips/arrivals, this isn't sensitive content, so no girls-only-style
// filtering applies here). Pending submissions are only visible via the
// admin-only /api/admin/recommendations queue.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const recommendationDocs = await Recommendation.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();

  // Admin-authored posts show as "Admin" on the public board — the real name
  // never reaches the client, not just hidden client-side.
  const recommendations = recommendationDocs.map((r) => {
    const user = r.userId as unknown as { name?: string; email?: string } | undefined;
    if (user && isAdminEmail(user.email)) {
      return { ...r, userId: { ...user, name: "Admin" } };
    }
    return r;
  });

  return NextResponse.json({ recommendations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "recommendations:create");
  if (limited) return limited;

  const parsed = recommendationFieldsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recommendation = await Recommendation.create({
    userId: session.user.id,
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
    // Never trust a client-supplied status — every new post starts pending,
    // regardless of what's sent. Goes live only once an admin approves it.
    status: "pending",
  });

  track(session.user.id, "recommendation_posted", { category: parsed.data.category });

  return NextResponse.json({ recommendation }, { status: 201 });
}
