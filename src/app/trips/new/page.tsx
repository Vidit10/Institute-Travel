"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ShareCTA from "@/components/ShareCTA";
import {
  PICKUP_LOCATIONS,
  CAMPUS_LOCATIONS,
  CITY_LOCATIONS,
  DEFAULT_DESTINATION,
  DIRECTIONS,
  DIRECTION_LABELS,
  LISTING_TYPES,
  TRAVEL_TYPES,
  TRAVEL_TYPE_DELAY_HINTS,
  TRIP_MODES,
  VEHICLE_TYPES,
  RECOMMENDED_CAPACITY,
  LOCAL_RECOMMENDED_CAPACITY,
  MAX_ADVANCE_DAYS,
  MINUTE_OPTIONS,
  resolveTripCombo,
} from "@/lib/constants";

// Which recommended-capacity table applies — local trips use a higher table
// (no long-distance luggage constraint), see docs/SPEC.md.
function recommendedCapacity(listingType: string, vehicleType: string): number | undefined {
  const table = listingType === "local" ? LOCAL_RECOMMENDED_CAPACITY : RECOMMENDED_CAPACITY;
  return table[vehicleType];
}

// Pre-fills the pickup location based on travel mode — still editable.
const DEFAULT_PICKUP_BY_MODE: Record<string, (typeof PICKUP_LOCATIONS)[number]> = {
  train: "Dharwad Railway Station",
  flight: "Hubli Airport",
  bus: "Dharwad New Bus Stand",
};

const LISTING_TYPE_LABELS: Record<(typeof LISTING_TYPES)[number], string> = {
  "long-distance": "Long-distance arrival (train/flight/bus)",
  local: "Local campus ↔ city trip",
};

