"use client";

import { useEffect, useRef, useState } from "react";

// Small "i" glyph with a popover explaining whatever it's next to. Desktop:
// hover reveals it via CSS group-hover (works automatically for mouse users,
// inert on touch — touch devices never fire a real hover). Mobile/keyboard:
// tapping/focusing toggles `open`, which forces the popover visible and
// closes on tap-outside or Escape. One component, both interaction modes.
//
// The visible glyph is small (14px) but the button's hit area is much larger
// (px-2 py-2, ~32px) — solves the "small icon = imprecise tap target"
// problem via padding, not by making the glyph itself bigger and more
// visually loud than it needs to be.
export default function InfoTip({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  return (
    <span ref={ref} className="group relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <span
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] font-semibold leading-none"
          aria-hidden
        >
          i
        </span>
      </button>
      <span
        role="tooltip"
        className={`absolute top-full z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white p-2.5 text-xs leading-snug text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ${
          align === "right" ? "right-0" : "left-0"
        } ${open ? "opacity-100" : "pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}
      >
        {text}
      </span>
    </span>
  );
}
