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
  girlsOnly?: boolean;
  referenceFareNote?: string;
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

        {loading && <p className="mt-4 text-gray-400">Loading...</p>}
        {!loading && trips.length === 0 && (
          <p className="mt-4 text-gray-400">
            No open trips yet. Be the first to{" "}
            <Link href="/trips/new" className="text-brand-600 underline">
              list one
            </Link>
            .
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {trips.map((trip) => (
            <li key={trip._id}>
              <Link
                href={`/trips/${trip._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium uppercase text-brand-600">
                    {trip.mode}
                  </span>
                  {trip.girlsOnly && (
                    <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700">
                      Girls only
                    </span>
                  )}
                </div>
                <p className="mt-1 font-medium">
                  {trip.pickupLocation} → {trip.destination}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(trip.departureTime).toLocaleString()} · {trip.vehicleType}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {trip.seatsRemaining}/{trip.totalCapacity} seats left · hosted by{" "}
                  {trip.hostId?.name}
                </p>
                {trip.referenceFareNote && (
                  <p className="mt-1 text-xs text-gray-400">Reference fare: {trip.referenceFareNote}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
