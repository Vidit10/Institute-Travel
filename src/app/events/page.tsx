"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import EmptyState from "@/components/EmptyState";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "@/lib/constants";
import { EVENT_CATEGORY_ACCENT } from "@/lib/categoryColors";
import { EVENT_CATEGORY_ICON, StatusDotIcon } from "@/components/icons";

type EventListing = {
  _id: string;
  title: string;
  category: (typeof EVENT_CATEGORIES)[number];
  location: string;
  startTime: string;
  capacity?: number | null;
  spotsRemaining?: number | null;
  status: string;
  hostId?: { name: string };
};

function EventCard({ event }: { event: EventListing }) {
  const full = event.status === "full";
  const CategoryIcon = EVENT_CATEGORY_ICON[event.category];
  return (
    <Link
      href={`/events/${event._id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${EVENT_CATEGORY_ACCENT[event.category].badge}`}>
          <CategoryIcon className={EVENT_CATEGORY_ACCENT[event.category].icon} />
          {EVENT_CATEGORY_LABELS[event.category]}
        </span>
        {full && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <StatusDotIcon className="text-gray-500 dark:text-gray-400" />
            Full
          </span>
        )}
      </div>
      <p className="mt-1 break-words font-medium">{event.title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{event.location}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {new Date(event.startTime).toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Hosted by {event.hostId?.name}
        {event.capacity != null && ` · ${event.spotsRemaining}/${event.capacity} spots left`}
      </p>
    </Link>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Events</h1>
          <Link
            href="/events/new"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New event
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Cricket matches, hangouts, NPTEL exams, study groups — anything happening that others can join.
        </p>

        {loading && <LoadingScreen />}

        {!loading && events.length === 0 && (
          <EmptyState>
            No events yet.{" "}
            <Link href="/events/new" className="text-brand-600 underline dark:text-brand-500">
              List one
            </Link>
            .
          </EmptyState>
        )}

        {!loading && events.length > 0 && (
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event._id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
