"use client";

import { useState } from "react";
import Link from "next/link";
import ArrivalsBoard from "@/components/ArrivalsBoard";
import { type ArrivalEntry } from "@/components/ArrivalForm";

const TABS = [
  { key: "here", label: "Outside now" },
  { key: "out", label: "Heading out" },
  { key: "long", label: "Going home" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type Direction = "to-campus" | "from-campus";

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
  // The long-distance board toggles its own direction internally — this just
  // mirrors it so the "List it" link below can stay in sync (see
  // ArrivalsBoard's onDirectionChange).
  const [longDistanceDirection, setLongDistanceDirection] = useState<Direction>("to-campus");

  // What "already booked a vehicle? List it" should mean depends entirely on
  // which board you're looking at — posting from "Outside now"/"Heading out"
  // means a local trip in that fixed direction; posting from "Going home"
  // means a long-distance trip in whichever direction is currently toggled
  // there (covers both "going home" and "coming back to college").
  const listHref =
    tab === "here"
      ? "/trips/new?listingType=local&direction=to-campus"
      : tab === "out"
        ? "/trips/new?listingType=local&direction=from-campus"
        : `/trips/new?listingType=long-distance&direction=${longDistanceDirection}`;

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
            onDirectionChange={setLongDistanceDirection}
            {...props}
          />
        )}
      </div>

      <div className="mt-3">
        <Link
          href={listHref}
          className="flex items-center justify-center rounded-lg border border-brand-600 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-500 dark:hover:bg-brand-950"
        >
          Already booked a vehicle? List it →
        </Link>
      </div>
    </div>
  );
}
