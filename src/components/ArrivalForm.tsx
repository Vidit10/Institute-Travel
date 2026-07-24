"use client";

import { useState } from "react";
import { PICKUP_LOCATIONS, TRIP_MODES } from "@/lib/constants";

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

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export type ArrivalEntry = {
  _id: string;
  pickupLocation: string;
  arrivalTime: string;
  mode?: string;
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
  submitLabel = "Post my arrival",
  onSuccess,
}: {
  initialEntry?: ArrivalEntry;
  isFemale: boolean;
  defaultGirlsOnly?: boolean;
  submitLabel?: string;
  onSuccess: (entry: ArrivalEntry) => void;
}) {
  const initialDate = initialEntry ? new Date(initialEntry.arrivalTime) : null;
  const initialHour24 = initialDate?.getHours() ?? 9;

  const [form, setForm] = useState({
    pickupLocation: initialEntry?.pickupLocation || (PICKUP_LOCATIONS[0] as string),
    mode: initialEntry?.mode || "",
    dateStr: initialDate ? toDateInputValue(initialDate) : "",
    hour: initialDate ? (initialHour24 % 12 === 0 ? 12 : initialHour24 % 12) : 9,
    minute: initialDate ? initialDate.getMinutes() : 0,
    ampm: (initialDate && initialHour24 >= 12 ? "PM" : "AM") as "AM" | "PM",
    girlsOnly: initialEntry?.girlsOnly ?? !!defaultGirlsOnly,
  });
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

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

    setPosting(true);
    const res = await fetch("/api/arrivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupLocation: form.pickupLocation,
        arrivalTime: date.toISOString(),
        mode: form.mode || undefined,
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
        <label className="block text-sm font-medium">
          Pickup location <span className="text-red-500">*</span>
        </label>
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form.pickupLocation}
          onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
        >
          {PICKUP_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

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
