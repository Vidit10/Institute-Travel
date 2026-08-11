"use client";

import { useEffect, useRef, useState } from "react";
import { saveIdCard, loadIdCard, deleteIdCard } from "@/lib/idCardStore";

// Stored entirely in this device's IndexedDB — never uploaded anywhere.
// "Show my ID" opens it full-screen on a pure white background, which is the
// closest a web page can get to boosting brightness: there's no browser API
// to actually change screen brightness, but a bright white background often
// nudges auto-brightness up and is at least as legible as we can make it.
export default function IDCardViewer({ trigger }: { trigger?: "card" | "row" }) {
  const [url, setUrl] = useState<string | null>(null);
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let currentUrl: string | null = null;
    loadIdCard().then((blob) => {
      if (blob) {
        currentUrl = URL.createObjectURL(blob);
        setUrl(currentUrl);
        setHasCard(true);
      } else {
        setHasCard(false);
      }
    });
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    await saveIdCard(file);
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(file));
    setHasCard(true);
    setBusy(false);
  }

  async function handleRemove() {
    setBusy(true);
    await deleteIdCard();
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setHasCard(false);
    setBusy(false);
  }

  async function openViewer() {
    setViewing(true);
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Wake Lock unsupported or denied — not critical, ignore.
    }
  }

  function closeViewer() {
    setViewing(false);
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  const buttonClass =
    trigger === "row"
      ? "flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      : "flex w-full flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-700";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {hasCard === false && (
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className={buttonClass}>
          {trigger === "row" ? (
            <>
              <span>My ID card</span>
              <span className="text-brand-600 dark:text-brand-500">Add</span>
            </>
          ) : (
            <>
              <IdIcon />
              My ID
            </>
          )}
        </button>
      )}

      {hasCard && (
        <button type="button" onClick={openViewer} className={buttonClass}>
          {trigger === "row" ? (
            <>
              <span>My ID card</span>
              <span className="text-brand-600 dark:text-brand-500">Show</span>
            </>
          ) : (
            <>
              <IdIcon />
              My ID
            </>
          )}
        </button>
      )}

      {trigger === "row" && hasCard && (
        <div className="mt-2 flex gap-3 text-xs">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-brand-600 hover:underline dark:text-brand-500">
            Replace
          </button>
          <button type="button" onClick={handleRemove} disabled={busy} className="text-red-600 hover:underline dark:text-red-400">
            Remove
          </button>
        </div>
      )}

      {viewing && url && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <button
            type="button"
            onClick={closeViewer}
            className="absolute right-4 top-4 rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your ID card" className="max-h-[80vh] max-w-[90vw] object-contain" />
          <p className="mt-4 max-w-xs px-4 text-center text-xs text-gray-500">
            Tip: this can&apos;t force your brightness up — there&apos;s no way for a website to do
            that — but a bright white screen usually helps the scanner and your phone&apos;s
            auto-brightness.
          </p>
        </div>
      )}
    </>
  );
}

function IdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 13c.5-1.5 1.8-2 2.5-2s2 .5 2.5 2M11.5 8h4M11.5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
