"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import RidesTabs from "@/components/RidesTabs";
import LoadingScreen from "@/components/LoadingScreen";

type MyRequest = {
  _id: string;
  status: string;
  expiresAt: string;
  isNew: boolean;
  trip: {
    _id: string;
    mode: string;
    pickupLocation: string;
    destination: string;
    departureTime: string;
    hostName: string;
    hostPhone: string | null;
  };
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  accepted: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  declined: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  expired: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-500",
};

export default function RequestedTripsPage() {
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trips/requested")
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">My Rides</h1>
        <RidesTabs />

        {loading && <LoadingScreen />}
        {!loading && requests.length === 0 && (
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            No requests yet.{" "}
            <Link href="/" className="text-brand-600 underline dark:text-brand-500">
              Browse trips
            </Link>
            .
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li key={r._id}>
              <Link
                href={`/trips/${r.trip._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium uppercase text-brand-600 dark:text-brand-500">{r.trip.mode}</span>
                    {r.isNew && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">New</span>
                    )}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="mt-1 break-words font-medium">
                  {r.trip.pickupLocation} → {r.trip.destination}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(r.trip.departureTime).toLocaleString()} · hosted by {r.trip.hostName}
                </p>
                {r.trip.hostPhone && <p className="mt-1 text-sm text-brand-600 dark:text-brand-500">{r.trip.hostPhone}</p>}
                {r.status === "pending" && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Expires {new Date(r.expiresAt).toLocaleString()} if the host doesn&apos;t respond
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
