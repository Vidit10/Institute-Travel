"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import RidesTabs from "@/components/RidesTabs";
import LoadingScreen from "@/components/LoadingScreen";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  full: "Fully booked",
  cancelled: "Cancelled",
  completed: "Completed",
};

type MyTrip = {
  _id: string;
  mode: string;
  pickupLocation: string;
  destination: string;
  departureTime: string;
  seatsRemaining: number;
  totalCapacity: number;
  status: string;
  pendingRequestCount: number;
};

export default function MyTripsPage() {
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trips/mine")
      .then((r) => r.json())
      .then((data) => setTrips(data.trips || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">My Rides</h1>
        <RidesTabs />

        {loading && <LoadingScreen />}
        {!loading && trips.length === 0 && (
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            You haven&apos;t listed a trip yet.{" "}
            <Link href="/trips/new" className="text-brand-600 underline dark:text-brand-500">
              List one
            </Link>
            .
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {trips.map((trip) => (
            <li key={trip._id}>
              <Link
                href={`/trips/${trip._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium uppercase text-brand-600 dark:text-brand-500">{trip.mode}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {STATUS_LABELS[trip.status] ?? trip.status}
                  </span>
                </div>
                <p className="mt-1 break-words font-medium">
                  {trip.pickupLocation} → {trip.destination}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(trip.departureTime).toLocaleString()}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  {trip.seatsRemaining}/{trip.totalCapacity} seats left
                  {trip.pendingRequestCount > 0 && (
                    <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {trip.pendingRequestCount} pending request{trip.pendingRequestCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
