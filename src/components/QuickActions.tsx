"use client";

import Link from "next/link";
import IDCardViewer from "@/components/IDCardViewer";

const LINK_CLASS =
  "flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-700";

function BusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="15.5" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="15.5" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function OutingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 17V8l6-4.5L16 8v9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="12.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7.5h14M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="11" r="1" fill="currentColor" />
      <circle cx="13" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

// Frequent off-app actions (and, since Events was otherwise buried two taps
// deep in the Account menu on mobile, one in-app shortcut too) students need
// alongside the ride-sharing flow — kept as a compact row rather than folded
// into the bottom tab bar, which is reserved for the app's own 5 core
// sections.
export default function QuickActions() {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      <a
        href="https://peg-iitdh.github.io/EDL2025-GPSTracker/HTML/Bus_Tracking.html"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        <BusIcon />
        Bus tracker
      </a>
      <a href="https://sam.iitdh.ac.in/" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        <OutingIcon />
        SAM portal
      </a>
      <IDCardViewer trigger="card" />
      <Link href="/events" className={LINK_CLASS}>
        <EventIcon />
        Events
      </Link>
    </div>
  );
}
