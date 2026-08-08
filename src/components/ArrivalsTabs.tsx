"use client";

import { useState } from "react";
import ArrivalsBoard from "@/components/ArrivalsBoard";
import { type ArrivalEntry } from "@/components/ArrivalForm";

const TABS = [
  { key: "here", label: "Outside now" },
  { key: "out", label: "Heading out" },
  { key: "long", label: "Going home" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Renders only the active board instead of stacking all three — the arrivals
// section was the single biggest contributor to the home page's "too much to
// scroll past" problem. Shared arrival-status data still flows down from the
// home page in one fetch, same as before.
export default function ArrivalsTabs(props: {
  isFemale: boolean;
  girlsOnlyDefault: boolean;
  myEntries: ArrivalEntry[];
  onPosted: () => void;
  onWithdrawn: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("here");

  return (
    <div className="mt-4">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 text-sm dark:bg-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-2 py-1.5 font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-brand-600 shadow-sm dark:bg-gray-900 dark:text-brand-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "here" && (
          <ArrivalsBoard
            listingType="local"
            initialDirection="to-campus"
            title="Are you outside right now?"
            blurb="Let the community know and find fellow folks who might be returning as well, and pool a ride with them."
            {...props}
          />
        )}
        {tab === "out" && (
          <ArrivalsBoard
            listingType="local"
            initialDirection="from-campus"
            title="Heading out?"
            blurb="Haven't booked a vehicle yet — say so and find fellow folks who might want to share the ride out."
            {...props}
          />
        )}
        {tab === "long" && (
          <ArrivalsBoard
            listingType="long-distance"
            initialDirection="to-campus"
            allowDirectionToggle
            showClusterExpansion
            title="Going home or coming back?"
            blurb="For longer trips — train, flight, or bus. Log your travel time and see who else is around."
            {...props}
          />
        )}
      </div>
    </div>
  );
}
