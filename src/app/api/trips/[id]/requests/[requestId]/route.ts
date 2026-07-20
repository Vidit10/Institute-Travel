import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { notifyUser } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { respondToJoinRequest } from "@/lib/tripRequests";
import { rateLimitOrRespond } from "@/lib/rateLimit";

// Host accepts or declines a pending request.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, requestId } = await params;
  const { action } = await req.json(); // "accept" | "decline"
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  await dbConnect();

  const limited = await rateLimitOrRespond(session.user.id, session.user.email || "", "trips:respond");
  if (limited) return limited;

  const result = await respondToJoinRequest(id, requestId, session.user.id, action);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const joinRequest = result.joinRequest as { riderId: { toString(): string } };

  track(session.user.id, `join_request_${action === "accept" ? "accepted" : "declined"}`, { tripId: id });
  await notifyUser(joinRequest.riderId.toString(), {
    title: action === "accept" ? "Request accepted!" : "Request declined",
    body:
      action === "accept"
        ? "You're in — contact details are now visible on the trip."
        : "The host declined your request.",
    url: "/trips/requested",
  });

  return NextResponse.json({ joinRequest: result.joinRequest, trip: result.trip });
}
