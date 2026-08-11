"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import LoadingScreen from "@/components/LoadingScreen";
import IDCardViewer from "@/components/IDCardViewer";
import InfoTip from "@/components/InfoTip";
import IconSelect from "@/components/IconSelect";
import { UndergradIcon, PostgradIcon, PhdIcon, yearIconFor, IdCardIcon } from "@/components/icons";
import { PROGRAMS, PROGRAM_LABELS, YEAR_OPTIONS_BY_PROGRAM, YEAR_LABELS } from "@/lib/constants";

const PROGRAM_ICON: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  UG: UndergradIcon,
  PG: PostgradIcon,
  PhD: PhdIcon,
};

export default function SettingsPage() {
  const { update } = useSession();
  const [form, setForm] = useState({
    name: "",
    gender: "",
    year: "",
    program: "UG",
    phone: "",
    contactShareDefaultConsent: true,
    arrivalsGirlsOnlyDefault: false,
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
            contactShareDefaultConsent: user.contactShareDefaultConsent,
            arrivalsGirlsOnlyDefault: user.arrivalsGirlsOnlyDefault || false,
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
      <main className="mx-auto max-w-md px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-xl font-bold">Your profile</h1>
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
            </select>
          </div>

          <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
            Name and gender are locked after onboarding. Filled in wrong?{" "}
            <Link
              href={`/feedback?category=profile_correction&context=${encodeURIComponent(
                `Profile correction — name: "${form.name}", gender: "${form.gender}"`
              )}`}
              className="text-brand-600 underline dark:text-brand-500"
            >
              Send feedback
            </Link>{" "}
            with the correct details, then sign out and back in — allow 24–48 hours for it to
            take effect.
          </p>

          <div>
            <label className="block text-sm font-medium">
              Program <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <IconSelect
                ariaLabel="Program"
                value={form.program}
                onChange={(program) => {
                  const validYears = YEAR_OPTIONS_BY_PROGRAM[program as keyof typeof YEAR_OPTIONS_BY_PROGRAM] as readonly string[];
                  setForm((f) => ({
                    ...f,
                    program,
                    year: validYears.includes(f.year) ? f.year : "",
                  }));
                }}
                options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABELS[p], icon: PROGRAM_ICON[p] }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">
              Year <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <IconSelect
                ariaLabel="Year"
                value={form.year}
                onChange={(year) => setForm({ ...form, year })}
                options={YEAR_OPTIONS_BY_PROGRAM[form.program as keyof typeof YEAR_OPTIONS_BY_PROGRAM].map((y) => ({
                  value: y,
                  label: YEAR_LABELS[y],
                  icon: yearIconFor(y),
                }))}
              />
            </div>
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

          <div className="flex items-start gap-1">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.contactShareDefaultConsent}
                onChange={(e) => setForm({ ...form, contactShareDefaultConsent: e.target.checked })}
              />
              Share my phone number once a request is accepted
            </label>
            <InfoTip text="Only the specific host or rider on an accepted request ever sees your number — never anyone browsing the feed. This is just the default; you can still turn it off per trip." />
          </div>

          {form.gender === "female" && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.arrivalsGirlsOnlyDefault}
                onChange={(e) => setForm({ ...form, arrivalsGirlsOnlyDefault: e.target.checked })}
              />
              <span>
                Default my arrivals-board posts to girls-only (you can still change it for
                any individual post)
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-brand-600 dark:text-brand-500">Saved.</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700"
          >
            Save
          </button>
        </form>

        <div className="mt-8">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <IdCardIcon className="text-gray-400 dark:text-gray-500" />
            ID card
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Stored only on this device — never uploaded anywhere. Kept handy for security checks
            when leaving campus.
          </p>
          <div className="mt-2">
            <IDCardViewer trigger="row" />
          </div>
        </div>
      </main>
    </>
  );
}
