"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";
import { PICKUP_LOCATIONS, DESTINATIONS, TRIP_MODES, REFERENCE_FARES } from "@/lib/constants";

export default function NewTripPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState<{
    mode: string;
    vehicleType: string;
    pickupLocation: string;
    destination: string;
    departureTime: string;
    trainNumber: string;
    flightNumber: string;
    totalCapacity: number;
    girlsOnly: boolean;
    referenceFareNote: string;
  }>({
    mode: "train",
    vehicleType: "",
    pickupLocation: PICKUP_LOCATIONS[0],
    destination: DESTINATIONS[0],
    departureTime: "",
    trainNumber: "",
    flightNumber: "",
    totalCapacity: 3,
    girlsOnly: false,
    referenceFareNote: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isFemale = session?.user?.gender === "female";

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
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.formErrors?.join(", ") || data.error || "Failed to create trip");
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
            <label className="block text-sm font-medium">Mode</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
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
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.trainNumber}
                onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
              />
            </div>
          )}
          {form.mode === "flight" && (
            <div>
              <label className="block text-sm font-medium">Flight number (optional)</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Vehicle for the onward trip</label>
            <input
              required
              placeholder="e.g. Nischayan, Cab, Tumtum"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Pickup location</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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
              <p className="mt-1 text-xs text-gray-400">
                Typical full-cab fare from {form.pickupLocation}: {REFERENCE_FARES[form.pickupLocation]} (estimate)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Destination</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            >
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Expected arrival at pickup</label>
            <input
              required
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Total capacity (incl. you)</label>
            <input
              required
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.totalCapacity}
              onChange={(e) => setForm({ ...form, totalCapacity: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Reference fare (optional, informational only)</label>
            <input
              placeholder="e.g. ~₹300 total"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.referenceFareNote}
              onChange={(e) => setForm({ ...form, referenceFareNote: e.target.value })}
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

          {error && <p className="text-sm text-red-600">{error}</p>}

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
