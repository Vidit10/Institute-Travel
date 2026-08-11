"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

const SNOOZED_UNTIL_KEY = "installPromptSnoozedUntil";
const SNOOZE_DAYS = 14;

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZED_UNTIL_KEY);
  return !!until && Date.now() < Number(until);
}

export default function InstallPrompt() {
  const { canInstall, isIos, promptInstall } = useInstallPrompt();
  const [snoozed, setSnoozed] = useState(true); // default hidden until mounted

  useEffect(() => {
    setSnoozed(isSnoozed());
  }, []);

  function dismiss() {
    // A snooze, not a permanent dismissal — one declined banner shouldn't be
    // gone forever; this just gives the next 2 weeks a rest before asking
    // again. Still always reachable via the Account menu's "Install app" row
    // regardless of snooze state, for anyone who wants it sooner.
    localStorage.setItem(SNOOZED_UNTIL_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    setSnoozed(true);
  }

  async function install() {
    await promptInstall();
    dismiss();
  }

  if (snoozed || !canInstall) return null;

  return (
    <div className="fixed inset-x-0 top-[61px] z-20 border-b border-gray-200 bg-white p-3 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        {isIos ? (
          <p className="text-gray-600 dark:text-gray-300">
            Install CoRide: tap <strong>Share</strong>, then <strong>&quot;Add to Home Screen&quot;</strong>.
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300">Install CoRide for one-tap access next time.</p>
        )}
        <div className="flex shrink-0 gap-2">
          {!isIos && (
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
