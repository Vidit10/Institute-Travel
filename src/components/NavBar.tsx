"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

const LINK_CLASS = "text-gray-500 hover:underline dark:text-gray-400";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const links = (
    <>
      <Link href="/trips/new" className="text-brand-600 hover:underline dark:text-brand-500" onClick={() => setMenuOpen(false)}>
        List a trip
      </Link>
      <Link href="/trips/mine" className={LINK_CLASS} onClick={() => setMenuOpen(false)}>
        My trips
      </Link>
      <Link href="/trips/requested" className={LINK_CLASS} onClick={() => setMenuOpen(false)}>
        My requests
      </Link>
      <Link href="/settings" className={LINK_CLASS} onClick={() => setMenuOpen(false)}>
        Settings
      </Link>
      <Link href="/feedback" className={LINK_CLASS} onClick={() => setMenuOpen(false)}>
        Feedback
      </Link>
      {process.env.NEXT_PUBLIC_GITHUB_URL && (
        <a
          href={process.env.NEXT_PUBLIC_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
          onClick={() => setMenuOpen(false)}
        >
          GitHub
        </a>
      )}
      {session?.user && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`${LINK_CLASS} text-left`}
        >
          Sign out
        </button>
      )}
    </>
  );

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-brand-700 dark:text-brand-500" onClick={() => setMenuOpen(false)}>
          Campus Travel
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-4 text-sm sm:flex">
          {links}
          <ThemeToggle />
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-3 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center text-gray-600 dark:text-gray-300"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              {menuOpen ? (
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 text-sm sm:hidden dark:border-gray-800">
          {links}
        </div>
      )}
    </nav>
  );
}
