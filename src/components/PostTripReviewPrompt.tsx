"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_PREFIX = "reviewPromptDismissed:";

type PendingTrip = { _id: string; pickupLocation: string; departureTime: string };

// Push already nudges toward the review page (see the cron), but not
// everyone has push enabled — this is the same nudge, in-app, so it reaches
// people regardless. Shown once per trip; dismissing remembers that trip
// specifically (localStorage), not "forever."
export default function PostTripReviewPrompt({
  onResolved,
}: {
  // Fires once we know whether this popup will show — lets the home page
  // hold off on any other popup (e.g. InviteFriendsPrompt) until this one
  // has had first refusal, so the two never stack.
  onResolved?: (showing: boolean) => void;
}) {
  const [trip, setTrip] = useState<PendingTrip | null>(null);

  useEffect(() => {
    fetch("/api/trips/pending-review")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const t = data?.trip;
        const willShow = !!(t && typeof window !== "undefined" && !localStorage.getItem(DISMISSED_PREFIX + t._id));
        if (willShow) setTrip(t);
        onResolved?.(willShow);
      })
      .catch(() => onResolved?.(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (trip) localStorage.setItem(DISMISSED_PREFIX + trip._id, "1");
    setTrip(null);
  }

  if (!trip) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold">Thanks for riding with CoRide 🙌</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          You recently wrapped up a trip from {trip.pickupLocation} — we really appreciate you
          taking the time to use CoRide. Got 2 minutes to tell us how it went? It genuinely
          helps us make this better.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Maybe later
          </button>
          <Link
            href={`/trips/${trip._id}/review`}
            onClick={dismiss}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
          >
            Sure, 2 minutes
          </Link>
        </div>
      </div>
    </div>
  );
}
