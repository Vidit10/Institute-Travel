"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";
import BottomTabBar from "./BottomTabBar";
import HelpButton from "./HelpButton";
import { ThemeToggle } from "./ThemeToggle";
import { BookmarkMenuIcon, CalendarMenuIcon } from "./icons";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold text-brand-700 dark:text-brand-500">
            CoRide
          </Link>

          {/* Desktop: brand · content buttons · divider · utility icons+account.
              ThemeToggle deliberately isn't here — it moved into AccountMenu
              (a one-time-ish preference, not glanceable state like
              notifications) specifically to keep this row from growing
              wider as Help/etc. pick up text labels. */}
          <div className="hidden items-center gap-3 text-sm sm:flex">
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              <BookmarkMenuIcon />
              Recommendations
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-600 px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-950"
            >
              <CalendarMenuIcon />
              Events
            </Link>
            {session?.user && (
              <span className="h-5 w-px bg-gray-200 dark:bg-gray-800" aria-hidden />
            )}
            {session?.user && <NotificationBell />}
            {session?.user && <HelpButton />}
            {session?.user && <AccountMenu variant="desktop" />}
          </div>

          {/* Mobile: slim header — bell + help + theme only, everything else lives in the bottom tab bar */}
          <div className="flex items-center gap-2 sm:hidden">
            {session?.user && <NotificationBell />}
            {session?.user && <HelpButton />}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {session?.user && <BottomTabBar />}
    </>
  );
}
