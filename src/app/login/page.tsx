"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// Human-readable messages for NextAuth's ?error= codes, so a failed sign-in
// never looks like a silent loop back to this page.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Only @iitdh.ac.in accounts can sign in. Use your institute Google account.",
  Callback:
    "Sign-in failed on the server — likely a configuration issue. If you're the developer, check the server logs.",
  Configuration:
    "The server is misconfigured (missing credentials). If you're the developer, check .env.local.",
  OAuthCallback:
    "Google sign-in could not be completed. Try again in a moment.",
};

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  return (
    <p className="mt-4 max-w-sm break-words rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
      {ERROR_MESSAGES[error] || `Sign-in failed (${error}). Please try again.`}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.9A9 9 0 000 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function SignInButton() {
  const params = useSearchParams();
  // Middleware redirects an unauthenticated visit to a protected page (e.g. a
  // shared trip link) here with ?callbackUrl=<original path> — honor it so
  // signing in lands them back where they were headed, not always at "/".
  const callbackUrl = params.get("callbackUrl") || "/";

  return (
    <button
      onClick={() => signIn("google", { callbackUrl })}
      className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition-shadow hover:bg-brand-700 hover:shadow-md"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}

// A simple stroke-based mark, consistent with the icon style used elsewhere
// in the app (QuickActions/HelpButton/BottomTabBar — strokeWidth 1.5) rather
// than a new illustration/asset, so the login screen has a visual anchor
// without adding real image weight.
function BrandMark() {
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-500">
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 17V8l6-4.5L16 8v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="10.2" r="8.4" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 3" opacity="0.5" />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Purely decorative, low-opacity color blobs — no image asset, kept
          subtle so it doesn't compete with the sign-in card or slow the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-800/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-900/20"
      />

      <div className="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <BrandMark />
        <h1 className="mt-4 text-2xl font-bold text-brand-700 dark:text-brand-500">CoRide</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Campus travel, simplified — for IIT Dharwad.</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">Sign in with your @iitdh.ac.in Google account.</p>
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>
        <Suspense fallback={null}>
          <SignInButton />
        </Suspense>
      </div>

      <p className="relative mt-6 text-[11px] text-gray-400 dark:text-gray-600">
        Curated by{" "}
        <a href="mailto:mc23bt010@iitdh.ac.in" className="hover:underline">
          Vidit Parikh
        </a>{" "}
        and{" "}
        <a href="mailto:cs23bt069@iitdh.ac.in" className="hover:underline">
          Yash Halbhavi
        </a>
      </p>
    </main>
  );
}
