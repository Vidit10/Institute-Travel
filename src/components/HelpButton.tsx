"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { helpTopicForPath } from "@/lib/helpTopics";

// "? Help" — icon + label, not a bare circle, so it doesn't read as an
// unlabeled mystery button. Widens the nav slightly; see NavBar.tsx's own
// comment for how that's offset (ThemeToggle moved into the Account menu).
export default function HelpButton() {
  const pathname = usePathname();
  const topic = helpTopicForPath(pathname);
  const href = topic ? `/help#${topic}` : "/help";

  return (
    <Link
      href={href}
      aria-label="Help"
      className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-1 text-xs font-semibold leading-none text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]" aria-hidden>
        ?
      </span>
      Help
    </Link>
  );
}
