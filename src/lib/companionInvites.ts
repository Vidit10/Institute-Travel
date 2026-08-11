import crypto from "crypto";
import { User } from "@/models/User";
import { JoinRequest } from "@/models/JoinRequest";
import { CompanionInvite } from "@/models/CompanionInvite";
import { INVITE_EXPIRY_DAYS } from "@/lib/constants";

type Trip = {
  _id: unknown;
  hostId: unknown;
  pickupLocation: string;
  destination: string;
  departureTime: Date;
};

export type PendingInviteLink = { email: string; inviteUrl: string };

// Resolves each companion email the host entered at trip creation: an existing,
// already-onboarded user is linked immediately (an auto-accepted JoinRequest —
// their seat was already reserved via numTravelers, this just creates the
// record so they show up like any other accepted rider and their contact info
// follows the same consent-gated reveal logic). An email with no account, or
// one that exists but hasn't finished onboarding yet, gets a CompanionInvite
// instead — claiming happens in the /invite/[token] route (behind the normal
// auth+onboarding gate, so a half-signed-up account can't become a rider
// without a phone/gender/year/program set) — and its link is returned here so
// the caller can show the host a "copy & share this" button; the app sends no
// email at all (product decision), so nothing gets sent automatically to an
// unregistered companion.
export async function resolveCompanions(
  trip: Trip,
  hostId: string,
  emails: string[]
): Promise<PendingInviteLink[]> {
  const now = new Date();
  const pendingLinks: PendingInviteLink[] = [];

  await Promise.all(
    emails.map(async (rawEmail) => {
      const email = rawEmail.trim().toLowerCase();
      const existingUser = await User.findOne({ email });

      // Only auto-link an account that's actually finished onboarding — a User
      // row is created the instant someone signs in with Google, well before
      // they set a phone/gender/year/program, so matching on email alone could
      // silently turn a half-signed-up account into a "confirmed" rider with
      // undefined contact/gender info (breaks the phone reveal and girls-only
      // enforcement, and shows literal "undefined" wherever their year/program
      // is displayed). Treat a not-yet-onboarded match the same as no account:
      // fall through to the claim-link path, which forces onboarding first
      // (the invite page is behind the same auth+onboarding gate as everything
      // else) before they can become a real rider.
      if (existingUser?.onboarded) {
        // Bypasses the request/accept flow entirely — the host already vouched
        // for this person by inviting them, so no separate approval step.
        await JoinRequest.create({
          tripId: trip._id,
          riderId: existingUser._id,
          status: "accepted",
          expiresAt: trip.departureTime,
          respondedAt: now,
          hostSeen: true, // the host just did this themselves
          riderSeen: false, // the companion needs to find out
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
      pendingLinks.push({ email, inviteUrl });
    })
  );

  return pendingLinks;
}
