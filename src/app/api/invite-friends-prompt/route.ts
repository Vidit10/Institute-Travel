import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";

// GET: whether the "ask your friends" nudge should show for this user —
// only onboarded users, and only if they haven't seen it before.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const userDoc = await User.findById(session.user.id).select("onboarded inviteFriendsPromptShown").lean();
  const user = userDoc as unknown as { onboarded?: boolean; inviteFriendsPromptShown?: boolean } | null;

  return NextResponse.json({ show: !!user?.onboarded && !user?.inviteFriendsPromptShown });
}

// POST: mark it as shown — called once the popup actually renders, so a
// user never sees it a second time regardless of how they dismiss it.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, { inviteFriendsPromptShown: true });

  return NextResponse.json({ ok: true });
}
