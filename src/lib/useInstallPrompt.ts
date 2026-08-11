"use client";

import { useEffect, useState } from "react";

// Chrome/Android fire `beforeinstallprompt` and let us trigger the native
// install flow directly. iOS Safari never fires that event at all — there's
// no programmatic install there, only the manual Share > Add to Home Screen
// path.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Module-level singleton capture, not per-component state: `beforeinstallprompt`
// fires once, early in the page's life, so capturing it in one shared place
// (rather than whichever component happens to mount first) lets both the
// dismissible banner (InstallPrompt.tsx) and the persistent Account-menu row
// react to the same captured event instead of each needing their own listener
// racing to attach before the event fires.
let capturedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

function checkStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function checkIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function useInstallPrompt() {
  const [, forceRerender] = useState(0);
  // Default true/false (i.e. "nothing to show yet") until mounted, so SSR/first
  // paint never flashes an install prompt before we actually know the platform.
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setStandalone(checkStandalone());
    setIos(checkIos());
    const listener = () => forceRerender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!capturedEvent) return false;
    await capturedEvent.prompt();
    const choice = await capturedEvent.userChoice;
    capturedEvent = null;
    forceRerender((n) => n + 1);
    return choice.outcome === "accepted";
  }

  return {
    // iOS never fires beforeinstallprompt, so "can install" there just means
    // "not already installed" — the actual install is the manual Share flow.
    canInstall: !standalone && (!!capturedEvent || ios),
    isIos: ios,
    isStandalone: standalone,
    promptInstall,
  };
}
