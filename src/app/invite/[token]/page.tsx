"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<"claiming" | "error" | "success">("claiming");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invite/${token}`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Couldn't claim this invite.");
          setState("error");
          return;
        }
        setState("success");
        setTimeout(() => router.push(`/trips/${data.tripId}`), 1200);
      })
      .catch(() => {
        setError("Something went wrong. Try again in a moment.");
        setState("error");
      });
  }, [token, router]);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-md px-4 py-10 pb-20 text-center sm:pb-10">
        {state === "claiming" && <p className="text-gray-500 dark:text-gray-400">Confirming your seat...</p>}
        {state === "success" && (
          <p className="text-brand-600 dark:text-brand-500">You&apos;re in! Taking you to the trip...</p>
        )}
        {state === "error" && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </main>
    </>
  );
}
