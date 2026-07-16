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
      className="inline-flex h-6 w-6 items-center justify-center text-base leading-none"
    >
      {theme === "dark" ? "☀️" : "🌙"}
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
      {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
        <a
          href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
          onClick={() => setMenuOpen(false)}
        >
          Feedback
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
