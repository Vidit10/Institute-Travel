"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import NavBar from "@/components/NavBar";

const YEARS = ["UG-1", "UG-2", "UG-3", "UG-4", "PG-1", "PG-2"];

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
        <main className="mx-auto max-w-md px-4 py-6 text-gray-400">Loading...</main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-lg font-semibold">Your profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          {form.name} · {form.year} · {form.program}
        </p>

        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Gender</label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="" disabled>Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
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
              <option value="" disabled>Select</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Phone number</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-brand-600">Saved.</p>}

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
