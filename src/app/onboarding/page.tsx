"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { update } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    gender: "",
    phone: "",
    year: "",
    program: "UG",
    nonEssentialEmailOptIn: true,
    contactShareDefaultConsent: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      return;
    }

    await update(); // refreshes the JWT so middleware sees onboarded: true
    router.push("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">Tell us a bit about you</h1>
      <p className="mt-1 text-sm text-gray-500">
        You can change any of this later in Settings.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium">Gender</label>
          <select
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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
          <label className="block text-sm font-medium">Phone number</label>
          <input
            required
            type="tel"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 90000 00000"
          />
          <p className="mt-1 text-xs text-gray-400">
            Only shown to other riders after you both accept a trip request.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Program</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={form.program}
            onChange={(e) => setForm({ ...form, program: e.target.value })}
          >
            <option value="UG">Undergraduate</option>
            <option value="PG">Postgraduate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Year</label>
          <select
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          >
            <option value="" disabled>
              Select
            </option>
            {["UG-1", "UG-2", "UG-3", "UG-4", "PG-1", "PG-2"].map((y) => (
              <option key={y} value={y}>
                {y}
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </main>
  );
}
