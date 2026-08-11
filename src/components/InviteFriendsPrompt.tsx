"use client";

import { useEffect, useState } from "react";

// A one-time (server-tracked, see /api/invite-friends-prompt) nudge for the
// cold-start problem: too few people on the platform yet means thin match
// results, which isn't a "the app is bad" problem, it's a "not enough
// people yet" problem — so ask them to invite people rather than let them
// quietly conclude the app doesn't work.
export default function InviteFriendsPrompt({ enabled = true }: { enabled?: boolean }) {
  const [show, setShow] = useState(false);
  const [shareLabel, setShareLabel] = useState("Invite friends");

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/invite-friends-prompt")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.show) {
          setShow(true);
          fetch("/api/invite-friends-prompt", { method: "POST" }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [enabled]);

  async function inviteFriends() {
    const url = window.location.origin;
    const shareText = `Come join me on CoRide — it's how IIT Dharwad students find each other to split cabs to/from campus. The more of us on it, the better it works for everyone: ${url}`;

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
      setShareLabel("Copied! Paste it to a friend.");
    } catch {
      setShareLabel("Couldn't copy — copy the link manually");
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => setShow(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold">CoRide works better with more of you on it 🚀</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          There just aren&apos;t that many people posted yet, so matches can be thin right now
          — that&apos;s an early-days thing, not a you thing. Ask your friends and roommates to
          join and you&apos;ll start seeing a lot more people to split rides with. More is on
          the way too, aimed at making the whole semester easier, not just move-in day.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShow(false)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Got it
          </button>
          <button
            onClick={inviteFriends}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {shareLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
