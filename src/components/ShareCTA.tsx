"use client";

import { useState } from "react";

// A small, dismissible, inline nudge shown right after a genuinely positive
// moment (listing a trip, sending a join request) — deliberately not a
// notification and not a popup/modal, since both read as naggy. Just a
// quiet "by the way" next to something the user already chose to do, not
// tracked/suppressed across visits — it's low-stakes enough to just show up
// again next time, unlike InviteFriendsPrompt's one-time modal.
export default function ShareCTA({
  blurb,
  pitch,
  path = "",
}: {
  blurb: string;
  // What actually gets shared (not just the visible blurb) — defaults to the
  // generic ride-sharing pitch if omitted, so existing callers are unaffected.
  pitch?: string;
  // Appended to the origin so the shared link can point at the relevant page
  // (e.g. /recommendations) instead of always the site root.
  path?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [label, setLabel] = useState("Share");

  async function share() {
    const url = window.location.origin + path;
    const shareText = pitch
      ? `${pitch} ${url}`
      : `Come split rides with me on CoRide — it's how IIT Dharwad students find each other to share cabs to/from campus: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "CoRide", text: shareText });
      } catch {
        // User cancelled the native share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setLabel("Copied!");
    } catch {
      setLabel("Couldn't copy");
    }
  }

  if (dismissed) return null;

  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-xs dark:border-brand-900 dark:bg-brand-950/40">
      <span className="text-brand-700 dark:text-brand-400">🎉 {blurb}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={share} className="font-medium text-brand-600 hover:underline dark:text-brand-500">
          {label}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
        >
          ×
        </button>
      </div>
    </div>
  );
}
