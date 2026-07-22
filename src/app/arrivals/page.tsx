"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  PICKUP_LOCATIONS,
  TRIP_MODES,
  MAX_ADVANCE_DAYS,
  YEAR_LABELS,
  PROGRAM_LABELS,
} from "@/lib/constants";

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

const today = new Date();
const minDateStr = toDateInputValue(today);
const maxDateStr = toDateInputValue(new Date(today.getTime() + MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type Entry = {
  _id: string;
  arrivalTime: string;
  mode?: string;
  partySize: number;
  girlsOnly?: boolean;
  userId: { _id: string; name: string; year: string; program: string };
};

type Overview = { location: string; count: number; people: number };
type MyEntry = { _id: string; pickupLocation: string; arrivalTime: string; partySize: number };

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
  const [myEntries, setMyEntries] = useState<MyEntry[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [exact, setExact] = useState<Entry[]>([]);
  const [nearby, setNearby] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    pickupLocation: PICKUP_LOCATIONS[0] as string,
    mode: "" as string,
    dateStr: "",
    hour: 9,
    minute: 0,
    ampm: "AM" as "AM" | "PM",
    partySize: 1,
    girlsOnly: false,
  });
  const [isFemale, setIsFemale] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadOverview = useCallback(() => {
    fetch("/api/arrivals")
      .then((r) => r.json())
      .then((data) => {
        setOverview(data.overview);
        setMyEntries(data.myEntries || []);
        setIsFemale(data.myProfile?.gender === "female");
        setForm((f) => ({ ...f, girlsOnly: !!data.myProfile?.arrivalsGirlsOnlyDefault }));
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

  function selectLocation(location: string) {
    setSelectedLocation(location);
    loadDetail(location);
  }

  async function postIntent(e: React.FormEvent) {
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
        partySize: Number(form.partySize),
        girlsOnly: isFemale ? form.girlsOnly : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setPosting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error || "Couldn't post — try again.");
      return;
    }
    loadOverview();
    selectLocation(form.pickupLocation);
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

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">Who else is arriving when you are?</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Not sure how many people you'll be splitting a ride with yet? Log your arrival time
          and see who else is around — then turn it into a real listing once you know your group.
        </p>

        {myEntries.length > 0 && (
          <div className="mt-4 space-y-2">
            {myEntries.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm dark:border-brand-900 dark:bg-brand-950"
              >
                <span>
                  You're posted at <strong>{m.pickupLocation}</strong> around{" "}
                  {new Date(m.arrivalTime).toLocaleString()}
                </span>
                <button onClick={() => withdraw(m._id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={postIntent} className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Log your arrival</h2>

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
                min={minDateStr}
                max={maxDateStr}
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

          <div>
            <label className="block text-sm font-medium">
              How many in your group already? <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.partySize}
              onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
            />
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
            {posting ? "Posting..." : "Post my arrival"}
          </button>
        </form>

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
      </main>
    </>
  );
}
