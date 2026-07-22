"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import LoadingScreen from "@/components/LoadingScreen";

type Metrics = {
  users: { total: number; onboarded: number; wau: number; mau: number };
  trips: {
    total: number;
    byMode: Array<{ _id: string; count: number }>;
    girlsOnly: number;
    trend: Array<{ date: string; count: number }>;
  };
  requests: { total: number; byStatus: Record<string, number>; acceptRate: number };
  arrivals: { total: number; girlsOnly: number };
  programCounts: Array<{ _id: string; count: number }>;
  moneySaved: number;
  feedback: {
    byCategory: Record<
      string,
      Array<{ _id: string; message: string; contextLabel?: string; createdAt: string; userId?: { name: string; email: string } }>
    >;
    total: number;
  };
  abuse: {
    recent: Array<{ _id: string; userEmail: string; route: string; reason: string; createdAt: string }>;
    total: number;
    last7d: number;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  recommendation: "Recommendation",
  bug: "Bug",
  report: "Report a trip or user",
  profile_correction: "Fix locked profile info",
  other: "Something else",
};
const CATEGORY_ORDER = ["bug", "report", "profile_correction", "recommendation", "other"];

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</h2>
      <div className="mt-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </section>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 shrink-0 truncate text-gray-600 dark:text-gray-300">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-2 rounded-full bg-brand-600 dark:bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-gray-500 dark:text-gray-400">{count}</span>
    </div>
  );
}

function TrendChart({ trend }: { trend: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...trend.map((t) => t.count));
  return (
    <div className="flex h-32 items-end gap-[3px]">
      {trend.map((t) => (
        <div
          key={t.date}
          title={`${t.date}: ${t.count} trip${t.count === 1 ? "" : "s"}`}
          className="flex-1 rounded-t bg-brand-500/70 hover:bg-brand-600 dark:bg-brand-500/50 dark:hover:bg-brand-500"
          style={{ height: `${Math.max(2, (t.count / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/admin/metrics")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => null);
          throw new Error(data?.error || "Failed to load");
        }
        return r.json();
      })
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-bold text-brand-700 dark:text-brand-500">CoRide Admin</span>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {session?.user?.email && <span>{session.user.email}</span>}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && !metrics && <LoadingScreen />}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {metrics && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatTile label="Users signed up" value={String(metrics.users.total)} />
              <StatTile label="Onboarded" value={String(metrics.users.onboarded)} />
              <StatTile
                label="Weekly active"
                value={String(metrics.users.wau)}
                hint="logged in, last 7 days"
              />
              <StatTile
                label="Monthly active"
                value={String(metrics.users.mau)}
                hint="logged in, last 30 days"
              />
              <StatTile label="Trips created" value={String(metrics.trips.total)} />
              <StatTile
                label="Request accept rate"
                value={`${Math.round(metrics.requests.acceptRate * 100)}%`}
                hint={`${metrics.requests.total} requests total`}
              />
              <StatTile
                label="Est. money saved"
                value={`₹${Math.round(metrics.moneySaved).toLocaleString("en-IN")}`}
                hint="modeled vs. solo reference fare"
              />
              <StatTile
                label="Girls-only usage"
                value={`${metrics.trips.girlsOnly} trips`}
                hint={`${metrics.arrivals.girlsOnly} arrival posts`}
              />
            </div>

            <Section title="Trips created — last 30 days">
              <TrendChart trend={metrics.trips.trend} />
            </Section>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Section title="Trips by mode">
                <div className="space-y-2">
                  {metrics.trips.byMode.map((m) => (
                    <BarRow
                      key={m._id}
                      label={m._id}
                      count={m.count}
                      max={Math.max(...metrics.trips.byMode.map((x) => x.count), 1)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Requests by status">
                <div className="space-y-2">
                  {Object.entries(metrics.requests.byStatus).map(([status, count]) => (
                    <BarRow
                      key={status}
                      label={status}
                      count={count}
                      max={Math.max(...Object.values(metrics.requests.byStatus), 1)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Program distribution">
                <div className="space-y-2">
                  {metrics.programCounts.map((p) => (
                    <BarRow
                      key={p._id}
                      label={p._id}
                      count={p.count}
                      max={Math.max(...metrics.programCounts.map((x) => x.count), 1)}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Rate-limit lockouts">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Application-level abuse protection (per-user request throttling) — not
                  network-level DDoS mitigation, which happens at the hosting layer.
                </p>
                <div className="mt-3 flex gap-6 text-sm">
                  <div>
                    <p className="text-xl font-semibold">{metrics.abuse.total}</p>
                    <p className="text-gray-500 dark:text-gray-400">All time</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{metrics.abuse.last7d}</p>
                    <p className="text-gray-500 dark:text-gray-400">Last 7 days</p>
                  </div>
                </div>
                {metrics.abuse.recent.length > 0 && (
                  <div className="mt-3 max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400">
                          <th className="pb-1 pr-2 font-medium">When</th>
                          <th className="pb-1 pr-2 font-medium">User</th>
                          <th className="pb-1 font-medium">Route</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.abuse.recent.map((a) => (
                          <tr key={a._id} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="py-1 pr-2 text-gray-500 dark:text-gray-400">
                              {new Date(a.createdAt).toLocaleString()}
                            </td>
                            <td className="py-1 pr-2 break-all">{a.userEmail}</td>
                            <td className="py-1 text-gray-500 dark:text-gray-400">{a.route}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>

            <Section title={`Feedback (${metrics.feedback.total})`}>
              <div className="space-y-5">
                {CATEGORY_ORDER.filter((c) => metrics.feedback.byCategory[c]?.length).map((cat) => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      {CATEGORY_LABELS[cat] || cat} ({metrics.feedback.byCategory[cat].length})
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {metrics.feedback.byCategory[cat].map((f) => (
                        <li
                          key={f._id}
                          className="rounded-md border border-gray-100 p-2 text-sm dark:border-gray-800"
                        >
                          <p className="break-words">{f.message}</p>
                          {f.contextLabel && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {f.contextLabel}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {f.userId?.name || f.userId?.email || "unknown user"} ·{" "}
                            {new Date(f.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {metrics.feedback.total === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No feedback yet.</p>
                )}
              </div>
            </Section>
          </>
        )}
      </main>
    </>
  );
}
