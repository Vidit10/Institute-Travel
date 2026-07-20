"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";

const CATEGORIES = [
  { value: "recommendation", label: "Recommendation" },
  { value: "bug", label: "Bug" },
  { value: "other", label: "Something else" },
];

export default function FeedbackPage() {
  const [category, setCategory] = useState("recommendation");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
        body: JSON.stringify({ category, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Couldn't submit — please try again.");
        return;
      }
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
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-lg font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Spotted a bug or have an idea? Let us know.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Category</label>
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
            <label className="block text-sm font-medium">Message</label>
            <textarea
              required
              minLength={1}
              maxLength={2000}
              rows={5}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {submitted && (
            <p className="text-sm text-brand-600 dark:text-brand-500">
              Thanks for the feedback! We&apos;ll take a look.
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
