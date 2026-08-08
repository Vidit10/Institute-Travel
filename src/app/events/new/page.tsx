"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, MAX_EVENT_DESCRIPTION_LENGTH } from "@/lib/constants";

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof EVENT_CATEGORIES)[number]>("sports");
  const [location, setLocation] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [startTime, setStartTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const startDate = startTime ? new Date(startTime) : null;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        category,
        location,
        mapLink: mapLink || undefined,
        startTime: startDate?.toISOString(),
        capacity: capacity ? Number(capacity) : undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || data?.error?.fieldErrors?.startTime?.[0] || data?.error || "Couldn't create — check your inputs.");
      return;
    }
    router.push(`/events/${data.event._id}`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">New event</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          List something happening — others can RSVP directly, no approval needed from you.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof EVENT_CATEGORIES)[number])}
            >
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EVENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              maxLength={100}
              placeholder="e.g. Cricket match at the ground"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              rows={3}
              maxLength={MAX_EVENT_DESCRIPTION_LENGTH}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              required
              maxLength={200}
              placeholder="e.g. Sports ground"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Map link (optional)</label>
            <input
              type="url"
              maxLength={500}
              placeholder="Paste a Google Maps share link"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={mapLink}
              onChange={(e) => setMapLink(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Start time <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Capacity (optional — leave blank for unlimited)</label>
            <input
              type="number"
              min={1}
              max={500}
              placeholder="e.g. 20"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create event"}
          </button>
        </form>
      </main>
    </>
  );
}
