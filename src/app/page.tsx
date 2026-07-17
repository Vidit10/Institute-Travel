"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import PushSubscribe from "@/components/PushSubscribe";

type Trip = {
  _id: string;
  mode: string;
  vehicleType: string;
  pickupLocation: string;
  destination: string;
  departureTime: string;
  seatsRemaining: number;
  totalCapacity: number;
  numTravelers: number;
  expectedFare: number;
  girlsOnly?: boolean;
  hostId: { name: string; year: string; program: string };
};

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => setTrips(data.trips || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PushSubscribe />
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold">Upcoming trips</h1>

        {loading && <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>}
        {!loading && trips.length === 0 && (
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            No open trips yet. Be the first to{" "}
            <Link href="/trips/new" className="text-brand-600 underline dark:text-brand-500">
              list one
            </Link>
            .
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {trips.map((trip) => {
            const expectedFare = trip.expectedFare || 0;
            const currentTravelers = trip.totalCapacity - trip.seatsRemaining;
            const perPersonShare = currentTravelers > 0 ? expectedFare / currentTravelers : expectedFare;
            
            return (
              <li key={trip._id}>
                <Link
                  href={`/trips/${trip._id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium uppercase text-brand-600 dark:text-brand-500">
                      {trip.mode}
                    </span>
                    {trip.girlsOnly && (
                      <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                        Girls only
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-words font-medium">
                    {trip.pickupLocation} → {trip.destination}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(trip.departureTime).toLocaleString()} · {trip.vehicleType}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {trip.seatsRemaining}/{trip.totalCapacity} seats left · hosted by{" "}
                    {trip.hostId?.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ₹{perPersonShare.toFixed(0)} each so far · ₹{expectedFare} total
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
