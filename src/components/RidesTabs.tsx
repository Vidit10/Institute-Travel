"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/trips/mine", label: "Hosting" },
  { href: "/trips/requested", label: "Requested" },
];

export default function RidesTabs() {
  const pathname = usePathname();

  return (
    <div className="mt-3 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${
              active
                ? "bg-white text-brand-700 shadow-sm dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
