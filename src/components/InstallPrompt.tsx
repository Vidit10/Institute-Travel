"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "installPromptDismissed";

// Chrome/Android fire `beforeinstallprompt` and let us trigger the native
// install flow directly. iOS Safari never fires that event at all — there's
// no programmatic install there, only the manual Share > Add to Home Screen
// path, so we show static instructions instead when we detect iOS.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checks pass

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return; // already installed

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setShowIosInstructions(true);
      setDismissed(false);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-[61px] z-20 border-b border-gray-200 bg-white p-3 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        {showIosInstructions ? (
          <p className="text-gray-600 dark:text-gray-300">
            Install CoRide: tap <strong>Share</strong>, then <strong>&quot;Add to Home Screen&quot;</strong>.
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">Install CoRide for one-tap access next time.</p>
        )}
        <div className="flex shrink-0 gap-2">
          {!showIosInstructions && (
            <button
              onClick={install}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
