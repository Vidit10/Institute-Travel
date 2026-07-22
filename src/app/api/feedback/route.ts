import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Feedback } from "@/models/Feedback";
import { track } from "@/lib/analytics";
import { rateLimitOrRespond } from "@/lib/rateLimit";

const feedbackSchema = z.object({
  category: z.enum(["recommendation", "bug", "report", "profile_correction", "other"]),
  message: z.string().min(1).max(2000),
  contextLabel: z.string().max(200).optional(),
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

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "feedback:create");
  if (limited) return limited;

  await Feedback.create({
    userId: session.user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    contextLabel: parsed.data.contextLabel,
  });

  track(session.user.id, "feedback_submitted", { category: parsed.data.category });

  return NextResponse.json({ ok: true }, { status: 201 });
}
