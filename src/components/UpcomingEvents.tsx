"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "@/lib/constants";
import { EVENT_CATEGORY_ACCENT } from "@/lib/categoryColors";
import { EVENT_CATEGORY_ICON } from "@/components/icons";

const PREVIEW_COUNT = 3;

type EventPreview = {
  _id: string;
  title: string;
  category: (typeof EVENT_CATEGORIES)[number];
  location: string;
  startTime: string;
  status: string;
};

// A compact preview, not the full /events board — Events is a peer content
// type to Trips/Recommendations, not a utility link, so it earns its own
// section here (see QuickActions' comment) rather than a tile in the quick
// actions row. Kept deliberately small (a few cards + "See all") so it
// doesn't reintroduce the "too much to scroll past" problem the home page was
// last redesigned to avoid.
export default function UpcomingEvents() {
  const [events, setEvents] = useState<EventPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents((data.events || []).slice(0, PREVIEW_COUNT)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="font-medium">Events</p>
        <Link href="/events/new" className="text-sm text-brand-600 hover:underline dark:text-brand-500">
          + New
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Cricket matches, hangouts, NPTEL exams, study groups — anything happening that others can join.
      </p>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No events yet —{" "}
          <Link href="/events/new" className="text-brand-600 underline dark:text-brand-500">
            list one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((event) => {
            const CategoryIcon = EVENT_CATEGORY_ICON[event.category];
            return (
            <li key={event._id}>
              <Link
                href={`/events/${event._id}`}
                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm transition-shadow hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:hover:border-brand-700"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{event.title}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase ${EVENT_CATEGORY_ACCENT[event.category].badge}`}>
                    <CategoryIcon className={EVENT_CATEGORY_ACCENT[event.category].icon} />
                    {EVENT_CATEGORY_LABELS[event.category]}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                  {event.location} · {new Date(event.startTime).toLocaleString()}
                  {event.status === "full" && " · Full"}
                </span>
              </Link>
            </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/events"
        className="mt-3 block text-center text-sm text-brand-600 hover:underline dark:text-brand-500"
      >
        See all events →
      </Link>
    </section>
  );
}
