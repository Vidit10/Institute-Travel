"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";

type WouldUseAgain = "yes" | "no" | "maybe";

export default function TripReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ineligible, setIneligible] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [happened, setHappened] = useState<boolean | null>(null);
  const [amountSaved, setAmountSaved] = useState("");
  const [wouldUseAgain, setWouldUseAgain] = useState<WouldUseAgain | null>(null);
  const [comments, setComments] = useState("");

  useEffect(() => {
    fetch(`/api/trips/${id}/review`)
      .then(async (r) => {
        if (!r.ok) {
          setIneligible(true);
          return;
        }
        const data = await r.json();
        setAlreadySubmitted(!!data.alreadySubmitted);
      })
      .catch(() => setIneligible(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (happened === null) {
      setError("Let us know whether the trip happened.");
      return;
    }
    if (!wouldUseAgain) {
      setError("Let us know if you'd use CoRide again.");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/trips/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        happened,
        amountSaved: happened && amountSaved ? Number(amountSaved) : undefined,
        wouldUseAgain,
        comments: comments.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Couldn't submit — try again.");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
          <LoadingScreen />
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-xl font-bold">How did your trip go?</h1>

        {ineligible && (
          <p className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            This review link isn&apos;t available for your account — it&apos;s only for people who
            hosted or were accepted onto this trip.
          </p>
        )}

        {!ineligible && (alreadySubmitted || submitted) && (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-950 dark:text-brand-400">
              Thanks so much — we&apos;ve already got your review for this trip. Really appreciate
              you taking the time.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Back to home
            </button>
          </div>
        )}

        {!ineligible && !alreadySubmitted && !submitted && (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Thanks for taking the time to use CoRide — we&apos;d love to hear how it went.
              Just a couple of quick questions.
            </p>

            <div>
              <label className="block text-sm font-medium">
                Did the trip actually happen as planned? <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex gap-2">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setHappened(opt.value)}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                      happened === opt.value
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {happened && (
              <div>
                <label className="block text-sm font-medium">
                  Roughly how much did splitting the ride save you, vs. going alone? (₹, optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  placeholder="e.g. 150"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  value={amountSaved}
                  onChange={(e) => setAmountSaved(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">
                Would you use CoRide again for your next trip? <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 flex gap-2">
                {(["yes", "maybe", "no"] as WouldUseAgain[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setWouldUseAgain(opt)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                      wouldUseAgain === opt
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Anything that almost stopped you from using CoRide? (optional)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
