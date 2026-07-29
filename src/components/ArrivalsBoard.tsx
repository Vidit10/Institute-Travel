"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import ArrivalForm, { type ArrivalEntry } from "@/components/ArrivalForm";
import { YEAR_LABELS, PROGRAM_LABELS, DIRECTIONS, DIRECTION_LABELS } from "@/lib/constants";

const OVERVIEW_POLL_MS = 30_000;

type Entry = {
  _id: string;
  pickupLocation: string;
  direction?: "to-campus" | "from-campus";
  listingType?: "long-distance" | "local";
  arrivalTime: string;
  mode?: string;
  trainNumber?: string;
  flightNumber?: string;
  partySize: number;
  girlsOnly?: boolean;
  userId: { _id: string; name: string; year: string; program: string };
};

type Overview = { location: string; count: number; people: number };

function formatPerson(e: Entry) {
  const yearLabel = YEAR_LABELS[e.userId.year] || e.userId.year;
  const programLabel = e.userId.program === "PhD" ? "" : ` · ${PROGRAM_LABELS[e.userId.program as keyof typeof PROGRAM_LABELS] || e.userId.program}`;
  return `${e.userId.name} — ${yearLabel}${programLabel}`;
}

function EntryCard({ entry, showLocation }: { entry: Entry; showLocation?: boolean }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="flex flex-wrap items-center gap-2 break-words">
        {formatPerson(entry)}
        {entry.partySize > 1 ? ` (+${entry.partySize - 1})` : ""}
        {showLocation && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {entry.pickupLocation}
          </span>
        )}
        {entry.girlsOnly && (
          <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            Girls only
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {new Date(entry.arrivalTime).toLocaleString()}
        {entry.mode ? ` · ${entry.mode}` : ""}
        {entry.trainNumber ? ` · Train ${entry.trainNumber}` : ""}
        {entry.flightNumber ? ` · Flight ${entry.flightNumber}` : ""}
      </p>
      <Link
        href={`/feedback?category=report&context=${encodeURIComponent(
          `Arrival board entry by ${entry.userId.name} (id: ${entry._id})`
        )}`}
        className="text-xs text-gray-400 hover:underline dark:text-gray-500"
      >
        Report
      </Link>
    </li>
  );
}

