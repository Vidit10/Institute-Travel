"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { REFERENCE_FARES } from "@/lib/constants";

type RequestSummary = {
  _id: string;
  status: string;
  createdAt: string;
  rider: { name: string; year: string; program: string; phone: string | null };
};

type TripDetail = {
  trip: {
    _id: string;
    mode: string;
    vehicleType: string;
    pickupLocation: string;
    destination: string;
    departureTime: string;
    seatsRemaining: number;
    totalCapacity: number;
    status: string;
    girlsOnly?: boolean;
    referenceFareNote?: string;
    trainNumber?: string;
    flightNumber?: string;
  };
  isHost: boolean;
  host: { name: string; year: string; program: string; phone: string | null };
  myRequest: { status: string } | null;
  requests: RequestSummary[];
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TripDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <>
        <NavBar />
        <main className="mx-auto max-w-md px-4 py-6 text-gray-400">Loading...</main>
      </>
    );
  }

  const { trip, isHost, host, myRequest, requests } = data;

  async function cancelTrip() {
    if (!confirm("Cancel this trip? Pending requests will be declined and riders notified.")) return;
    setBusy(true);
    const res = await fetch(`/api/trips/${id}/cancel`, { method: "POST" });
    setBusy(false);
    if (res.ok) load();
  }

  async function sendRequest() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/trips/${id}/requests`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Failed to send request");
      return;
    }
    setMessage("Request sent!");
    load();
  }

  async function respond(requestId: string, action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/trips/${id}/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) load();
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6">
        {trip.status === "cancelled" && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            This trip was cancelled by the host.
          </p>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium uppercase text-brand-600">{trip.mode}</span>
            {trip.girlsOnly && (
              <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-700">Girls only</span>
            )}
          </div>
          <p className="mt-1 text-lg font-semibold">
            {trip.pickupLocation} → {trip.destination}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(trip.departureTime).toLocaleString()} · {trip.vehicleType}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {trip.seatsRemaining}/{trip.totalCapacity} seats left
          </p>
          {trip.referenceFareNote ? (
            <p className="mt-1 text-xs text-gray-400">Reference fare: {trip.referenceFareNote}</p>
          ) : (
            REFERENCE_FARES[trip.pickupLocation] && (
              <p className="mt-1 text-xs text-gray-400">
                Typical full-cab fare from {trip.pickupLocation}: {REFERENCE_FARES[trip.pickupLocation]} (estimate)
              </p>
            )
          )}
          {(trip.trainNumber || trip.flightNumber) && (
            <p className="mt-1 text-xs text-gray-400">
              {trip.trainNumber ? `Train ${trip.trainNumber}` : `Flight ${trip.flightNumber}`}
            </p>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
            <p className="font-medium">Host: {host.name}</p>
            <p className="text-gray-400">{host.year} · {host.program}</p>
            {host.phone ? (
              <p className="mt-1 text-brand-600">{host.phone}</p>
            ) : (
              <p className="mt-1 text-gray-400">Phone visible once your request is accepted</p>
            )}
          </div>
        </div>

        {message && <p className="mt-3 text-sm text-brand-600">{message}</p>}

        {isHost && trip.status !== "cancelled" && trip.status !== "completed" && (
          <button
            onClick={cancelTrip}
            disabled={busy}
            className="mt-4 w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel this trip
          </button>
        )}

        {!isHost && !myRequest && trip.status === "open" && trip.seatsRemaining > 0 && (
          <button
            onClick={sendRequest}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Request to join
          </button>
        )}
        {myRequest && (
          <p className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600">
            Your request status: <span className="font-medium">{myRequest.status}</span>
          </p>
        )}

        {requests.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-500">Requests to join</h2>
            <ul className="mt-2 space-y-2">
              {requests.map((r) => (
                <li key={r._id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="font-medium">{r.rider.name}</p>
                  <p className="text-xs text-gray-400">{r.rider.year} · {r.rider.program} · {r.status}</p>
                  {r.rider.phone && <p className="mt-1 text-sm text-brand-600">{r.rider.phone}</p>}
                  {r.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => respond(r._id, "accept")}
                        disabled={busy}
                        className="rounded bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respond(r._id, "decline")}
                        disabled={busy}
                        className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
