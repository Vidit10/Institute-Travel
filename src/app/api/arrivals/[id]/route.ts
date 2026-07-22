import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { ArrivalIntent } from "@/models/ArrivalIntent";

// Withdraws the caller's own arrival-board entry (e.g. once they've sorted
// their ride out some other way). Only the poster can withdraw it.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const entry = await ArrivalIntent.findOne({ _id: id, userId: session.user.id });
  if (!entry) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  entry.status = "withdrawn";
  await entry.save();

  return NextResponse.json({ ok: true });
}
