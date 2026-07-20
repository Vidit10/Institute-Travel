"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";
import {
  PICKUP_LOCATIONS,
  TRIP_MODES,
  VEHICLE_TYPES,
  REFERENCE_FARES,
  RECOMMENDED_CAPACITY,
  MAX_ADVANCE_DAYS,
  MINUTE_OPTIONS,
} from "@/lib/constants";

// Pre-fills the pickup location based on travel mode — still editable.
const DEFAULT_PICKUP_BY_MODE: Record<string, (typeof PICKUP_LOCATIONS)[number]> = {
  train: "Dharwad Railway Station",
  flight: "Hubli Airport",
  bus: "Dharwad New Bus Stand",
};

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

const today = new Date();
const minDateStr = toDateInputValue(today);
const maxDateStr = toDateInputValue(new Date(today.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

const MODE_LABELS: Record<string, string> = { train: "Train", flight: "Flight", bus: "Bus" };

export default function NewTripPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState<{
    mode: string;
    vehicleType: string;
    pickupLocation: string;
    dateStr: string;
    hour: number;
    minute: number;
    ampm: "AM" | "PM";
    trainNumber: string;
    flightNumber: string;
    totalCapacity: number;
    numTravelers: number;
    companionEmails: string[];
    girlsOnly: boolean;
    expectedFare: string;
  }>({
    mode: "train",
    vehicleType: "",
    pickupLocation: DEFAULT_PICKUP_BY_MODE.train,
    dateStr: "",
    hour: 9,
    minute: 0,
    ampm: "AM",
    trainNumber: "",
    flightNumber: "",
    totalCapacity: 3,
    numTravelers: 1,
    companionEmails: [],
    girlsOnly: false,
    expectedFare: "",
  });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFemale = session?.user?.gender === "female";
  const fareNumber = Number(form.expectedFare) || 0;
  const perPersonShare = form.numTravelers > 0 ? fareNumber / form.numTravelers : 0;
  const departureDate = buildDepartureDate(form.dateStr, form.hour, form.minute, form.ampm);

  function updateCompanionCount(numTravelers: number) {
    const companionCount = Math.max(0, numTravelers - 1);
    setForm((f) => ({
      ...f,
      numTravelers,
      companionEmails: Array.from(
        { length: companionCount },
        (_, i) => f.companionEmails[i] || ""
      ),
    }));
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
        mode: form.mode,
        vehicleType: form.vehicleType,
        pickupLocation: form.pickupLocation,
        departureTime: departureDate.toISOString(),
        trainNumber: form.trainNumber,
        flightNumber: form.flightNumber,
        totalCapacity: Number(form.totalCapacity),
        numTravelers: Number(form.numTravelers),
        expectedFare: fareNumber,
        companionEmails: form.companionEmails.filter((e) => e.trim() !== ""),
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

    router.push(`/trips/${data.trip._id}`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-lg font-semibold">List a trip</h1>

        {!confirming ? (
          <form onSubmit={handleReview} className="mt-4 space-y-4">
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
                    pickupLocation: DEFAULT_PICKUP_BY_MODE[mode] || f.pickupLocation,
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

            {form.mode === "train" && (
              <div>
                <label className="block text-sm font-medium">Train number (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={form.trainNumber}
                  onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
                />
              </div>
            )}
            {form.mode === "flight" && (
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
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
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
              {form.vehicleType && RECOMMENDED_CAPACITY[form.vehicleType] && (
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
                {PICKUP_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Expected arrival date <span className="text-red-500">*</span>
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
                Expected arrival time <span className="text-red-500">*</span>
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
                onChange={(e) => updateCompanionCount(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                These seats are reserved automatically — remaining seats and fare split update below.
              </p>
            </div>

            {form.companionEmails.map((email, i) => (
              <div key={i}>
                <label className="block text-sm font-medium">
                  Co-traveller {i + 1}&apos;s IIT Dharwad email <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="rollno@iitdh.ac.in"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={email}
                  onChange={(e) => {
                    const companionEmails = [...form.companionEmails];
                    companionEmails[i] = e.target.value;
                    setForm({ ...form, companionEmails });
                  }}
                />
              </div>
            ))}
            {form.companionEmails.length > 0 && (
              <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
                If they already have an account, their seat is reserved instantly. If not, we&apos;ll
                email them an invite link to confirm it.
              </p>
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
              {REFERENCE_FARES[form.pickupLocation] && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Typical full-vehicle fare from {form.pickupLocation}: {REFERENCE_FARES[form.pickupLocation]} (estimate)
                </p>
              )}
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

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drop location is default set to IIT Dharwad Hostels.
            </p>

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
                  <dt className="text-gray-500 dark:text-gray-400">Mode</dt>
                  <dd className="text-right">{MODE_LABELS[form.mode]} · {form.vehicleType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Route</dt>
                  <dd className="text-right">{form.pickupLocation} → IIT Dharwad Hostels</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Departure</dt>
                  <dd className="text-right">{departureDate?.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">Capacity</dt>
                  <dd className="text-right">{form.numTravelers} of {form.totalCapacity} seats (you + {form.numTravelers - 1} companion{form.numTravelers - 1 === 1 ? "" : "s"})</dd>
                </div>
                {form.companionEmails.filter((e) => e.trim()).length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">Companions</dt>
                    <dd className="break-words text-right">{form.companionEmails.filter((e) => e.trim()).join(", ")}</dd>
                  </div>
                )}
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
