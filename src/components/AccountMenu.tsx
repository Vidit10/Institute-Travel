"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const ITEM_CLASS =
  "block w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800";

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 17c0-3.3 3-5 6.5-5s6.5 1.7 6.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Shared content for both the desktop dropdown and the mobile bottom-sheet —
// the one place Settings/My Rides/Sign out live, so neither trigger duplicates
// this logic.
function AccountPanelItems({ onNavigate }: { onNavigate: () => void }) {
  const { data: session } = useSession();

  return (
    <div className="py-1">
      {session?.user?.isAdmin && (
        <Link href="/admin" className={ITEM_CLASS} onClick={onNavigate}>
          Admin dashboard
        </Link>
      )}
      <Link href="/trips/mine" className={ITEM_CLASS} onClick={onNavigate}>
        My Rides
      </Link>
      <Link href="/settings" className={ITEM_CLASS} onClick={onNavigate}>
        Settings
      </Link>
      {session?.user && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={ITEM_CLASS}
        >
          Sign out
        </button>
      )}
    </div>
  );
}

export default function AccountMenu({ variant }: { variant: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (variant !== "desktop") return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [variant]);

  if (variant === "desktop") {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Account"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <UserIcon />
          Account
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <AccountPanelItems onNavigate={close} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        aria-expanded={open}
        className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${
          open ? "text-brand-600 dark:text-brand-500" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        <UserIcon />
        Account
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={close} aria-hidden />
          <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <AccountPanelItems onNavigate={close} />
          </div>
        </>
      )}
    </>
  );
}
