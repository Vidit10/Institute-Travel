"use client";

import { useState } from "react";

// Small, mostly-true rotating facts shown while data loads — nicer than a bare
// "Loading..." string, and cheap since there's no real content to show yet anyway.
const FACTS = [
  "IIT Dharwad started in 2016, mentored by IIT Bombay in its early years.",
  "Hubli Airport is the nearest airport to campus, about an hour's drive away.",
  "Dharwad is famous for its peda — a sweet worth trying between train connections.",
  "The Western Ghats are a short trip from Dharwad, if you ever get a free weekend.",
  "Sharing a cab with 3 others can cut your fare to a quarter of the solo price.",
  "Hubli and Dharwad are twin cities, often referred to together as Hubballi-Dharwad.",
];

export default function LoadingScreen() {
  const [factIndex] = useState(() => Math.floor(Math.random() * FACTS.length));

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-500"
        aria-hidden
      />
      <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">{FACTS[factIndex]}</p>
    </div>
  );
}
