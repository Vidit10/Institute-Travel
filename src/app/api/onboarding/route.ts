import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";

const onboardingSchema = z.object({
  gender: z.enum(["female", "male", "other"]),
  phone: z.string().min(7).max(15),
  year: z.enum(["UG-1", "UG-2", "UG-3", "UG-4", "PG-1", "PG-2"]),
  program: z.enum(["UG", "PG"]),
  nonEssentialEmailOptIn: z.boolean(),
  contactShareDefaultConsent: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = onboardingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, {
    ...parsed.data,
    onboarded: true,
  });

  track(session.user.id, "onboarding_completed");

  return NextResponse.json({ ok: true });
}
