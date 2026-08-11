"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Shared by NavBar's mobile header (icon-button variant, ThemeToggle) and
// AccountMenu's desktop dropdown (menu-row variant, ThemeMenuItem) — one
// underlying next-themes + hydration-guard, two presentations. Desktop's top
// nav no longer shows a standalone theme icon (see NavBar.tsx) — light/dark
// is a one-time-ish preference, not glanceable state like notifications, so
// it moved into the Account menu to free up header space.
function useMountedTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { mounted, theme, setTheme };
}

function SunIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path d="M17 11.3A7 7 0 018.7 3 7 7 0 1017 11.3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ThemeToggle() {
  const { mounted, theme, setTheme } = useMountedTheme();
  // next-themes standard pattern: theme is unknown until mounted, so render a
  // fixed-size placeholder first to avoid a hydration mismatch.
  if (!mounted) return <span className="inline-block h-6 w-6" aria-hidden />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-6 w-6 items-center justify-center leading-none"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function ThemeMenuItem({ className, onClick }: { className: string; onClick?: () => void }) {
  const { mounted, theme, setTheme } = useMountedTheme();
  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(theme === "dark" ? "light" : "dark");
        onClick?.();
      }}
      className={className}
    >
      {theme === "dark" ? (
        <SunIcon size={16} className="text-gray-400 dark:text-gray-500" />
      ) : (
        <MoonIcon size={16} className="text-gray-400 dark:text-gray-500" />
      )}
      {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
}
