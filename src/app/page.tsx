"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";
import PushSubscribe from "@/components/PushSubscribe";
import LoadingScreen from "@/components/LoadingScreen";
import { type ArrivalEntry } from "@/components/ArrivalForm";
import PostTripReviewPrompt from "@/components/PostTripReviewPrompt";
import InviteFriendsPrompt from "@/components/InviteFriendsPrompt";
import QuickActions from "@/components/QuickActions";
import ArrivalsTabs from "@/components/ArrivalsTabs";
import {
  PICKUP_LOCATIONS,
  CAMPUS_LOCATIONS,
  CITY_LOCATIONS,
  DIRECTIONS,
  DIRECTION_LABELS,
  LISTING_TYPES,
  resolveTripCombo,
} from "@/lib/constants";

const LISTING_TYPE_LABELS: Record<(typeof LISTING_TYPES)[number], string> = {
  "long-distance": "Long-distance",
  local: "Local",
};

// Search-bar location options for a given combo — mirrors the pairing used by
// the trip creation form and ArrivalForm. "Others" is excluded here since it's
// free text with no fixed value to filter by.
function searchLocations(listingType: string, direction: string): readonly string[] {
  const combo = resolveTripCombo(listingType, direction);
  switch (combo) {
    case "arrival":
      return PICKUP_LOCATIONS;
    case "departure-long":
    case "local-departure":
      return CAMPUS_LOCATIONS;
    case "local-return":
      return CITY_LOCATIONS.filter((loc) => loc !== "Others");
  }
}

// At least half a dozen so the greeting doesn't feel repetitive across visits.
const TAGLINES = [
  "let's rock tonight",
  "the weekend is near",
  "what are your evening plans?",
  "time to plan your next move",
  "where's everyone headed today?",
  "let's get you a ride",
];

