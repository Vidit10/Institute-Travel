"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  kind: "host_pending" | "rider_update";
  requestId: string;
  tripId: string;
  label: string;
  at: string;
};

const POLL_MS = 25_000;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setItems(data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleOpen() {
    setOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        fetch("/api/notifications", { method: "POST" }).catch(() => {});
      }
      return willOpen;
    });
  }

  async function respond(requestId: string, tripId: string, action: "accept" | "decline") {
    setBusyId(requestId);
    await fetch(`/api/trips/${tripId}/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => {});
    setBusyId(null);
    fetchNotifications();
  }

  function goToTrip(tripId: string) {
    setOpen(false);
    router.push(`/trips/${tripId}`);
  }

  const count = items.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label={count > 0 ? `${count} new notifications` : "Notifications"}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M15 8a5 5 0 00-10 0c0 4-2 5-2 5h14s-2-1-2-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 16a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.requestId + item.kind}
                  className="rounded-md px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <button onClick={() => goToTrip(item.tripId)} className="block w-full break-words text-left">
                    {item.label}
                  </button>
                  {item.kind === "host_pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => respond(item.requestId, item.tripId, "accept")}
                        disabled={busyId === item.requestId}
                        className="rounded bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respond(item.requestId, item.tripId, "decline")}
                        disabled={busyId === item.requestId}
                        className="rounded bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
