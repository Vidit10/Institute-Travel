import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) return NextResponse.next();

    const admin = isAdminEmail(token.email as string | undefined);

    if (pathname.startsWith("/admin")) {
      // Non-admin users (including regular students) never see the dashboard —
      // enforced again server-side in every /api/admin/* route, this is just
      // the redirect-before-render layer.
      if (!admin) return NextResponse.redirect(new URL("/", req.url));
      return NextResponse.next();
    }

    const onboarded = token.onboarded as boolean | undefined;

    if (!onboarded && pathname !== "/onboarding") {
      // Preserve where the user was headed (e.g. a companion-invite link) so
      // onboarding can send them there afterward instead of always to "/".
      const onboardingUrl = new URL("/onboarding", req.url);
      onboardingUrl.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(onboardingUrl);
    }
    if (onboarded && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Deny-by-default: every page is gated unless explicitly excluded here, rather
// than an allow-list of gated routes that silently misses any new page someone
// forgets to add (that's exactly how /recommendations ended up reachable
// without logging in). Excluded: the login page itself, all of /api/* (every
// API route already enforces its own session/CRON_SECRET check — see e.g.
// src/app/api/cron/expire-requests/route.ts, which must stay reachable by an
// external scheduler with no user session at all), and static assets.
export const config = {
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico|icon.svg|manifest.json|sw.js).*)",
  ],
};