// One instance = one browsable board scoped to a listingType, with a
// direction that's either fixed (local boards — each homepage section is its
// own direction) or internally toggleable (the long-distance board, since
// that's the one combo where a single section covering both directions still
// makes sense — see docs/SPEC.md section 11). Extracted from the former
// /arrivals page so the homepage's three sections don't triplicate this logic.
export default function ArrivalsBoard({
  listingType,
  initialDirection,
  allowDirectionToggle = false,
  showClusterExpansion = false,
  title,
  blurb,
  isFemale,
  girlsOnlyDefault,
  myEntries,
  onPosted,
  onWithdrawn,
}: {
  listingType: "local" | "long-distance";
  initialDirection: "to-campus" | "from-campus";
  allowDirectionToggle?: boolean;
  showClusterExpansion?: boolean;
  title: string;
  blurb: string;
  isFemale: boolean;
  girlsOnlyDefault: boolean;
  myEntries: ArrivalEntry[];
  onPosted: () => void;
  onWithdrawn: () => void;
}) {
  const [direction, setDirection] = useState(initialDirection);
  const [overview, setOverview] = useState<Overview[] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [exact, setExact] = useState<Entry[]>([]);
  const [nearby, setNearby] = useState<Entry[]>([]);
  const [clusterLocations, setClusterLocations] = useState<string[]>([]);
  const [clusterEntries, setClusterEntries] = useState<Entry[]>([]);
  const [showCluster, setShowCluster] = useState(false);
  const [loadingCluster, setLoadingCluster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const selectedLocationRef = useRef<string | null>(null);
  selectedLocationRef.current = selectedLocation;
  const showClusterRef = useRef(false);
  showClusterRef.current = showCluster;
  const directionRef = useRef(direction);
  directionRef.current = direction;

  const loadOverview = useCallback(() => {
    fetch(`/api/arrivals?listingType=${listingType}&direction=${directionRef.current}`)
      .then((r) => r.json())
      .then((data) => {
        const ov: Overview[] = data.overview || [];
        setOverview(ov);
        // Local boards only ever have one synthetic whole-route bucket — jump
        // straight to it instead of making someone click a chip with nothing
        // else to choose from.
        if (listingType === "local" && ov.length === 1) {
          setSelectedLocation(ov[0].location);
        }
      })
      .finally(() => setLoading(false));
  }, [listingType]);

  const loadDetail = useCallback(
    (location: string) => {
      setLoadingDetail(true);
      fetch(`/api/arrivals?location=${encodeURIComponent(location)}&listingType=${listingType}&direction=${directionRef.current}`)
        .then((r) => r.json())
        .then((data) => {
          setExact(data.exact || []);
          setNearby(data.nearby || []);
          setClusterLocations(data.clusterLocations || []);
        })
        .finally(() => setLoadingDetail(false));
    },
    [listingType]
  );

  const loadClusterEntries = useCallback(
    (location: string) => {
      setLoadingCluster(true);
      fetch(
        `/api/arrivals?location=${encodeURIComponent(location)}&listingType=${listingType}&direction=${directionRef.current}&includeCluster=true`
      )
        .then((r) => r.json())
        .then((data) => setClusterEntries(data.clusterEntries || []))
        .finally(() => setLoadingCluster(false));
    },
    [listingType]
  );

  useEffect(() => {
    setSelectedLocation(null);
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  useEffect(() => {
    if (selectedLocation) loadDetail(selectedLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  // Same 30s cadence as the board had as its own page.
  useEffect(() => {
    const interval = setInterval(() => {
      loadOverview();
      if (selectedLocationRef.current) {
        loadDetail(selectedLocationRef.current);
        if (showClusterRef.current) loadClusterEntries(selectedLocationRef.current);
      }
    }, OVERVIEW_POLL_MS);
    return () => clearInterval(interval);
  }, [loadOverview, loadDetail, loadClusterEntries]);

  function selectLocation(location: string) {
    setShowCluster(false);
    setClusterEntries([]);
    setSelectedLocation(location);
  }

  // One active entry per user across every board — only ever "here" if it
  // matches this board's own combo.
  const myEntryHere = myEntries.find(
    (e) => (e.listingType || "long-distance") === listingType && (e.direction || "to-campus") === direction
  );
  const myEntryElsewhere = !myEntryHere ? myEntries[0] : undefined;

  function handlePosted(entry: ArrivalEntry) {
    setShowForm(false);
    onPosted();
    const entryDirection = entry.direction || "to-campus";
    if (allowDirectionToggle) setDirection(entryDirection);
    selectLocation(entry.pickupLocation);
    loadOverview();
  }

  async function withdraw(id: string) {
    await fetch(`/api/arrivals/${id}`, { method: "DELETE" });
    onWithdrawn();
    loadOverview();
    if (selectedLocation) loadDetail(selectedLocation);
  }

  return (
    <section className="mt-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{blurb}</p>

      {allowDirectionToggle && (
        <div className="mt-2 flex gap-2 text-xs">
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`rounded-full border px-2.5 py-1 ${
                direction === d
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              {DIRECTION_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {myEntryHere ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
          <span>
            You&apos;re posted at <strong>{myEntryHere.pickupLocation}</strong> around{" "}
            {new Date(myEntryHere.arrivalTime).toLocaleString()}
          </span>
          <div className="flex shrink-0 gap-3">
            <button onClick={() => setShowForm((s) => !s)} className="text-xs text-brand-700 hover:underline dark:text-brand-400">
              {showForm ? "Cancel" : "Change"}
            </button>
            <button onClick={() => withdraw(myEntryHere._id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
              Withdraw
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="mt-2 text-sm text-brand-600 hover:underline dark:text-brand-500"
        >
          {showForm ? "Never mind" : "Post my status →"}
        </button>
      )}

      {!myEntryHere && myEntryElsewhere && showForm && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          You&apos;re currently posted at {myEntryElsewhere.pickupLocation} — posting here will replace it.
        </p>
      )}

      {showForm && (
        <div className="mt-3 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
          <ArrivalForm
            key={myEntryHere?._id || "new"}
            initialEntry={myEntryHere || undefined}
            isFemale={isFemale}
            defaultGirlsOnly={girlsOnlyDefault}
            defaultListingType={listingType}
            defaultDirection={direction}
            submitLabel={myEntryHere ? "Update my status" : "Post my status"}
            onSuccess={handlePosted}
          />
        </div>
      )}

      {listingType === "long-distance" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {overview?.map((o) => (
            <button
              key={o.location}
              onClick={() => selectLocation(o.location)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                selectedLocation === o.location
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              {o.location} {o.count > 0 && `· ${o.people} ${o.people === 1 ? "person" : "people"}`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-3">
          <LoadingScreen />
        </div>
      ) : (
        selectedLocation && (
          <div className="mt-3">
            {loadingDetail ? (
              <LoadingScreen />
            ) : (
              <>
                {exact.length === 0 && nearby.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {listingType === "local" ? "No one's posted on this route yet." : `No one's posted here yet.`}
                  </p>
                )}
                {exact.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Around the same time</h3>
                    <ul className="mt-2 space-y-2">
                      {exact.map((e) => (
                        <EntryCard key={e._id} entry={e} />
                      ))}
                    </ul>
                  </div>
                )}
                {nearby.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Nearby times</h3>
                    <ul className="mt-2 space-y-2">
                      {nearby.map((e) => (
                        <EntryCard key={e._id} entry={e} />
                      ))}
                    </ul>
                  </div>
                )}

                {showClusterExpansion && clusterLocations.length > 0 && (
                  <div className="mt-3">
                    {!showCluster ? (
                      <button
                        onClick={() => {
                          setShowCluster(true);
                          loadClusterEntries(selectedLocation);
                        }}
                        className="text-sm text-brand-600 hover:underline dark:text-brand-500"
                      >
                        {exact.length === 0 && nearby.length === 0
                          ? "No one's posted here yet — look around your surroundings →"
                          : "Didn't find enough people? Look around your surroundings →"}
                      </button>
                    ) : loadingCluster ? (
                      <LoadingScreen />
                    ) : (
                      <>
                        <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                          From nearby areas ({clusterLocations.join(", ")})
                        </h3>
                        {clusterEntries.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No one&apos;s posted nearby either yet.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {clusterEntries.map((e) => (
                              <EntryCard key={e._id} entry={e} showLocation />
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )
      )}
    </section>
  );
}
