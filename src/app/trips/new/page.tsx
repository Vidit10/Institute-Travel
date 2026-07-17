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
  MAX_ADVANCE_HOURS,
} from "@/lib/constants";

// Pre-fills the pickup location based on travel mode — still editable.
const DEFAULT_PICKUP_BY_MODE: Record<string, (typeof PICKUP_LOCATIONS)[number]> = {
  train: "Dharwad Railway Station",
  flight: "Hubli Airport",
  bus: "Dharwad New Bus Stand",
};

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const now = new Date();
const minDeparture = toDatetimeLocalValue(now);
const maxDeparture = toDatetimeLocalValue(new Date(now.getTime() + MAX_ADVANCE_HOURS * 60 * 60 * 1000));

export default function NewTripPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState<{
    mode: string;
    vehicleType: string;
    pickupLocation: string;
    departureTime: string;
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
    departureTime: "",
    trainNumber: "",
    flightNumber: "",
    totalCapacity: 3,
    numTravelers: 1,
    companionEmails: [],
    girlsOnly: false,
    expectedFare: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFemale = session?.user?.gender === "female";
  const fareNumber = Number(form.expectedFare) || 0;
  const perPersonShare = form.numTravelers > 0 ? fareNumber / form.numTravelers : 0;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        departureTime: new Date(form.departureTime).toISOString(),
        totalCapacity: Number(form.totalCapacity),
        numTravelers: Number(form.numTravelers),
        expectedFare: fareNumber,
        companionEmails: form.companionEmails.filter((e) => e.trim() !== ""),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const fieldErrors = data.error?.fieldErrors
        ? Object.values(data.error.fieldErrors).flat().join(", ")
        : null;
      setError(fieldErrors || data.error?.formErrors?.join(", ") || data.error || "Failed to create trip");
      setSubmitting(false);
      return;
    }

    router.push(`/trips/${data.trip._id}`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-lg font-semibold">List a trip</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                  {m}
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
            {REFERENCE_FARES[form.pickupLocation] && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Typical full-vehicle fare from {form.pickupLocation}: {REFERENCE_FARES[form.pickupLocation]} (estimate)
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Destination is fixed to IIT Dharwad Hostels for now.
          </p>

          <div>
            <label className="block text-sm font-medium">
              Expected arrival at pickup <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="datetime-local"
              min={minDeparture}
              max={maxDeparture}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only trips departing within the next {MAX_ADVANCE_HOURS} hours can be listed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Total capacity (incl. you) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.totalCapacity}
              onChange={(e) => setForm({ ...form, totalCapacity: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              How many people are travelling with you (incl. you)? <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min={1}
              max={form.totalCapacity}
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
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create listing"}
          </button>
        </form>
      </main>
    </>
  );
}
