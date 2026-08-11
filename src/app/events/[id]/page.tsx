"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, YEAR_LABELS, PROGRAM_LABELS } from "@/lib/constants";
import { EVENT_CATEGORY_ACCENT } from "@/lib/categoryColors";

type EventDetail = {
  _id: string;
  title: string;
  description?: string;
  category: (typeof EVENT_CATEGORIES)[number];
  location: string;
  mapLink?: string;
  startTime: string;
  capacity?: number | null;
  spotsRemaining?: number | null;
  status: string;
};

type Rsvp = {
  _id: string;
  partySize: number;
  person: { name: string; year: string; program: string };
};

function formatPerson(p: Rsvp["person"]) {
  const yearLabel = YEAR_LABELS[p.year] || p.year;
  const programLabel = p.program === "PhD" ? "" : ` · ${PROGRAM_LABELS[p.program as keyof typeof PROGRAM_LABELS] || p.program}`;
  return `${p.name} — ${yearLabel}${programLabel}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [host, setHost] = useState<{ name: string; year: string; program: string } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myRsvp, setMyRsvp] = useState<Rsvp | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [partySize, setPartySize] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event);
        setHost(data.host);
        setIsHost(data.isHost);
        setMyRsvp(data.myRsvp);
        setRsvps(data.rsvps || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function rsvp() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/events/${id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partySize }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || "Couldn't RSVP — try again.");
      return;
    }
    load();
  }

  async function leave() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/events/${id}/rsvp`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(data?.error || "Couldn't leave — try again.");
      return;
    }
    load();
  }

  async function cancelEvent() {
    if (!confirm("Cancel this event? Everyone who RSVP'd will be notified.")) return;
    setBusy(true);
    const res = await fetch(`/api/events/${id}/cancel`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.push("/events");
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <LoadingScreen />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <NavBar />
        <main className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-gray-500 dark:text-gray-400">Event not found.</p>
        </main>
      </>
    );
  }

  const full = event.status === "full";
  const closed = event.status === "cancelled" || event.status === "completed";

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${EVENT_CATEGORY_ACCENT[event.category].badge}`}>
          {EVENT_CATEGORY_LABELS[event.category]}
        </span>
        <h1 className="mt-1 text-xl font-bold">{event.title}</h1>
        {event.status === "cancelled" && (
          <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">Cancelled</p>
        )}
        {event.status === "completed" && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This event has ended.</p>
        )}
        {event.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{event.description}</p>}

        <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>
            {event.location}
            {event.mapLink && (
              <>
                {" · "}
                <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-500">
                  View on Maps →
                </a>
              </>
            )}
          </p>
          <p>{new Date(event.startTime).toLocaleString()}</p>
          <p>Hosted by {host?.name}</p>
          {event.capacity != null && (
            <p>
              {event.spotsRemaining}/{event.capacity} spots left
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!isHost && !closed && !myRsvp && (
          <div className="mt-4 flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Party size</label>
              <input
                type="number"
                min={1}
                max={20}
                className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </div>
            <button
              type="button"
              onClick={rsvp}
              disabled={busy || full}
              className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {full ? "Full" : busy ? "RSVPing..." : "RSVP"}
            </button>
          </div>
        )}

        {!isHost && myRsvp && !closed && (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-brand-600 dark:text-brand-500">You&apos;re going ({myRsvp.partySize} {myRsvp.partySize === 1 ? "person" : "people"}).</p>
            <button
              type="button"
              onClick={leave}
              disabled={busy}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Leave
            </button>
          </div>
        )}

        {isHost && !closed && (
          <button
            type="button"
            onClick={cancelEvent}
            disabled={busy}
            className="mt-4 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Cancel event
          </button>
        )}

        <h2 className="mt-6 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Going ({rsvps.reduce((sum, r) => sum + r.partySize, 0)})
        </h2>
        {rsvps.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No one&apos;s RSVP&apos;d yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rsvps.map((r) => (
              <li key={r._id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                {formatPerson(r.person)}
                {r.partySize > 1 ? ` (+${r.partySize - 1})` : ""}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          <Link
            href={`/feedback?category=report&context=${encodeURIComponent(`Event "${event.title}" (id: ${event._id})`)}`}
            className="hover:underline"
          >
            Report this event
          </Link>
        </p>
      </main>
    </>
  );
}
