"use client";

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

// Frequent off-app/support actions — bus tracking, the outing-registration
// portal, and a locally-stored ID for security checks. Events deliberately
// does NOT live here: it's a full content type (its own create/RSVP/detail
// flow, a peer to Trips/Recommendations), not a utility link, so it gets its
// own home-page section (UpcomingEvents) instead of a tile in this row.
export default function QuickActions() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
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
    </div>
  );
}
