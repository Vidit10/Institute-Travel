import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  HomeMenuIcon,
  QuickActionsIcon,
  RidesMenuIcon,
  BookmarkMenuIcon,
  CalendarMenuIcon,
  GearIcon,
  MessageIcon,
} from "@/components/icons";

type Topic = {
  id: string;
  title: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  blurb: string;
  href: string;
  linkLabel: string;
};

// Kept short on purpose — one screen's worth of scanning, not a manual. Each
// section explains just enough to know whether to click through. Update this
// alongside any new feature (see docs/CONTRIBUTING.md) — this replaces the
// onboarding intro as the actual source of truth for "what does this app do,"
// since onboarding is only ever shown once and can't stay current on its own.
// Every topic gets an icon (same <icon> <name> pattern as the Account menu,
// category badges, and IconSelect dropdowns elsewhere) — don't add a new
// topic without one.
const TOPICS: Topic[] = [
  {
    id: "home",
    title: "Home & arrivals board",
    icon: HomeMenuIcon,
    blurb:
      "See who's outside right now, heading out, or going home or coming back to campus, and pool a ride together.",
    href: "/",
    linkLabel: "Open Home",
  },
  {
    id: "quick-actions",
    title: "Quick actions",
    icon: QuickActionsIcon,
    blurb:
      "Track the institute bus live, jump to the SAM outing-registration portal, or keep a photo of your ID handy for security checks — all from the home page.",
    href: "/",
    linkLabel: "Open Home",
  },
  {
    id: "trips",
    title: "List or join a trip",
    icon: RidesMenuIcon,
    blurb:
      "Already booked a vehicle? List it so others can request to join and split the fare. Manage your own listings and requests under My Rides.",
    href: "/trips/mine",
    linkLabel: "Open My Rides",
  },
  {
    id: "recommendations",
    title: "Recommendations",
    icon: BookmarkMenuIcon,
    blurb: "Restaurants, cafes, sightseeing spots, and things to do around Dharwad — posted and browsed by students.",
    href: "/recommendations",
    linkLabel: "Open Recommendations",
  },
  {
    id: "events",
    title: "Events",
    icon: CalendarMenuIcon,
    blurb:
      "List anything happening — a cricket match, a hangout, an NPTEL exam study session — and others can RSVP directly, no approval needed.",
    href: "/events",
    linkLabel: "Open Events",
  },
  {
    id: "settings",
    title: "Settings",
    icon: GearIcon,
    blurb: "Update your year, program, phone number, and contact-sharing preferences.",
    href: "/settings",
    linkLabel: "Open Settings",
  },
  {
    id: "feedback",
    title: "Feedback",
    icon: MessageIcon,
    blurb: "Report a bug, suggest something, or flag a trip, user, recommendation, or event that needs a look.",
    href: "/feedback",
    linkLabel: "Open Feedback",
  },
];

export default function HelpPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20 sm:pb-6">
        <h1 className="text-xl font-bold">How CoRide works</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          A quick rundown of every feature. Click the <strong>?</strong> button from anywhere in
          the app to land back here on the section for that page.
        </p>

        <div className="mt-6 space-y-5">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            return (
              <section key={t.id} id={t.id} className="scroll-mt-20 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="flex items-center gap-1.5 font-medium">
                  <Icon className="text-gray-400 dark:text-gray-500" />
                  {t.title}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t.blurb}</p>
                <Link href={t.href} className="mt-2 inline-block text-sm text-brand-600 hover:underline dark:text-brand-500">
                  {t.linkLabel} →
                </Link>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
