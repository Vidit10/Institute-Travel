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

function SignInButton() {
  const params = useSearchParams();
  // Middleware redirects an unauthenticated visit to a protected page (e.g. a
  // shared trip link) here with ?callbackUrl=<original path> — honor it so
  // signing in lands them back where they were headed, not always at "/".
  const callbackUrl = params.get("callbackUrl") || "/";

  return (
    <button
      onClick={() => signIn("google", { callbackUrl })}
      className="mt-8 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
    >
      Continue with Google
    </button>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-500">Campus Travel</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">Campus travel, simplified — for IIT Dharwad.</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">Sign in with your @iitdh.ac.in Google account.</p>
      <Suspense fallback={null}>
        <LoginError />
      </Suspense>
      <Suspense fallback={null}>
        <SignInButton />
      </Suspense>
    </main>
  );
}
