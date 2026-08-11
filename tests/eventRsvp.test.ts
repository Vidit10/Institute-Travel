import { describe, it, expect } from "vitest";
import "./setup";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { EventRSVP } from "@/models/EventRSVP";
import { joinEvent, leaveEvent } from "@/lib/eventRsvp";

async function makeUser(email: string, overrides: Record<string, unknown> = {}) {
  return User.create({
    email,
    name: email,
    googleId: email,
    onboarded: true,
    gender: "male",
    phone: "9000000000",
    year: "UG-1",
    program: "UG",
    contactShareDefaultConsent: true,
    ...overrides,
  });
}

async function makeEvent(hostId: string, capacity: number | null = null) {
  return Event.create({
    hostId,
    title: "Cricket match",
    category: "sports",
    location: "Sports ground",
    startTime: new Date(Date.now() + 60 * 60 * 1000),
    capacity,
    spotsRemaining: capacity,
  });
}

describe("joinEvent — concurrency", () => {
  it("never lets two concurrent RSVPs overbook the last spot", async () => {
    const host = await makeUser("host@iitdh.ac.in");
    const riderA = await makeUser("ridera@iitdh.ac.in");
    const riderB = await makeUser("riderb@iitdh.ac.in");

    const event = await makeEvent(host._id.toString(), 1); // only 1 spot

    const [resultA, resultB] = await Promise.all([
      joinEvent(event._id.toString(), riderA._id.toString(), 1),
      joinEvent(event._id.toString(), riderB._id.toString(), 1),
    ]);

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => r.ok);
    const failed = outcomes.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (!failed[0].ok) {
      expect(failed[0].error).toBe("not enough spots remaining");
    }

    const finalEvent = await Event.findById(event._id);
    expect(finalEvent!.spotsRemaining).toBe(0);
    expect(finalEvent!.status).toBe("full");
  });

  it("a party size larger than remaining spots is rejected", async () => {
    const host = await makeUser("host2@iitdh.ac.in");
    const rider = await makeUser("rider2@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), 2);

    const result = await joinEvent(event._id.toString(), rider._id.toString(), 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not enough spots remaining");

    const finalEvent = await Event.findById(event._id);
    expect(finalEvent!.spotsRemaining).toBe(2);
  });

  it("allows unlimited RSVPs when capacity is null", async () => {
    const host = await makeUser("host3@iitdh.ac.in");
    const rider = await makeUser("rider3@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), null);

    const result = await joinEvent(event._id.toString(), rider._id.toString(), 5);
    expect(result.ok).toBe(true);

    const finalEvent = await Event.findById(event._id);
    expect(finalEvent!.spotsRemaining).toBeNull();
    expect(finalEvent!.status).toBe("open");
  });

  it("rejects a duplicate RSVP from the same user", async () => {
    const host = await makeUser("host4@iitdh.ac.in");
    const rider = await makeUser("rider4@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), 5);

    const first = await joinEvent(event._id.toString(), rider._id.toString(), 1);
    expect(first.ok).toBe(true);

    const second = await joinEvent(event._id.toString(), rider._id.toString(), 1);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("you already RSVP'd to this event");

    // Capacity should reflect only the one successful RSVP, not two.
    const finalEvent = await Event.findById(event._id);
    expect(finalEvent!.spotsRemaining).toBe(4);
  });

  it("rejects the host RSVPing to their own event", async () => {
    const host = await makeUser("host5@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), 5);

    const result = await joinEvent(event._id.toString(), host._id.toString(), 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("cannot RSVP to your own event");
  });
});

describe("leaveEvent", () => {
  it("releases spots and flips a full event back to open", async () => {
    const host = await makeUser("host6@iitdh.ac.in");
    const rider = await makeUser("rider6@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), 1);

    const joined = await joinEvent(event._id.toString(), rider._id.toString(), 1);
    expect(joined.ok).toBe(true);
    expect((await Event.findById(event._id))!.status).toBe("full");

    const left = await leaveEvent(event._id.toString(), rider._id.toString());
    expect(left.ok).toBe(true);

    const finalEvent = await Event.findById(event._id);
    expect(finalEvent!.spotsRemaining).toBe(1);
    expect(finalEvent!.status).toBe("open");

    const remainingRsvp = await EventRSVP.findOne({ eventId: event._id, userId: rider._id });
    expect(remainingRsvp).toBeNull();
  });

  it("rejects leaving an event you never RSVP'd to", async () => {
    const host = await makeUser("host7@iitdh.ac.in");
    const rider = await makeUser("rider7@iitdh.ac.in");
    const event = await makeEvent(host._id.toString(), 5);

    const result = await leaveEvent(event._id.toString(), rider._id.toString());
    expect(result.ok).toBe(false);
  });
});
