import { NextRequest, NextResponse } from "next/server";

// Best-effort live status lookup for a train or flight number.
// Per docs/SPEC.md section 7: no paid tier is wired up yet, and any failure
// (missing key, quota exhausted, provider error) falls back to null so the
// caller can just display the user's self-reported ETA instead.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "train" | "flight"
  const number = searchParams.get("number");

  if (!number || (mode !== "train" && mode !== "flight")) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }

  try {
    if (mode === "flight" && process.env.AVIATIONSTACK_API_KEY) {
      const res = await fetch(
        `https://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_API_KEY}&flight_iata=${encodeURIComponent(number)}`
      );
      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const data = await res.json();
      const flight = data?.data?.[0];
      if (flight) {
        return NextResponse.json({
          live: true,
          status: flight.flight_status,
          estimatedArrival: flight.arrival?.estimated,
        });
      }
    }

    if (mode === "train" && process.env.RAILWAY_API_KEY) {
      // Placeholder for a paid provider (e.g. RailwayAPI/IndianRailAPI) once one is chosen.
      // Intentionally not implemented until a provider + budget is decided —
      // falls through to the manual-entry response below.
    }
  } catch (err) {
    console.warn("live tracking lookup failed, falling back to manual entry:", err);
  }

  return NextResponse.json({ live: false });
}
