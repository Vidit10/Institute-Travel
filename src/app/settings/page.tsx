"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import { PROGRAMS, PROGRAM_LABELS, YEAR_OPTIONS_BY_PROGRAM, YEAR_LABELS } from "@/lib/constants";

export default function SettingsPage() {
  const { update } = useSession();
  const [form, setForm] = useState({
    name: "",
    gender: "",
    year: "",
    program: "UG",
    phone: "",
    nonEssentialEmailOptIn: true,
    contactShareDefaultConsent: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) {
          setForm({
            name: user.name || "",
            gender: user.gender || "",
            year: user.year || "",
            program: user.program || "UG",
            phone: user.phone || "",
            nonEssentialEmailOptIn: user.nonEssentialEmailOptIn,
            contactShareDefaultConsent: user.contactShareDefaultConsent,
          });
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Couldn't save — check your inputs.");
      return;
    }
    await update(); // refresh session so gender changes reflect immediately (e.g. girls-only eligibility)
    setSaved(true);
  }

  if (!loaded) {
    return (
      <>
        <NavBar />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-lg font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {form.name} · {YEAR_LABELS[form.year] ?? form.year} · {PROGRAM_LABELS[form.program as keyof typeof PROGRAM_LABELS] ?? form.program}
        </p>

        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              disabled
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 cursor-not-allowed text-gray-500 dark:text-gray-400"
              value={form.name}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Gender</label>
            <select
              disabled
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 cursor-not-allowed text-gray-500 dark:text-gray-400"
              value={form.gender}
              onChange={() => {}}
            >
              <option value="" disabled>Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Program <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.program}
              onChange={(e) => {
                const program = e.target.value;
                const validYears = YEAR_OPTIONS_BY_PROGRAM[program as keyof typeof YEAR_OPTIONS_BY_PROGRAM] as readonly string[];
                setForm((f) => ({
                  ...f,
                  program,
                  year: validYears.includes(f.year) ? f.year : "",
                }));
              }}
            >
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>{PROGRAM_LABELS[p]}</option>
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
              <option value="" disabled>Select</option>
              {YEAR_OPTIONS_BY_PROGRAM[form.program as keyof typeof YEAR_OPTIONS_BY_PROGRAM].map((y) => (
                <option key={y} value={y}>{YEAR_LABELS[y]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.nonEssentialEmailOptIn}
              onChange={(e) => setForm({ ...form, nonEssentialEmailOptIn: e.target.checked })}
            />
            Send me occasional non-essential emails
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.contactShareDefaultConsent}
              onChange={(e) => setForm({ ...form, contactShareDefaultConsent: e.target.checked })}
            />
            Share my phone number once a request is accepted
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-brand-600 dark:text-brand-500">Saved.</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700"
          >
            Save
          </button>
        </form>
      </main>
    </>
  );
}
