import { describe, it, expect } from "vitest";
import "./setup";
import { User } from "@/models/User";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { CompanionInvite } from "@/models/CompanionInvite";
import { resolveCompanions } from "@/lib/companionInvites";

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

async function makeTrip(hostId: string, numTravelers: number, capacity: number) {
  return Trip.create({
    hostId,
    mode: "train",
    vehicleType: "Cab (5-seater)",
    pickupLocation: "Dharwad Railway Station",
    departureTime: new Date(Date.now() + 60 * 60 * 1000),
    totalCapacity: capacity,
    seatsRemaining: capacity - numTravelers,
    numTravelers,
    expectedFare: 300,
  });
}

describe("resolveCompanions", () => {
  it("auto-accepts a companion who already has an account", async () => {
    const host = await makeUser("host@iitdh.ac.in");
    const companion = await makeUser("companion@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 2, 4);

    await resolveCompanions(trip, host._id.toString(), ["companion@iitdh.ac.in"]);

    const joinRequest = await JoinRequest.findOne({ tripId: trip._id, riderId: companion._id });
    expect(joinRequest?.status).toBe("accepted");

    const invites = await CompanionInvite.find({ tripId: trip._id });
    expect(invites).toHaveLength(0);
  });

  it("creates a pending invite for an email with no account yet", async () => {
    const host = await makeUser("host2@iitdh.ac.in");
    const trip = await makeTrip(host._id.toString(), 2, 4);

    await resolveCompanions(trip, host._id.toString(), ["notyetregistered@iitdh.ac.in"]);

    const invite = await CompanionInvite.findOne({ tripId: trip._id });
    expect(invite?.status).toBe("pending");
    expect(invite?.email).toBe("notyetregistered@iitdh.ac.in");
    expect(invite?.token).toBeTruthy();

    const requests = await JoinRequest.find({ tripId: trip._id });
    expect(requests).toHaveLength(0);
  });
});
