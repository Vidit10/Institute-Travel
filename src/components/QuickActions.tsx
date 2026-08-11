"use client";

import IDCardViewer from "@/components/IDCardViewer";
import InfoTip from "@/components/InfoTip";

const LINK_CLASS =
  "flex w-full flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-700";

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

// A door, not a house — SAM is where you register to leave campus, so an
// exit reads better than a home/tent shape did.
function DoorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="5.5" y="2.5" width="9" height="15" rx="0.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="0.9" fill="currentColor" />
      <path d="M3.5 17.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Info buttons live in a `relative` wrapper around each tile, as a sibling of
// the `<a>`/button rather than nested inside it — an interactive element
// inside another interactive element isn't valid HTML, and would make the
// info tap accidentally trigger the tile's own link/action too.
export default function QuickActions() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="relative">
        <a
          href="https://peg-iitdh.github.io/EDL2025-GPSTracker/HTML/Bus_Tracking.html"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          <BusIcon />
          Bus tracker
        </a>
        <div className="absolute right-0.5 top-0.5">
          <InfoTip text="Opens the institute's live GPS bus tracker in a new tab." align="right" />
        </div>
      </div>

      <div className="relative">
        <a href="https://sam.iitdh.ac.in/" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <DoorIcon />
          SAM portal
        </a>
        <div className="absolute right-0.5 top-0.5">
          <InfoTip text="Opens the official SAM outing-registration site in a new tab — sign in with your institute Google account there." align="right" />
        </div>
      </div>

      <div className="relative">
        <IDCardViewer trigger="card" />
        <div className="absolute right-0.5 top-0.5">
          <InfoTip text="Saves a photo of your ID on this device only — never uploaded anywhere — for quick access at security checks." align="right" />
        </div>
      </div>
    </div>
  );
}
