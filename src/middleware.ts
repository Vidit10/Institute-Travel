import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) return NextResponse.next();

    const onboarded = token.onboarded as boolean | undefined;

    if (!onboarded && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", req.url));
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

export const config = {
  matcher: ["/", "/onboarding", "/trips/:path*", "/settings"],
};
