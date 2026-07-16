import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";

const settingsSchema = z.object({
  name: z.string().min(1).max(80),
  gender: z.enum(["female", "male", "other"]),
  year: z.enum(["UG-1", "UG-2", "UG-3", "UG-4", "PG-1", "PG-2"]),
  program: z.enum(["UG", "PG"]),
  phone: z.string().min(7).max(15),
  nonEssentialEmailOptIn: z.boolean(),
  contactShareDefaultConsent: z.boolean(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = settingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
