"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";
import BottomTabBar from "./BottomTabBar";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes standard pattern: theme is unknown until mounted, so render a
  // fixed-size placeholder first to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className="inline-block h-6 w-6" aria-hidden />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-6 w-6 items-center justify-center leading-none"
    >
      {theme === "dark" ? (
        // Sun icon
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon icon
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M17 11.3A7 7 0 018.7 3 7 7 0 1017 11.3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold text-brand-700 dark:text-brand-500">
            CoRide
          </Link>

          {/* Desktop: brand · one primary CTA · low-frequency icons · account */}
          <div className="hidden items-center gap-3 text-sm sm:flex">
            <Link
              href="/trips/new"
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              List a trip
            </Link>
            {session?.user && <NotificationBell />}
            <ThemeToggle />
            {session?.user && <AccountMenu variant="desktop" />}
          </div>

          {/* Mobile: slim header — bell + theme only, everything else lives in the bottom tab bar */}
          <div className="flex items-center gap-2 sm:hidden">
            {session?.user && <NotificationBell />}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {session?.user && <BottomTabBar />}
    </>
  );
}
