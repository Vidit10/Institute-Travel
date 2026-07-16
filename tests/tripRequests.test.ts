import { describe, it, expect } from "vitest";
import "./setup";
import { User } from "@/models/User";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { respondToJoinRequest } from "@/lib/tripRequests";
import { sweepExpired } from "@/lib/expireRequests";

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

async function makeTrip(hostId: string, capacity = 1) {
  return Trip.create({
    hostId,
    mode: "train",
    vehicleType: "Cab",
    pickupLocation: "Dharwad Railway Station",
    destination: "IIT Dharwad Main Gate",
    departureTime: new Date(Date.now() + 60 * 60 * 1000),
    totalCapacity: capacity,
    seatsRemaining: capacity,
  });
}

describe("respondToJoinRequest — concurrency", () => {
  it("never lets two concurrent accepts overbook the last seat", async () => {
    const host = await makeUser("host@iitdh.ac.in");
    const riderA = await makeUser("ridera@iitdh.ac.in");
    const riderB = await makeUser("riderb@iitdh.ac.in");

    const trip = await makeTrip(host._id.toString(), 1); // only 1 seat

    const reqA = await JoinRequest.create({
      tripId: trip._id,
      riderId: riderA._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const reqB = await JoinRequest.create({
      tripId: trip._id,
      riderId: riderB._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // Simulate both accepts firing at nearly the same time.
    const [resultA, resultB] = await Promise.all([
      respondToJoinRequest(trip._id.toString(), reqA._id.toString(), host._id.toString(), "accept"),
      respondToJoinRequest(trip._id.toString(), reqB._id.toString(), host._id.toString(), "accept"),
    ]);

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => r.ok);
    const failed = outcomes.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (!failed[0].ok) {
      expect(failed[0].error).toBe("no seats remaining");
    }

    const finalTrip = await Trip.findById(trip._id);
    expect(finalTrip!.seatsRemaining).toBe(0);
    expect(finalTrip!.status).toBe("full");
  });

  it("declining a request does not touch seat count", async () => {
    const host = await makeUser("host2@iitdh.ac.in");
    const rider = await makeUser("rider2@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 2);

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await respondToJoinRequest(trip._id.toString(), req._id.toString(), host._id.toString(), "decline");
    expect(result.ok).toBe(true);

    const finalTrip = await Trip.findById(trip._id);
    expect(finalTrip!.seatsRemaining).toBe(2);
  });

  it("rejects a non-host trying to respond", async () => {
    const host = await makeUser("host3@iitdh.ac.in");
    const rider = await makeUser("rider3@iitdh.ac.in");
    const stranger = await makeUser("stranger3@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 1);

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await respondToJoinRequest(trip._id.toString(), req._id.toString(), stranger._id.toString(), "accept");
    expect(result.ok).toBe(false);
  });
});

describe("request expiry", () => {
  it("sweeps a stale pending request to expired", async () => {
    const host = await makeUser("host4@iitdh.ac.in");
    const rider = await makeUser("rider4@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 1);

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() - 1000), // already in the past
    });

    await sweepExpired();

    const updated = await JoinRequest.findById(req._id);
    expect(updated!.status).toBe("expired");
  });

  it("allows a rider to re-request the same trip after their prior request expired", async () => {
    const host = await makeUser("host5@iitdh.ac.in");
    const rider = await makeUser("rider5@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 1);

    await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      status: "expired",
      expiresAt: new Date(Date.now() - 1000),
    });

    // Should not throw a duplicate-key error thanks to the partial unique index.
    const second = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    expect(second.status).toBe("pending");
  });

  it("blocks a second active request while one is already pending", async () => {
    const host = await makeUser("host6@iitdh.ac.in");
    const rider = await makeUser("rider6@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 1);

    await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      JoinRequest.create({
        tripId: trip._id,
        riderId: rider._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    ).rejects.toThrow();
  });
});

describe("girls-only visibility", () => {
  it("marks a trip girls-only and stores the flag", async () => {
    const host = await makeUser("hostf@iitdh.ac.in", { gender: "female" });
    const trip = await Trip.create({
      hostId: host._id,
      mode: "bus",
      vehicleType: "Tumtum",
      pickupLocation: "Jubilee Circle",
      destination: "IIT Dharwad Hostels",
      departureTime: new Date(Date.now() + 60 * 60 * 1000),
      totalCapacity: 3,
      seatsRemaining: 3,
      girlsOnly: true,
    });

    const found = await Trip.findById(trip._id);
    expect(found!.girlsOnly).toBe(true);
  });
});
