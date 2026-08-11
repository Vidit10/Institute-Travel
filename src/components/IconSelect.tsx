"use client";

import { useEffect, useRef, useState } from "react";

export type IconSelectOption<T extends string> = {
  value: T;
  label: string;
  icon: (props: { className?: string }) => React.JSX.Element;
};

// Custom dropdown replacing native <select> wherever each option has a
// meaningful icon — same interaction pattern as AccountMenu (trigger button,
// absolute panel, click-outside/Escape to close, generous py-2.5 touch
// targets), not a new standard. Native <select> can't show per-option icons
// in any browser, which is the whole reason this exists; see
// docs/CONTRIBUTING.md for why this was worth building instead of settling.
export default function IconSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  // Loosely typed on purpose (not `T`) — some callers track state as plain
  // `string` (e.g. a not-yet-chosen "" placeholder before any option is
  // picked), which wouldn't be assignable to the narrower option-value union.
  value: string;
  onChange: (next: T) => void;
  options: readonly IconSelectOption<T>[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const CurrentIcon = current?.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <span className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className="text-gray-500 dark:text-gray-400" />}
          {current?.label ?? "Select..."}
        </span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          {options.map((o) => {
            const OptIcon = o.icon;
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm ${
                  selected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <OptIcon className={selected ? "text-brand-600 dark:text-brand-500" : "text-gray-400 dark:text-gray-500"} />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
