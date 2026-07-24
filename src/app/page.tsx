"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import PushSubscribe from "@/components/PushSubscribe";
import LoadingScreen from "@/components/LoadingScreen";
import ArrivalForm, { type ArrivalEntry } from "@/components/ArrivalForm";
import { PICKUP_LOCATIONS } from "@/lib/constants";

type Trip = {
  _id: string;
  mode: string;
  vehicleType: string;
  pickupLocation: string;
  destination: string;
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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [exact, setExact] = useState<Trip[] | null>(null);
  const [nearby, setNearby] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  const [filterLocation, setFilterLocation] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHour, setFilterHour] = useState(9);
  const [filterMinute, setFilterMinute] = useState(0);
  const [filterAmpm, setFilterAmpm] = useState<"AM" | "PM">("AM");
  const [searchOpen, setSearchOpen] = useState(false);

  const [arrivalsLoaded, setArrivalsLoaded] = useState(false);
  // A person can only have one active arrival — API returns at most one.
  const [myEntry, setMyEntry] = useState<ArrivalEntry | null>(null);
  const [isFemale, setIsFemale] = useState(false);
  const [girlsOnlyDefault, setGirlsOnlyDefault] = useState(false);
  const [editingArrival, setEditingArrival] = useState(false);

  const loadArrivalStatus = useCallback(() => {
    fetch("/api/arrivals")
      .then((r) => r.json())
      .then((data) => {
        setMyEntry(data.myEntries?.[0] || null);
        setIsFemale(data.myProfile?.gender === "female");
        setGirlsOnlyDefault(!!data.myProfile?.arrivalsGirlsOnlyDefault);
      })
      .finally(() => setArrivalsLoaded(true));
  }, []);

  useEffect(() => {
    loadArrivalStatus();
  }, [loadArrivalStatus]);

  function handleArrivalPosted() {
    setEditingArrival(false);
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
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDefault();
  }, [loadDefault]);

  const isFiltered = exact !== null || nearby !== null;

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filterLocation) params.set("pickupLocation", filterLocation);
    const targetDate = buildDate(filterDate, filterHour, filterMinute, filterAmpm);
    if (targetDate && !isNaN(targetDate.getTime())) {
      params.set("targetTime", targetDate.toISOString());
    }
    if (!params.toString()) return;

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
      })
      .finally(() => setFiltering(false));
  }

  function clearFilter() {
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
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <section className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950">
          {!arrivalsLoaded ? (
            <div className="h-16" aria-hidden />
          ) : myEntry ? (
            <>
              <p className="font-medium text-brand-700 dark:text-brand-400">
                Not sure who you&apos;re travelling with yet? Here&apos;s where you stand:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-white/60 px-3 py-2 text-sm dark:bg-black/20">
                <span className="text-gray-700 dark:text-gray-200">
                  You&apos;re arriving at <strong>{myEntry.pickupLocation}</strong> around{" "}
                  {new Date(myEntry.arrivalTime).toLocaleString()}
                </span>
                <button
                  onClick={() => setEditingArrival((e) => !e)}
                  className="shrink-0 text-xs text-brand-700 hover:underline dark:text-brand-400"
                >
                  Change
                </button>
              </div>
              {editingArrival && (
                <div className="mt-2 rounded-md bg-white/60 p-3 dark:bg-black/20">
                  <ArrivalForm
                    initialEntry={myEntry}
                    isFemale={isFemale}
                    defaultGirlsOnly={girlsOnlyDefault}
                    submitLabel="Update my arrival"
                    onSuccess={handleArrivalPosted}
                  />
                </div>
              )}
              <Link
                href="/arrivals"
                className="mt-2 inline-block text-sm text-brand-600 hover:underline dark:text-brand-500"
              >
                See who else is arriving when you are →
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium text-brand-700 dark:text-brand-400">
                Not sure who&apos;s travelling with you yet?
              </p>
              <p className="mt-1 text-sm text-brand-600 dark:text-brand-500">
                Log your arrival time below and see who else is around — it takes a few
                seconds, and you can turn it into a real listing once you know your group.
              </p>
              <div className="mt-3">
                <ArrivalForm
                  isFemale={isFemale}
                  defaultGirlsOnly={girlsOnlyDefault}
                  onSuccess={handleArrivalPosted}
                />
              </div>
            </>
          )}
        </section>

        <h1 className="mt-4 text-lg font-semibold">Upcoming trips</h1>

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <select
              className="col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-1"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">Any location</option>
              {PICKUP_LOCATIONS.map((loc) => (
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
                Clear
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

        {!loading && isFiltered && (
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
