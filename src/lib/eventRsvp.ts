import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";

export type EventRsvpResult =
  | { ok: true; rsvp: unknown; event?: unknown }
  | { ok: false; error: string; status: number };

export type EventLeaveResult = { ok: true } | { ok: false; error: string; status: number };

// Puts spots back and flips a "full" event back to "open" if it's no longer
// at capacity — the inverse of the atomic claim in joinEvent below.
async function releaseSpots(eventId: unknown, amount: number) {
  const updated = await Event.findOneAndUpdate(
    { _id: eventId },
    { $inc: { spotsRemaining: amount } },
    { new: true }
  );
  if (updated && updated.status === "full" && updated.spotsRemaining! > 0) {
    updated.status = "open";
    await updated.save();
  }
}

// Core RSVP logic, factored out of the API route so it can be exercised
// directly by tests without needing to fake a Next.js request/session. See
// docs/SPEC.md's Events section for the concurrency requirement this
// implements — mirrors src/lib/tripRequests.ts's seat-claim pattern, except
// the claim size is the party's own size (RSVP is open, no host approval) and
// a capacity-less event skips the atomic step entirely.
export async function joinEvent(
  eventId: string,
  userId: string,
  partySize: number
): Promise<EventRsvpResult> {
  const event = await Event.findById(eventId);
  if (!event || !["open", "full"].includes(event.status)) {
    return { ok: false, error: "event not available", status: 404 };
  }
  if (event.hostId.toString() === userId) {
    return { ok: false, error: "cannot RSVP to your own event", status: 400 };
  }

  // Checked before touching capacity so a duplicate RSVP never claims (and
  // then has to release) spots it was never going to keep.
  const existing = await EventRSVP.findOne({ eventId: event._id, userId });
  if (existing) {
    return { ok: false, error: "you already RSVP'd to this event", status: 409 };
  }

  let updatedEvent = event;
  if (event.capacity != null) {
    // Atomically claim `partySize` spots so concurrent RSVPs can never
    // overbook the last few spots.
    const claimed = await Event.findOneAndUpdate(
      { _id: event._id, spotsRemaining: { $gte: partySize } },
      { $inc: { spotsRemaining: -partySize } },
      { new: true }
    );
    if (!claimed) {
      return { ok: false, error: "not enough spots remaining", status: 409 };
    }
    updatedEvent = claimed;
    if (updatedEvent.spotsRemaining === 0) {
      updatedEvent.status = "full";
      await updatedEvent.save();
    }
  }

  let rsvp;
  try {
    rsvp = await EventRSVP.create({ eventId: event._id, userId, partySize });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      // Lost a race to a concurrent RSVP from the same user — give back
      // whatever spots we just claimed.
      if (event.capacity != null) {
        await releaseSpots(event._id, partySize);
      }
      return { ok: false, error: "you already RSVP'd to this event", status: 409 };
    }
    throw err;
  }

  return { ok: true, rsvp, event: updatedEvent };
}

export async function leaveEvent(eventId: string, userId: string): Promise<EventLeaveResult> {
  const rsvp = await EventRSVP.findOneAndDelete({ eventId, userId });
  if (!rsvp) {
    return { ok: false, error: "you haven't RSVP'd to this event", status: 404 };
  }

  const event = await Event.findById(eventId);
  if (event && event.capacity != null) {
    await releaseSpots(event._id, rsvp.partySize);
  }

  return { ok: true };
}
