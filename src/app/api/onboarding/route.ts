import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { track } from "@/lib/analytics";
import { PROGRAMS, YEARS, YEAR_OPTIONS_BY_PROGRAM } from "@/lib/constants";

const onboardingSchema = z
  .object({
    gender: z.enum(["female", "male", "other"]),
    phone: z.string().min(7).max(15),
    year: z.enum(YEARS),
    program: z.enum(PROGRAMS),
    contactShareDefaultConsent: z.boolean(),
  })
  .refine((data) => (YEAR_OPTIONS_BY_PROGRAM[data.program] as readonly string[]).includes(data.year), {
    message: "Year doesn't match the selected program",
    path: ["year"],
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