type Trip = {
  _id: string;
  mode: string;
  vehicleType: string;
  pickupLocation: string;
  destination: string;
  direction?: "to-campus" | "from-campus";
  listingType?: "long-distance" | "local";
  departureTime: string;
  seatsRemaining: number;
  totalCapacity: number;
  numTravelers: number;
  expectedFare: number;
  girlsOnly?: boolean;
  hostId: { name: string; year: string; program: string };
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function buildDate(dateStr: string, hour: number, minute: number, ampm: "AM" | "PM") {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  let hour24 = hour % 12;
  if (ampm === "PM") hour24 += 12;
  return new Date(y, m - 1, d, hour24, minute, 0, 0);
}
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TripCard({ trip }: { trip: Trip }) {
  const expectedFare = trip.expectedFare || 0;
  const currentTravelers = trip.totalCapacity - trip.seatsRemaining;
  const perPersonShare = currentTravelers > 0 ? expectedFare / currentTravelers : expectedFare;

  return (
    <Link
      href={`/trips/${trip._id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium uppercase text-brand-600 dark:text-brand-500">
          {trip.mode}
        </span>
        <div className="flex items-center gap-2">
          {(trip.listingType === "local" || trip.direction === "from-campus") && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {DIRECTION_LABELS[trip.direction || "to-campus"]}
            </span>
          )}
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {trip.vehicleType}
          </span>
          {trip.girlsOnly && (
            <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-950 dark:text-pink-300">
              Girls only
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 break-words font-medium">
        {trip.pickupLocation} → {trip.destination}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {new Date(trip.departureTime).toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {trip.seatsRemaining}/{trip.totalCapacity} seats left · hosted by{" "}
        {trip.hostId?.name}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        ₹{perPersonShare.toFixed(0)} each so far · ₹{expectedFare} total
      </p>
    </Link>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  // Random per page-load rather than date-based — keeps it fresh without any
  // extra logic, and a repeat visit the same day doesn't feel stale.
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], []);

  // Only one popup should ever show at once — invite-friends waits until the
  // post-trip review prompt has had first refusal (see PostTripReviewPrompt).
  const [reviewPromptResolved, setReviewPromptResolved] = useState(false);
  const [reviewPromptShowing, setReviewPromptShowing] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [exact, setExact] = useState<Trip[] | null>(null);
  const [nearby, setNearby] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  // Tracks "a search was applied" directly, rather than inferring it from
  // exact/nearby being non-null — a location-only or time-only search
  // returns a flat `{ trips }` shape (no exact/nearby split), which used to
  // silently reset the old exact/nearby-based flag to "unfiltered" even
  // though the list was genuinely filtered/re-sorted. That made results look
  // wrong and hid the only way back to the full list.
  const [isFiltered, setIsFiltered] = useState(false);
  const [lastSearchSummary, setLastSearchSummary] = useState("");

  const [filterListingType, setFilterListingType] = useState<(typeof LISTING_TYPES)[number]>("long-distance");
  const [filterDirection, setFilterDirection] = useState<(typeof DIRECTIONS)[number]>("to-campus");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHour, setFilterHour] = useState(9);
  const [filterMinute, setFilterMinute] = useState(0);
  const [filterAmpm, setFilterAmpm] = useState<"AM" | "PM">("AM");
  const [searchOpen, setSearchOpen] = useState(false);

  function updateFilterTripType(listingType: (typeof LISTING_TYPES)[number], direction: (typeof DIRECTIONS)[number]) {
    setFilterListingType(listingType);
    setFilterDirection(direction);
    setFilterLocation("");
  }

  const [isFemale, setIsFemale] = useState(false);
  const [girlsOnlyDefault, setGirlsOnlyDefault] = useState(false);
  // Fetched once here and passed down to ArrivalsTabs — every board it
  // renders needs the same profile fields and the same single active entry
  // (ArrivalIntent is still one-per-user across every board), so one fetch
  // instead of three redundant ones.
  const [myEntries, setMyEntries] = useState<ArrivalEntry[]>([]);

  const loadArrivalStatus = useCallback(() => {
    fetch("/api/arrivals")
      .then((r) => r.json())
      .then((data) => {
        setIsFemale(data.myProfile?.gender === "female");
        setGirlsOnlyDefault(!!data.myProfile?.arrivalsGirlsOnlyDefault);
        setMyEntries(data.myEntries || []);
      });
  }, []);

  useEffect(() => {
    loadArrivalStatus();
  }, [loadArrivalStatus]);

  function handleArrivalPosted() {
    loadArrivalStatus();
  }

  const loadDefault = useCallback(() => {
    setLoading(true);
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => {
        setTrips(data.trips || []);
        setExact(null);
        setNearby(null);
        setIsFiltered(false);
        setLastSearchSummary("");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDefault();
  }, [loadDefault]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterLocation) {
      params.set("pickupLocation", filterLocation);
      params.set("listingType", filterListingType);
      params.set("direction", filterDirection);
    }
    const targetDate = buildDate(filterDate, filterHour, filterMinute, filterAmpm);
    if (targetDate && !isNaN(targetDate.getTime())) {
      params.set("targetTime", targetDate.toISOString());
    }
    if (!params.toString()) return;

    const summaryParts: string[] = [];
    if (filterLocation) summaryParts.push(filterLocation);
    if (targetDate && !isNaN(targetDate.getTime())) summaryParts.push(targetDate.toLocaleString());

    setFiltering(true);
    fetch(`/api/trips?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.exact || data.nearby) {
          setExact(data.exact || []);
          setNearby(data.nearby || []);
        } else {
          setTrips(data.trips || []);
          setExact(null);
          setNearby(null);
        }
        setIsFiltered(true);
        setLastSearchSummary(summaryParts.join(" · "));
      })
      .finally(() => setFiltering(false));
  }

  function clearFilter() {
    setFilterListingType("long-distance");
    setFilterDirection("to-campus");
    setFilterLocation("");
    setFilterDate("");
    loadDefault();
  }

  useEffect(() => {
    if (isFiltered) setSearchOpen(true);
  }, [isFiltered]);

  return (
    <>
      <PushSubscribe />
      <PostTripReviewPrompt
        onResolved={(showing) => {
          setReviewPromptShowing(showing);
          setReviewPromptResolved(true);
        }}
      />
      <InviteFriendsPrompt enabled={reviewPromptResolved && !reviewPromptShowing} />
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">
          {firstName ? `Hi ${firstName}, ` : ""}
          {tagline}
        </h1>

        <QuickActions />

        <ArrivalsTabs
          isFemale={isFemale}
          girlsOnlyDefault={girlsOnlyDefault}
          myEntries={myEntries}
          onPosted={handleArrivalPosted}
          onWithdrawn={handleArrivalPosted}
        />

        <div className="mt-3">
          <Link
            href="/trips/new?listingType=local"
            className="flex items-center justify-center rounded-lg border border-brand-600 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500 dark:text-brand-500 dark:hover:bg-brand-950"
          >
            Already booked a vehicle? List it →
          </Link>
        </div>

        <hr className="mt-6 border-gray-200 dark:border-gray-800" />

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Browse all trips
        </h2>

        {isFiltered && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <span className="break-words">
              Showing results{lastSearchSummary ? ` for ${lastSearchSummary}` : ""}
            </span>
            <button
              type="button"
              onClick={clearFilter}
              className="shrink-0 font-medium text-brand-600 hover:underline dark:text-brand-500"
            >
              Show all trips
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSearchOpen((o) => !o)}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-expanded={searchOpen}
        >
          Search by time/location
          <span className={`transition-transform ${searchOpen ? "rotate-180" : ""}`}>▾</span>
        </button>

        {searchOpen && (
        <form onSubmit={applyFilter} className="mt-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap gap-2 text-xs">
            {LISTING_TYPES.map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => updateFilterTripType(lt, filterDirection)}
                className={`rounded-full border px-2.5 py-1 ${
                  filterListingType === lt
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {LISTING_TYPE_LABELS[lt]}
              </button>
            ))}
            <span className="mx-1 self-center text-gray-300 dark:text-gray-700">|</span>
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => updateFilterTripType(filterListingType, d)}
                className={`rounded-full border px-2.5 py-1 ${
                  filterDirection === d
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {DIRECTION_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <select
              className="col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-1"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">Any location</option>
              {searchLocations(filterListingType, filterDirection).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <input
              type="date"
              className="col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-1"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <select
              className="rounded-md border border-gray-300 px-1 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={filterHour}
              onChange={(e) => setFilterHour(Number(e.target.value))}
              aria-label="Hour"
            >
              {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <select
              className="rounded-md border border-gray-300 px-1 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={filterMinute}
              onChange={(e) => setFilterMinute(Number(e.target.value))}
              aria-label="Minute"
            >
              {MINUTES.map((m) => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
            <select
              className="rounded-md border border-gray-300 px-1 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={filterAmpm}
              onChange={(e) => setFilterAmpm(e.target.value as "AM" | "PM")}
              aria-label="AM or PM"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={filtering}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {filtering ? "Searching..." : "Search"}
            </button>
            {isFiltered && (
              <button
                type="button"
                onClick={clearFilter}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Show all trips
              </button>
            )}
          </div>
        </form>
        )}

        {loading && <LoadingScreen />}

        {!loading && !isFiltered && trips.length === 0 && (
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            No open trips yet. Be the first to{" "}
            <Link href="/trips/new" className="text-brand-600 underline dark:text-brand-500">
              list one
            </Link>
            .
          </p>
        )}

        {!loading && !isFiltered && (
          <ul className="mt-4 space-y-3">
            {trips.map((trip) => (
              <li key={trip._id}><TripCard trip={trip} /></li>
            ))}
          </ul>
        )}

        {/* Two possible response shapes from a search: location+time together
            split into exact/nearby buckets; a location-only or time-only
            search instead returns a flat, re-sorted `trips` list (no bucket
            to put it in). Both are still "filtered" — rendering the wrong
            branch for the flat case is what used to make a location-only
            search look like it found nothing. */}
        {!loading && isFiltered && exact === null && nearby === null && (
          <>
            {trips.length === 0 && (
              <p className="mt-4 text-gray-500 dark:text-gray-400">No matching trips found.</p>
            )}
            <ul className="mt-4 space-y-3">
              {trips.map((trip) => (
                <li key={trip._id}><TripCard trip={trip} /></li>
              ))}
            </ul>
          </>
        )}

        {!loading && isFiltered && (exact !== null || nearby !== null) && (
          <>
            {(exact?.length || 0) === 0 && (nearby?.length || 0) === 0 && (
              <p className="mt-4 text-gray-500 dark:text-gray-400">No matching trips found.</p>
            )}
            {exact && exact.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Around that time
                </h2>
                <ul className="mt-2 space-y-3">
                  {exact.map((trip) => (
                    <li key={trip._id}><TripCard trip={trip} /></li>
                  ))}
                </ul>
              </div>
            )}
            {nearby && nearby.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Nearby times
                </h2>
                <ul className="mt-2 space-y-3">
                  {nearby.map((trip) => (
                    <li key={trip._id}><TripCard trip={trip} /></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
