"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROGRAMS, PROGRAM_LABELS, YEAR_OPTIONS_BY_PROGRAM, YEAR_LABELS } from "@/lib/constants";

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    gender: "",
    phone: "",
    year: "",
    program: "UG",
    nonEssentialEmailOptIn: true,
    contactShareDefaultConsent: true,
  });
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setConfirming(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      setError("Something went wrong. Check your inputs and try again.");
      setSubmitting(false);
      setConfirming(false);
      return;
    }

    await update(); // refreshes the JWT so middleware sees onboarded: true
    router.push(searchParams.get("next") || "/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">Tell us a bit about you</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        You can change any of this later in Settings.
      </p>

      {!confirming ? (
        <form onSubmit={handleReview} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="tel"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 90000 00000"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only shown to other riders after you both accept a trip request.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Program <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value, year: "" })}
            >
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>
                  {PROGRAM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Year <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            >
              <option value="" disabled>
                Select
              </option>
              {YEAR_OPTIONS_BY_PROGRAM[form.program as keyof typeof YEAR_OPTIONS_BY_PROGRAM].map((y) => (
                <option key={y} value={y}>
                  {YEAR_LABELS[y]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.nonEssentialEmailOptIn}
              onChange={(e) =>
                setForm({ ...form, nonEssentialEmailOptIn: e.target.checked })
              }
            />
            <span>
              Send me occasional non-essential emails (tips, updates). You&apos;ll
              always get essential emails like request accepted/declined regardless.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.contactShareDefaultConsent}
              onChange={(e) =>
                setForm({ ...form, contactShareDefaultConsent: e.target.checked })
              }
            />
            <span>
              By default, share my phone number once a trip request is accepted
              (you can override this per trip).
            </span>
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700"
          >
            Continue
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h2 className="text-sm font-semibold">Review your details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
                <dd>{GENDER_LABELS[form.gender] ?? form.gender}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                <dd>{form.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Program</dt>
                <dd>{PROGRAM_LABELS[form.program as keyof typeof PROGRAM_LABELS] ?? form.program}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Year</dt>
                <dd>{YEAR_LABELS[form.year] ?? form.year}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Non-essential emails</dt>
                <dd>{form.nonEssentialEmailOptIn ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Share phone by default</dt>
                <dd>{form.contactShareDefaultConsent ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm & continue"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
