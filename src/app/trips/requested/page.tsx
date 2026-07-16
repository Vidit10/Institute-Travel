"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";

type MyRequest = {
  _id: string;
  status: string;
  expiresAt: string;
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
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-400",
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
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold">Trips you&apos;ve requested to join</h1>

        {loading && <p className="mt-4 text-gray-400">Loading...</p>}
        {!loading && requests.length === 0 && (
          <p className="mt-4 text-gray-400">
            No requests yet.{" "}
            <Link href="/" className="text-brand-600 underline">
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
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium uppercase text-brand-600">{r.trip.mode}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="mt-1 font-medium">
                  {r.trip.pickupLocation} → {r.trip.destination}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(r.trip.departureTime).toLocaleString()} · hosted by {r.trip.hostName}
                </p>
                {r.trip.hostPhone && <p className="mt-1 text-sm text-brand-600">{r.trip.hostPhone}</p>}
                {r.status === "pending" && (
                  <p className="mt-1 text-xs text-gray-400">
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
