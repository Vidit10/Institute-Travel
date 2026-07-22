"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";

const CATEGORIES = [
  { value: "recommendation", label: "Recommendation" },
  { value: "bug", label: "Bug" },
  { value: "report", label: "Report a trip or user" },
  { value: "profile_correction", label: "Fix my name or gender" },
  { value: "other", label: "Something else" },
];

export default function FeedbackPage() {
  return (
    <Suspense fallback={null}>
      <FeedbackForm />
    </Suspense>
  );
}

function FeedbackForm() {
  const searchParams = useSearchParams();
  // Report links elsewhere in the app (trip page, arrivals board) deep-link
  // here with a prefilled category + a plain-text label identifying what's
  // being reported — stored as-is on the Feedback doc, no admin UI needed,
  // just read directly in Mongo.
  const prefillCategory = searchParams.get("category");
  const contextLabel = searchParams.get("context") || undefined;

  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.value === prefillCategory) ? prefillCategory! : "recommendation"
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCategory, setSubmittedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmitted(false);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, contextLabel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't submit — please try again.");
        return;
      }
      setSubmittedCategory(category);
      setMessage("");
      setCategory("recommendation");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-lg font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Spotted a bug, have an idea, or need to report something? Let us know.
        </p>
        {contextLabel && (
          <p className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Regarding: {contextLabel}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              minLength={1}
              maxLength={2000}
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === "report"
                  ? "What happened? Include any details that would help us look into it."
                  : category === "profile_correction"
                  ? "What's wrong, and what should it say instead? (e.g. \"My gender is listed as Male, it should be Female.\")"
                  : "Tell us what's on your mind..."
              }
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {submitted && (
            <p className="text-sm text-brand-600 dark:text-brand-500">
              {submittedCategory === "profile_correction"
                ? "Thanks — we'll update it directly in the database. Sign out and back in (allow 24–48 hours) to see it reflected."
                : "Thanks for the feedback! We'll take a look."}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit feedback"}
          </button>
        </form>
      </main>
    </>
  );
}
