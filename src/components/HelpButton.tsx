"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { helpTopicForPath } from "@/lib/helpTopics";

// Small, single entry point to /help — deliberately just an icon (matches
// ThemeToggle's footprint) rather than a second nav system, so it doesn't
// compete for space on either the desktop header or the mobile slim header.
export default function HelpButton() {
  const pathname = usePathname();
  const topic = helpTopicForPath(pathname);
  const href = topic ? `/help#${topic}` : "/help";

  return (
    <Link
      href={href}
      aria-label="Help"
      title="Help"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold leading-none text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      ?
    </Link>
  );
}
