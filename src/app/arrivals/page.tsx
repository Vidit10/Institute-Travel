"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import ArrivalForm, { type ArrivalEntry } from "@/components/ArrivalForm";
import { YEAR_LABELS, PROGRAM_LABELS } from "@/lib/constants";

const OVERVIEW_POLL_MS = 30_000;

type Entry = {
  _id: string;
  arrivalTime: string;
  mode?: string;
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

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="flex flex-wrap items-center gap-2 break-words">
        {formatPerson(entry)}
        {entry.partySize > 1 ? ` (+${entry.partySize - 1})` : ""}
        {entry.girlsOnly && (
          <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            Girls only
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {new Date(entry.arrivalTime).toLocaleString()}
        {entry.mode ? ` · ${entry.mode}` : ""}
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

export default function ArrivalsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview[] | null>(null);
  const [myEntries, setMyEntries] = useState<ArrivalEntry[]>([]);
  const [isFemale, setIsFemale] = useState(false);
  const [girlsOnlyDefault, setGirlsOnlyDefault] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [exact, setExact] = useState<Entry[]>([]);
  const [nearby, setNearby] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingArrival, setEditingArrival] = useState(false);

  const selectedLocationRef = useRef<string | null>(null);
  selectedLocationRef.current = selectedLocation;

  const loadOverview = useCallback(() => {
    fetch("/api/arrivals")
      .then((r) => r.json())
      .then((data) => {
        setOverview(data.overview);
        setMyEntries(data.myEntries || []);
        setIsFemale(data.myProfile?.gender === "female");
        setGirlsOnlyDefault(!!data.myProfile?.arrivalsGirlsOnlyDefault);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback((location: string) => {
    setLoadingDetail(true);
    fetch(`/api/arrivals?location=${encodeURIComponent(location)}`)
      .then((r) => r.json())
      .then((data) => {
        setExact(data.exact || []);
        setNearby(data.nearby || []);
      })
      .finally(() => setLoadingDetail(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Keeps "who's around" current without a manual refresh — same cadence as
  // the notification bell elsewhere in the app. Only refreshes the overview
  // counts and my-entries list, not whatever the user is mid-typing in a
  // form, since form visibility is driven by local state, not this data.
  useEffect(() => {
    const interval = setInterval(() => {
      loadOverview();
      if (selectedLocationRef.current) loadDetail(selectedLocationRef.current);
    }, OVERVIEW_POLL_MS);
    return () => clearInterval(interval);
  }, [loadOverview, loadDetail]);

  function selectLocation(location: string) {
    setSelectedLocation(location);
    loadDetail(location);
  }

  function handlePosted(entry: ArrivalEntry) {
    setEditingArrival(false);
    loadOverview();
    selectLocation(entry.pickupLocation);
  }

  async function withdraw(id: string) {
    await fetch(`/api/arrivals/${id}`, { method: "DELETE" });
    loadOverview();
    if (selectedLocation) loadDetail(selectedLocation);
  }

  function createTripFromLocation(location: string, referenceEntry?: Entry) {
    const params = new URLSearchParams({ pickupLocation: location });
    const time = referenceEntry?.arrivalTime || myEntries.find((m) => m.pickupLocation === location)?.arrivalTime;
    if (time) params.set("departureTime", time);
    router.push(`/trips/new?${params.toString()}`);
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
          <LoadingScreen />
        </main>
      </>
    );
  }

  // A person can only have one active arrival — myEntries is guaranteed 0 or 1.
  const myEntry = myEntries[0] || null;

  const browseSection = (
    <>
      <h2 className="mt-6 text-sm font-semibold text-gray-500 dark:text-gray-400">Browse by location</h2>
      <div className="mt-2 flex flex-wrap gap-2">
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

      {selectedLocation && (
        <div className="mt-4">
          {loadingDetail ? (
            <LoadingScreen />
          ) : (
            <>
              {exact.length === 0 && nearby.length === 0 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No one&apos;s posted an arrival at {selectedLocation} yet.
                </p>
              )}
              {exact.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      Around the same time
                    </h3>
                    <button
                      onClick={() => createTripFromLocation(selectedLocation, exact[0])}
                      className="text-xs text-brand-600 hover:underline dark:text-brand-500"
                    >
                      Create a trip for this group
                    </button>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {exact.map((e) => (
                      <EntryCard key={e._id} entry={e} />
                    ))}
                  </ul>
                </div>
              )}
              {nearby.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    Nearby times
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {nearby.map((e) => (
                      <EntryCard key={e._id} entry={e} />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  const formSection = (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold">{myEntry ? "Update your arrival" : "Log your arrival"}</h2>
      <div className="mt-3">
        <ArrivalForm
          key={myEntry?._id || "new"}
          initialEntry={myEntry || undefined}
          isFemale={isFemale}
          defaultGirlsOnly={girlsOnlyDefault}
          submitLabel={myEntry ? "Update my arrival" : "Post my arrival"}
          onSuccess={handlePosted}
        />
      </div>
    </div>
  );

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">Who else is arriving when you are?</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Not sure how many people you'll be splitting a ride with yet? Log your arrival time
          and see who else is around — then turn it into a real listing once you know your group.
        </p>

        {myEntry && !editingArrival && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-900 dark:bg-brand-950">
            <span>
              You're posted at <strong>{myEntry.pickupLocation}</strong> around{" "}
              {new Date(myEntry.arrivalTime).toLocaleString()}
            </span>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => setEditingArrival(true)}
                className="text-xs text-brand-700 hover:underline dark:text-brand-400"
              >
                Change
              </button>
              <button onClick={() => withdraw(myEntry._id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                Withdraw
              </button>
            </div>
          </div>
        )}

        {/* Once someone has an active entry, browsing what's already posted is
            the more useful next action — the form to change it moves below,
            secondary. First-time visitors see the form first since there's
            nothing to browse into yet from their own perspective. */}
        {myEntry ? (
          <>
            {browseSection}
            {editingArrival && <div className="mt-6">{formSection}</div>}
          </>
        ) : (
          <>
            <div className="mt-4">{formSection}</div>
            {browseSection}
          </>
        )}
      </main>
    </>
  );
}
