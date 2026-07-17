import crypto from "crypto";
import { User } from "@/models/User";
import { JoinRequest } from "@/models/JoinRequest";
import { CompanionInvite } from "@/models/CompanionInvite";
import { sendEmail } from "@/lib/email";
import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

type Trip = {
  _id: unknown;
  hostId: unknown;
  pickupLocation: string;
  destination: string;
  departureTime: Date;
};

// Resolves each companion email the host entered at trip creation: an existing
// user is linked immediately (an auto-accepted JoinRequest — their seat was
// already reserved via numTravelers, this just creates the record so they show
// up like any other accepted rider and their contact info follows the same
// consent-gated reveal logic). An email with no account gets a CompanionInvite
// + an emailed claim link instead; claiming happens in the /invite/[token] route.
export async function resolveCompanions(
  trip: Trip,
  hostId: string,
  emails: string[]
) {
  const now = new Date();

  await Promise.all(
    emails.map(async (rawEmail) => {
      const email = rawEmail.trim().toLowerCase();
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Bypasses the request/accept flow entirely — the host already vouched
        // for this person by inviting them, so no separate approval step.
        await JoinRequest.create({
          tripId: trip._id,
          riderId: existingUser._id,
          status: "accepted",
          expiresAt: trip.departureTime,
          respondedAt: now,
        });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(
        Math.min(
          trip.departureTime.getTime(),
          now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        )
      );

      await CompanionInvite.create({
        tripId: trip._id,
        invitedByHostId: hostId,
        email,
        token,
        expiresAt,
      });

      const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${token}`;
      await sendEmail(
        email,
        "You've been added to a trip on Campus Travel",
        `A fellow student added you as a co-traveller for a ride from ${trip.pickupLocation} to ${trip.destination}.\n\n` +
          `Sign in with your @iitdh.ac.in account to confirm your seat:\n${inviteUrl}\n\n` +
          `This link expires ${expiresAt.toLocaleString()}.`
      );
    })
  );
}
