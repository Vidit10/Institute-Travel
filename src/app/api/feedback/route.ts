import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Feedback } from "@/models/Feedback";
import { track } from "@/lib/analytics";

const feedbackSchema = z.object({
  category: z.enum(["recommendation", "bug", "other"]),
  message: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = feedbackSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  await Feedback.create({
    userId: session.user.id,
    category: parsed.data.category,
    message: parsed.data.message,
  });

  track(session.user.id, "feedback_submitted", { category: parsed.data.category });

  return NextResponse.json({ ok: true }, { status: 201 });
}
