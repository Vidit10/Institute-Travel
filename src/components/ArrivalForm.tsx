"use client";

import { useState } from "react";
import {
  PICKUP_LOCATIONS,
  CAMPUS_LOCATIONS,
  CITY_LOCATIONS,
  TRIP_MODES,
  DIRECTIONS,
  DIRECTION_LABELS,
  LISTING_TYPES,
  resolveTripCombo,
} from "@/lib/constants";

const LISTING_TYPE_LABELS: Record<(typeof LISTING_TYPES)[number], string> = {
  "long-distance": "Long-distance (train/flight/bus)",
  local: "Local, around the city",
};

// Which location list the anchor field draws from for a given combo — mirrors
// the pairing used by the Trip creation form (src/app/trips/new/page.tsx).
function pickupOptions(listingType: string, direction: string): readonly string[] {
  const combo = resolveTripCombo(listingType, direction);
  switch (combo) {
    case "arrival":
      return PICKUP_LOCATIONS;
    case "departure-long":
    case "local-departure":
      return CAMPUS_LOCATIONS;
    case "local-return":
      return CITY_LOCATIONS;
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function buildDate(dateStr: string, hour: number, minute: number, ampm: "AM" | "PM") {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  let hour24 = hour % 12;
  if (ampm === "PM") hour24 += 12;
  return new Date(y, m - 1, d, hour24, minute, 0, 0);
}
function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Convenience defaults, local trips only (long-distance keeps the plain
// 9:00 AM default — arrival times there are dictated by the train/flight/bus,
// not a typical daily routine): returning to campus in the evening, heading
// out early afternoon. Still just a starting point — fully editable either way.
function defaultTime(listingType: string, direction: string): { hour: number; ampm: "AM" | "PM" } {
  if (listingType !== "local") return { hour: 9, ampm: "AM" };
  return direction === "to-campus" ? { hour: 9, ampm: "PM" } : { hour: 2, ampm: "PM" };
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export type ArrivalEntry = {
  _id: string;
  pickupLocation: string;
  direction?: "to-campus" | "from-campus";
  listingType?: "long-distance" | "local";
  arrivalTime: string;
  mode?: string;
  trainNumber?: string;
  flightNumber?: string;
  girlsOnly?: boolean;
};

// Shared between the home page (compact, "log your arrival now") and
// /arrivals (full board) — one place for the field set and submit logic so
// the two surfaces can't drift apart. No partySize field (dropped per
// product decision — the arrivals board no longer collects a headcount).
export default function ArrivalForm({
  initialEntry,
  isFemale,
  defaultGirlsOnly,
  defaultDirection = "to-campus",
  defaultListingType = "long-distance",
  submitLabel = "Post my arrival",
  onSuccess,
}: {
  initialEntry?: ArrivalEntry;
  isFemale: boolean;
  defaultGirlsOnly?: boolean;
  defaultDirection?: (typeof DIRECTIONS)[number];
  defaultListingType?: (typeof LISTING_TYPES)[number];
  submitLabel?: string;
  onSuccess: (entry: ArrivalEntry) => void;
}) {
  const initialDate = initialEntry ? new Date(initialEntry.arrivalTime) : null;
  const initialHour24 = initialDate?.getHours() ?? 9;
  const initialDirection = initialEntry?.direction || defaultDirection;
  const initialListingType = initialEntry?.listingType || defaultListingType;
  const initialTime = defaultTime(initialListingType, initialDirection);

  const [form, setForm] = useState({
    direction: initialDirection,
    listingType: initialListingType,
    pickupLocation:
      initialEntry?.pickupLocation || pickupOptions(initialListingType, initialDirection)[0],
    pickupOther: "",
    mode: initialEntry?.mode || "",
    trainNumber: initialEntry?.trainNumber || "",
    flightNumber: initialEntry?.flightNumber || "",
    dateStr: toDateInputValue(initialDate || new Date()),
    hour: initialDate ? (initialHour24 % 12 === 0 ? 12 : initialHour24 % 12) : initialTime.hour,
    minute: initialDate ? initialDate.getMinutes() : 0,
    ampm: (initialDate ? (initialHour24 >= 12 ? "PM" : "AM") : initialTime.ampm) as "AM" | "PM",
    girlsOnly: initialEntry?.girlsOnly ?? !!defaultGirlsOnly,
  });
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const options = pickupOptions(form.listingType, form.direction);
  const effectivePickup = form.pickupLocation === "Others" ? form.pickupOther.trim() : form.pickupLocation;

  function updateTripType(listingType: (typeof LISTING_TYPES)[number], direction: (typeof DIRECTIONS)[number]) {
    const { hour, ampm } = defaultTime(listingType, direction);
    setForm((f) => ({
      ...f,
      listingType,
      direction,
      pickupLocation: pickupOptions(listingType, direction)[0],
      pickupOther: "",
      hour,
      minute: 0,
      ampm,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const date = buildDate(form.dateStr, form.hour, form.minute, form.ampm);
    if (!date) {
      setError("Pick an arrival date.");
      return;
    }
    if (date.getTime() <= Date.now()) {
      setError("That time has already passed.");
      return;
    }
    if (!effectivePickup) {
      setError("Pick a location.");
      return;
    }

    setPosting(true);
    const res = await fetch("/api/arrivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupLocation: effectivePickup,
        direction: form.direction,
        listingType: form.listingType,
        arrivalTime: date.toISOString(),
        mode: form.mode || undefined,
        trainNumber: form.mode === "train" ? form.trainNumber || undefined : undefined,
        flightNumber: form.mode === "flight" ? form.flightNumber || undefined : undefined,
        partySize: 1,
        girlsOnly: isFemale ? form.girlsOnly : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setPosting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't post — try again.");
      return;
    }
    onSuccess(data.entry);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Trip type</label>
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form.listingType}
          onChange={(e) => updateTripType(e.target.value as (typeof LISTING_TYPES)[number], form.direction)}
        >
          {LISTING_TYPES.map((lt) => (
            <option key={lt} value={lt}>{LISTING_TYPE_LABELS[lt]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Direction</label>
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
        <label className="block text-sm font-medium">
          {form.direction === "to-campus" ? "Pickup location" : "Meeting point"} <span className="text-red-500">*</span>
        </label>
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form.pickupLocation}
          onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
        >
          {options.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
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

      <div className={form.listingType === "local" ? "" : "grid grid-cols-2 gap-3"}>
        <div>
          <label className="block text-sm font-medium">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="date"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.dateStr}
            onChange={(e) => setForm({ ...form, dateStr: e.target.value })}
          />
        </div>
        {/* Train/flight mode only makes sense for the long-distance semester-start
            flow — a local campus<->city hop has no such concept. */}
        {form.listingType !== "local" && (
          <div>
            <label className="block text-sm font-medium">Mode (optional)</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              <option value="">Not sure yet</option>
              {TRIP_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {form.listingType !== "local" && form.mode === "train" && (
        <div>
          <label className="block text-sm font-medium">Train number (optional)</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.trainNumber}
            onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
          />
        </div>
      )}
      {form.listingType !== "local" && form.mode === "flight" && (
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
          Time <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <select
            className="rounded-md border border-gray-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.hour}
            onChange={(e) => setForm({ ...form, hour: Number(e.target.value) })}
            aria-label="Hour"
          >
            {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={form.minute}
            onChange={(e) => setForm({ ...form, minute: Number(e.target.value) })}
            aria-label="Minute"
          >
            {MINUTES.map((m) => <option key={m} value={m}>{pad(m)}</option>)}
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
        disabled={posting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {posting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
