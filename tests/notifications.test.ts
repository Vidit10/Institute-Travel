import { describe, it, expect } from "vitest";
import "./setup";
import { User } from "@/models/User";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { respondToJoinRequest } from "@/lib/tripRequests";

async function makeUser(email: string) {
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
  });
}

async function makeTrip(hostId: string, capacity = 3) {
  return Trip.create({
    hostId,
    mode: "train",
    vehicleType: "Cab (5-seater)",
    pickupLocation: "Dharwad Railway Station",
    departureTime: new Date(Date.now() + 60 * 60 * 1000),
    totalCapacity: capacity,
    seatsRemaining: capacity - 1,
    numTravelers: 1,
    expectedFare: 300,
  });
}

describe("notification seen-state", () => {
  it("a new join request starts unseen by the host, seen by the rider", async () => {
    const host = await makeUser("host@iitdh.ac.in");
    const rider = await makeUser("rider@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString());

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    expect(req.hostSeen).toBe(false);
    expect(req.riderSeen).toBe(true);
  });

  it("accepting a request flips riderSeen to false so the rider is notified", async () => {
    const host = await makeUser("host2@iitdh.ac.in");
    const rider = await makeUser("rider2@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString());

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await respondToJoinRequest(trip._id.toString(), req._id.toString(), host._id.toString(), "accept");
    expect(result.ok).toBe(true);

    const updated = await JoinRequest.findById(req._id);
    expect(updated!.riderSeen).toBe(false);
  });

  it("declining a request also flips riderSeen to false", async () => {
    const host = await makeUser("host3@iitdh.ac.in");
    const rider = await makeUser("rider3@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString());

    const req = await JoinRequest.create({
      tripId: trip._id,
      riderId: rider._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await respondToJoinRequest(trip._id.toString(), req._id.toString(), host._id.toString(), "decline");

    const updated = await JoinRequest.findById(req._id);
    expect(updated!.riderSeen).toBe(false);
  });
});