// Which location list each side of the trip draws from, for a given
// (listingType, direction) combo — mirrors resolveTripCombo's four cases.
// "fixed" means the field isn't shown at all (forced server-side).
function locationConfig(listingType: string, direction: string) {
  const combo = resolveTripCombo(listingType, direction);
  switch (combo) {
    case "arrival":
      return { pickup: PICKUP_LOCATIONS as readonly string[], destination: "fixed" as const };
    case "departure-long":
      return { pickup: CAMPUS_LOCATIONS as readonly string[], destination: PICKUP_LOCATIONS as readonly string[] };
    case "local-return":
      return { pickup: CITY_LOCATIONS as readonly string[], destination: CAMPUS_LOCATIONS as readonly string[] };
    case "local-departure":
      return { pickup: CAMPUS_LOCATIONS as readonly string[], destination: CITY_LOCATIONS as readonly string[] };
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Combines the separate date + 12-hour time controls into a real Date. Returns
// null if the date hasn't been picked yet.
function buildDepartureDate(dateStr: string, hour: number, minute: number, ampm: "AM" | "PM"): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  let hour24 = hour % 12;
  if (ampm === "PM") hour24 += 12;
  return new Date(y, m - 1, d, hour24, minute, 0, 0);
}

// Convenience defaults, local trips only (long-distance keeps the old plain
// 9:00 AM default — arrival/departure times there are dictated by the
// train/flight/bus, not a typical daily routine): returning to campus in the
// evening, heading out early afternoon. Still just a starting point — fully
// editable either way.
function defaultTime(listingType: string, direction: string): { hour: number; ampm: "AM" | "PM" } {
  if (listingType !== "local") return { hour: 9, ampm: "AM" };
  return direction === "to-campus" ? { hour: 9, ampm: "PM" } : { hour: 2, ampm: "PM" };
}

const today = new Date();
const minDateStr = toDateInputValue(today);
const maxDateStr = toDateInputValue(new Date(today.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

const MODE_LABELS: Record<string, string> = { train: "Train", flight: "Flight", bus: "Bus" };

type SimilarTrip = {
  _id: string;
  pickupLocation: string;
  departureTime: string;
  mode: string;
  hostId?: { name: string };
};

export default function NewTripPage() {
  return (
    <Suspense fallback={null}>
      <NewTripForm />
    </Suspense>
  );
}

function NewTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Prefill from the arrivals board's "Create a trip for this group" action,
  // or from the homepage's new "going out / returning" entry points.
  const prefillPickup = searchParams.get("pickupLocation");
  const prefillDeparture = searchParams.get("departureTime");
  const prefillDate = prefillDeparture ? new Date(prefillDeparture) : null;
  const prefillListingType = searchParams.get("listingType");
  const prefillDirection = searchParams.get("direction");

  const [form, setForm] = useState<{
    mode: string;
    vehicleType: string;
    listingType: (typeof LISTING_TYPES)[number];
    direction: (typeof DIRECTIONS)[number];
    travelType: (typeof TRAVEL_TYPES)[number];
    pickupLocation: string;
    pickupOther: string;
    destination: string;
    destinationOther: string;
    dateStr: string;
    hour: number;
    minute: number;
    ampm: "AM" | "PM";
    trainNumber: string;
    flightNumber: string;
    totalCapacity: number;
    numTravelers: number;
    girlsOnly: boolean;
    expectedFare: string;
  }>(() => {
    const listingType: (typeof LISTING_TYPES)[number] =
      prefillListingType === "local" ? "local" : "long-distance";
    const direction: (typeof DIRECTIONS)[number] =
      prefillDirection === "from-campus" ? "from-campus" : "to-campus";
    const { pickup, destination } = locationConfig(listingType, direction);
    const { hour: defaultHour, ampm: defaultAmpm } = defaultTime(listingType, direction);
    const base = {
      mode: "train",
      vehicleType: "",
      listingType,
      direction,
      travelType: "leisure" as (typeof TRAVEL_TYPES)[number],
      pickupLocation: (prefillPickup as string) || (listingType === "long-distance" && direction === "to-campus" ? DEFAULT_PICKUP_BY_MODE.train : pickup[0]),
      pickupOther: "",
      destination: destination === "fixed" ? "" : destination[0],
      destinationOther: "",
      dateStr: toDateInputValue(today),
      hour: defaultHour,
      minute: 0,
      ampm: defaultAmpm as "AM" | "PM",
      trainNumber: "",
      flightNumber: "",
      totalCapacity: 3,
      numTravelers: 1,
      girlsOnly: false,
      expectedFare: "",
    };
    if (prefillDate && !isNaN(prefillDate.getTime())) {
      const hour24 = prefillDate.getHours();
      base.dateStr = toDateInputValue(prefillDate);
      base.hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
      base.minute = prefillDate.getMinutes();
      base.ampm = hour24 >= 12 ? "PM" : "AM";
    }
    return base;
  });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFemale = session?.user?.gender === "female";
  const fareNumber = Number(form.expectedFare) || 0;
  const perPersonShare = form.numTravelers > 0 ? fareNumber / form.numTravelers : 0;
  const departureDate = buildDepartureDate(form.dateStr, form.hour, form.minute, form.ampm);

  const combo = resolveTripCombo(form.listingType, form.direction);
  const locations = locationConfig(form.listingType, form.direction);
  const effectivePickup = form.pickupLocation === "Others" ? form.pickupOther.trim() : form.pickupLocation;
  const effectiveDestination =
    locations.destination === "fixed"
      ? DEFAULT_DESTINATION
      : form.destination === "Others"
        ? form.destinationOther.trim()
        : form.destination;

  const [similarTrips, setSimilarTrips] = useState<SimilarTrip[]>([]);
  const [similarDismissed, setSimilarDismissed] = useState(false);

  // Nudge, not a gate: once location + a real future date/time are set,
  // check for existing open trips around the same time — reuses the same
  // proximity search the home feed's own filter already calls, no new
  // backend logic. Debounced so it doesn't fire on every keystroke, and
  // skipped once the user has moved past the initial form step.
  useEffect(() => {
    if (confirming || !departureDate || departureDate.getTime() <= Date.now()) {
      setSimilarTrips([]);
      return;
    }
    if (!effectivePickup) {
      setSimilarTrips([]);
      return;
    }
    setSimilarDismissed(false);
    const params = new URLSearchParams({
      pickupLocation: effectivePickup,
      targetTime: departureDate.toISOString(),
      direction: form.direction,
      listingType: form.listingType,
    });
    const timeout = setTimeout(() => {
      fetch(`/api/trips?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setSimilarTrips(data?.exact || []))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePickup, form.dateStr, form.hour, form.minute, form.ampm, form.direction, form.listingType, confirming]);

  // Local trips only: "N people on this route might want to join" — same
  // debounce pattern as similarTrips above, against the arrivals board's
  // directional route-match instead of other trips. Answers "I've already
  // booked a vehicle, is anyone outside?" right where a host is listing one.
  const [nearbyArrivals, setNearbyArrivals] = useState<{ exact: unknown[]; nearby: unknown[] }>({
    exact: [],
    nearby: [],
  });
  const [nearbyDismissed, setNearbyDismissed] = useState(false);
  useEffect(() => {
    if (confirming || form.listingType !== "local" || !departureDate || departureDate.getTime() <= Date.now() || !effectivePickup) {
      setNearbyArrivals({ exact: [], nearby: [] });
      return;
    }
    setNearbyDismissed(false);
    const params = new URLSearchParams({
      location: effectivePickup,
      direction: form.direction,
      listingType: form.listingType,
      targetTime: departureDate.toISOString(),
      directional: "true",
    });
    const timeout = setTimeout(() => {
      fetch(`/api/arrivals?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setNearbyArrivals({ exact: data?.exact || [], nearby: data?.nearby || [] }))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePickup, form.dateStr, form.hour, form.minute, form.ampm, form.direction, form.listingType, confirming]);
  const nearbyArrivalsCount = nearbyArrivals.exact.length + nearbyArrivals.nearby.length;

  // Switching trip type or direction changes which location lists apply, so
  // pickup/destination reset to a valid default for the new combo rather than
  // silently keeping a now-invalid value.
  function updateTripType(listingType: (typeof LISTING_TYPES)[number], direction: (typeof DIRECTIONS)[number]) {
    const { pickup, destination } = locationConfig(listingType, direction);
    const { hour, ampm } = defaultTime(listingType, direction);
    setForm((f) => {
      // Recommended capacity differs between local/long-distance for the same
      // vehicle, so switching trip type re-derives it too (if a vehicle is
      // already picked) — same as picking a different vehicle outright.
      const recommended = f.vehicleType ? recommendedCapacity(listingType, f.vehicleType) : undefined;
      const totalCapacity = recommended ?? f.totalCapacity;
      return {
        ...f,
        listingType,
        direction,
        pickupLocation: pickup[0],
        pickupOther: "",
        destination: destination === "fixed" ? "" : destination[0],
        destinationOther: "",
        hour,
        minute: 0,
        ampm,
        totalCapacity,
        numTravelers: Math.min(f.numTravelers, Math.max(1, totalCapacity - 1)),
      };
    });
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!departureDate) {
      setError("Pick a departure date.");
      return;
    }
    if (departureDate.getTime() <= Date.now()) {
      setError("That time has already passed — pick a time in the future.");
      return;
    }
    if (form.numTravelers >= form.totalCapacity) {
      setError("Leave at least one seat open for someone else to join.");
      return;
    }
    if (!effectivePickup) {
      setError("Pick a pickup location.");
      return;
    }
    if (locations.destination !== "fixed" && !effectiveDestination) {
      setError("Pick a destination.");
      return;
    }

    setConfirming(true);
  }

  async function handleConfirm() {
    if (!departureDate) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: form.listingType === "local" ? "bus" : form.mode,
        vehicleType: form.vehicleType,
        listingType: form.listingType,
        direction: form.direction,
        travelType: form.travelType,
        pickupLocation: effectivePickup,
        destination: locations.destination === "fixed" ? undefined : effectiveDestination,
        departureTime: departureDate.toISOString(),
        trainNumber: form.trainNumber,
        flightNumber: form.flightNumber,
        totalCapacity: Number(form.totalCapacity),
        numTravelers: Number(form.numTravelers),
        expectedFare: fareNumber,
        girlsOnly: form.girlsOnly,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const fieldErrors = data.error?.fieldErrors
        ? Object.values(data.error.fieldErrors).flat().join(", ")
        : null;
      setError(fieldErrors || data.error?.formErrors?.join(", ") || data.error || "Failed to create trip");
      setSubmitting(false);
      setConfirming(false);
      return;
    }

    router.push(`/trips/${data.trip._id}?created=true`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">List a trip</h1>

        {!confirming ? (
          <form onSubmit={handleReview} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">
                Trip type <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.listingType}
                onChange={(e) => updateTripType(e.target.value as (typeof LISTING_TYPES)[number], form.direction)}
              >
                {LISTING_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {LISTING_TYPE_LABELS[lt]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Direction <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateTripType(form.listingType, d)}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      form.direction === d
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {DIRECTION_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Type of travel</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {TRAVEL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, travelType: t })}
                    className={`rounded-md border px-3 py-2 text-sm capitalize ${
                      form.travelType === t
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{TRAVEL_TYPE_DELAY_HINTS[form.travelType]}.</p>
            </div>

            {form.listingType === "long-distance" && (
              <div>
                <label className="block text-sm font-medium">
                  Mode <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.mode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setForm((f) => ({
                      ...f,
                      mode,
                      pickupLocation:
                        f.direction === "to-campus" ? DEFAULT_PICKUP_BY_MODE[mode] || f.pickupLocation : f.pickupLocation,
                    }));
                  }}
                >
                  {TRIP_MODES.map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.listingType === "long-distance" && form.mode === "train" && (
              <div>
                <label className="block text-sm font-medium">Train number (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.trainNumber}
                  onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
                />
              </div>
            )}
            {form.listingType === "long-distance" && form.mode === "flight" && (
              <div>
                <label className="block text-sm font-medium">Flight number (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.flightNumber}
                  onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">
                Vehicle for the onward trip <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.vehicleType}
                onChange={(e) => {
                  const vehicleType = e.target.value;
                  const recommended = recommendedCapacity(form.listingType, vehicleType);
                  setForm((f) => {
                    const totalCapacity = recommended ?? f.totalCapacity;
                    return {
                      ...f,
                      vehicleType,
                      totalCapacity,
                      numTravelers: Math.min(f.numTravelers, Math.max(1, totalCapacity - 1)),
                    };
                  });
                }}
              >
                <option value="" disabled>
                  Select
                </option>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {form.listingType !== "local" && form.vehicleType && RECOMMENDED_CAPACITY[form.vehicleType] && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Recommended capacity: {RECOMMENDED_CAPACITY[form.vehicleType]} people (reduced from the max
                  because of luggage constraints — you can still change it below).
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">
                Pickup location <span className="text-red-500">*</span>
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.pickupLocation}
                onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
              >
                {locations.pickup.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              {form.pickupLocation === "Others" && (
                <input
                  required
                  placeholder="Type the location"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.pickupOther}
                  onChange={(e) => setForm({ ...form, pickupOther: e.target.value })}
                />
              )}
            </div>

            {locations.destination === "fixed" ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drop location is default set to IIT Dharwad Hostels.
              </p>
            ) : (
              <div>
                <label className="block text-sm font-medium">
                  Destination <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                >
                  {locations.destination.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                {form.destination === "Others" && (
                  <input
                    required
                    placeholder="Type the location"
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    value={form.destinationOther}
                    onChange={(e) => setForm({ ...form, destinationOther: e.target.value })}
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">
                {form.direction === "to-campus" ? "Expected arrival date" : "Departure date"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                min={minDateStr}
                max={maxDateStr}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.dateStr}
                onChange={(e) => setForm({ ...form, dateStr: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                {form.direction === "to-campus" ? "Expected arrival time" : "Departure time"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <select
                  className="rounded-md border border-gray-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.hour}
                  onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
                  aria-label="Hour"
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-gray-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.minute}
                  onChange={(e) => setForm({ ...form, minute: Number(e.target.value) })}
                  aria-label="Minute"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {pad(m)}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-gray-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.ampm}
                  onChange={(e) => setForm({ ...form, ampm: e.target.value as "AM" | "PM" })}
                  aria-label="AM or PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only trips departing within the next {MAX_ADVANCE_DAYS} days can be listed.
              </p>
            </div>

            {similarTrips.length > 0 && !similarDismissed && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-950">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-brand-700 dark:text-brand-400">
                    {similarTrips.length === 1 ? "A trip" : `${similarTrips.length} trips`} from{" "}
                    {form.pickupLocation} around this time already exist{similarTrips.length === 1 ? "s" : ""} —
                    worth checking before listing your own?
                  </p>
                  <button
                    type="button"
                    onClick={() => setSimilarDismissed(true)}
                    className="shrink-0 text-brand-600 hover:text-brand-800 dark:text-brand-500 dark:hover:text-brand-300"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {similarTrips.slice(0, 3).map((t) => (
                    <li key={t._id}>
                      <Link href={`/trips/${t._id}`} className="text-brand-600 underline dark:text-brand-500">
                        {MODE_LABELS[t.mode] || t.mode} · {new Date(t.departureTime).toLocaleString()}
                        {t.hostId?.name ? ` · hosted by ${t.hostId.name}` : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {form.listingType === "local" && nearbyArrivalsCount > 0 && !nearbyDismissed && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-950">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-brand-700 dark:text-brand-400">
                    {nearbyArrivalsCount} {nearbyArrivalsCount === 1 ? "person is" : "people are"} currently
                    posted on this route around this time —{" "}
                    {form.direction === "to-campus" ? "waiting to come back" : "interested in heading out"} —
                    they&apos;ll be notified once you list this trip.
                  </p>
                  <button
                    type="button"
                    onClick={() => setNearbyDismissed(true)}
                    className="shrink-0 text-brand-600 hover:text-brand-800 dark:text-brand-500 dark:hover:text-brand-300"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">
                Total capacity (incl. you) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min={2}
                max={10}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.totalCapacity}
                onChange={(e) => {
                  const totalCapacity = Number(e.target.value);
                  setForm((f) => ({
                    ...f,
                    totalCapacity,
                    numTravelers: Math.min(f.numTravelers, Math.max(1, totalCapacity - 1)),
                  }));
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must leave room for at least one other rider.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium">
                How many people are travelling with you (incl. you)? <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min={1}
                max={Math.max(1, form.totalCapacity - 1)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.numTravelers}
                onChange={(e) => {
                  const numTravelers = Number(e.target.value);
                  setForm((f) => ({
                    ...f,
                    numTravelers: Math.min(numTravelers, Math.max(1, f.totalCapacity - 1)),
                  }));
                }}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                These seats are reserved automatically — remaining seats and fare split update below.
              </p>
            </div>

            {form.numTravelers > 1 && (
              <ShareCTA
                blurb="Please ask your fellow friends to onboard CoRide too — that's how they'll see this trip and get their own seat confirmed."
                pitch="Join me on CoRide — sign up so you can see my trip and get your own seat confirmed:"
              />
            )}

            <div>
              <label className="block text-sm font-medium">
                Expected total fare (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min={0}
                step="1"
                placeholder="e.g. 300"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={form.expectedFare}
                onChange={(e) => setForm({ ...form, expectedFare: e.target.value })}
              />
              {fareNumber > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your current share: ₹{perPersonShare.toFixed(0)} each ({form.numTravelers}{" "}
                  {form.numTravelers === 1 ? "person" : "people"} so far) — this drops as more riders join.
                </p>
              )}
            </div>

            {isFemale && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.girlsOnly}
                  onChange={(e) => setForm({ ...form, girlsOnly: e.target.checked })}
                />
                Girls only
              </label>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700"
            >
              Review listing
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold">Review your listing</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Trip type</dt>
                  <dd className="text-right">
                    {LISTING_TYPE_LABELS[form.listingType]} · {DIRECTION_LABELS[form.direction]}
                  </dd>
                </div>
                {form.listingType === "long-distance" && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Mode</dt>
                    <dd className="text-right">{MODE_LABELS[form.mode]} · {form.vehicleType}</dd>
                  </div>
                )}
                {form.listingType === "local" && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Vehicle</dt>
                    <dd className="text-right">{form.vehicleType}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Route</dt>
                  <dd className="text-right">{effectivePickup} → {effectiveDestination}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Type of travel</dt>
                  <dd className="text-right capitalize">{form.travelType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">
                    {form.direction === "to-campus" ? "Arrival" : "Departure"}
                  </dt>
                  <dd className="text-right">{departureDate?.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Capacity</dt>
                  <dd className="text-right">{form.numTravelers} of {form.totalCapacity} seats (you + {form.numTravelers - 1} companion{form.numTravelers - 1 === 1 ? "" : "s"})</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Fare</dt>
                  <dd className="text-right">₹{fareNumber} total · ₹{perPersonShare.toFixed(0)} each so far</dd>
                </div>
                {form.girlsOnly && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Visibility</dt>
                    <dd className="text-right">Girls only</dd>
                  </div>
                )}
              </dl>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? "Listing..." : "Confirm & list"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
