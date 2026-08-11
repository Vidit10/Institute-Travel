import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { Recommendation } from "@/models/Recommendation";

// GET: every pending recommendation, oldest first (first-in-first-reviewed) —
// admin-only, re-checked here independent of any client-side gate, same
// pattern as src/app/api/admin/metrics/route.ts. Real submitter name shown
// (not masked to "Admin") since this view only ever reaches admins anyway.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await dbConnect();
  const recommendations = await Recommendation.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .populate("userId", "name email")
    .lean();

  return NextResponse.json({ recommendations });
}
