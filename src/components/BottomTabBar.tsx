"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./AccountMenu";

function tabClass(active: boolean) {
  return `flex flex-col items-center justify-center gap-0.5 text-[11px] ${
    active ? "text-brand-600 dark:text-brand-500" : "text-gray-500 dark:text-gray-400"
  }`;
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 9l7-6 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4.5 8v8h11V8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RidesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8h8M6 11.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-gray-800 dark:bg-gray-900">
      <div className="grid grid-cols-5 items-center px-1 py-2">
        <Link href="/" className={tabClass(pathname === "/")}>
          <HomeIcon />
          Home
        </Link>
        <Link href="/arrivals" className={tabClass(pathname.startsWith("/arrivals"))}>
          <PinIcon />
          Arrivals
        </Link>
        <Link href="/trips/new" className="flex flex-col items-center justify-center" aria-label="List a trip">
          <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
            <PlusIcon />
          </span>
        </Link>
        <Link href="/trips/mine" className={tabClass(pathname.startsWith("/trips/mine") || pathname.startsWith("/trips/requested"))}>
          <RidesIcon />
          My Rides
        </Link>
        <AccountMenu variant="mobile" />
      </div>
    </nav>
  );
}
