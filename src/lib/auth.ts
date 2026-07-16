import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { track } from "@/lib/analytics";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Nudges Google to only show accounts on the institute's Workspace domain.
      // This is a UX hint, NOT the security boundary — the signIn callback below
      // is what actually enforces the restriction server-side.
      authorization: {
        params: { hd: ALLOWED_EMAIL_DOMAIN },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, trigger }) {
      // Re-check onboarded status on session refresh (e.g. right after the
      // onboarding form is submitted, the client calls `update()`).
      if (token.email && (trigger === "update" || token.onboarded === undefined)) {
        await dbConnect();
        const dbUser = await User.findOne({ email: (token.email as string).toLowerCase() });
        token.onboarded = dbUser?.onboarded ?? false;
        token.uid = dbUser?._id?.toString();
      }
      return token;
    },
    async signIn({ profile }) {
      const email = profile?.email;
      if (!email || !email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
        return false;
      }

      await dbConnect();
      const existing = await User.findOne({ googleId: profile.sub });
      if (!existing) {
        const newUser = await User.findOneAndUpdate(
          { googleId: profile?.sub },
          {
            $setOnInsert: {
              googleId: profile.sub,
              email: email.toLowerCase(),
              name: profile.name,
              image: (profile as { picture?: string }).picture,
            },
          },
          { upsert: true, new: true }
        );
        track(newUser._id.toString(), "signup");
      }

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (dbUser) {
          session.user.id = dbUser._id.toString();
          session.user.onboarded = dbUser.onboarded;
          session.user.gender = dbUser.gender;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
