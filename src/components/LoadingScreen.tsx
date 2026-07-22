"use client";

import { useState } from "react";

// Small, genuinely surprising math/physics/science facts shown while data loads —
// nicer than a bare "Loading..." string, and cheap since there's no real content
// to show yet anyway.
const FACTS = [
  "A neutron star teaspoon would weigh about a billion tons on Earth.",
  "Bananas are slightly radioactive from their potassium-40 — eating 375 of them in one sitting gives roughly the same dose as a chest X-ray.",
  "There are more possible chess games than atoms in the observable universe.",
  "Time runs faster on the top floor of a building than the ground floor, measurably, because of gravitational time dilation.",
  "\"God does not play dice with the universe.\" — Albert Einstein, objecting to quantum randomness (he turned out to be wrong).",
  "Glass is not a slow-flowing liquid — old windows are thicker at the bottom because of how they were made, not because they flowed.",
  "The Sun accounts for over 99.8% of the mass in the entire solar system.",
  "A day on Venus is longer than its year — it takes 243 Earth days to rotate once but only 225 to orbit the Sun.",
  "If two people shake hands, at that instant every atom in the universe is technically pulling on every other atom via gravity, however faintly.",
  "Hot water can freeze faster than cold water under the right conditions — a real, still not fully explained effect called the Mpemba effect.",
  "\"The most incomprehensible thing about the universe is that it is comprehensible.\" — Albert Einstein.",
  "There are exactly as many even numbers as there are whole numbers, in the sense of infinite set sizes — both are countably infinite.",
  "A single teaspoon of the sun's core would kill a person standing a hundred miles away, due to the energy released.",
  "Almost all the atoms in your body were forged inside dying stars billions of years ago.",
  "The Antikythera mechanism, a 2,000-year-old Greek device, could predict eclipses decades in advance using only gears.",
  "Quantum entanglement means measuring one particle can instantly correlate with a partner particle light-years away — yet no information actually travels faster than light.",
  "\"Mathematics is the language in which God has written the universe.\" — Galileo Galilei.",
  "You cannot comb a hairy ball flat without a cowlick — a real theorem (the Hairy Ball Theorem) that also explains why there's always a point of zero wind somewhere on Earth.",
  "The observable universe has no center and no edge you could stand at — every point looks roughly like the middle.",
  "Adding a single grain of sand to a pile can trigger an avalanche of any size — this unpredictability is called self-organized criticality.",
  "Prime numbers become rarer as numbers grow, yet there are still infinitely many of them — a fact Euclid proved over 2,000 years ago.",
  "A photon leaving the Sun's core takes tens of thousands of years to random-walk its way out, but only about 8 minutes to reach Earth once it escapes.",
  "\"If you think you understand quantum mechanics, you don't understand quantum mechanics.\" — Richard Feynman.",
  "The Banach–Tarski paradox shows that, in pure mathematics, a solid ball can be split into pieces and reassembled into two identical copies of the original ball.",
  "Water expands when it freezes — almost uniquely among common substances — which is why ice floats and lakes freeze from the top down instead of the bottom up.",
  "The fastest possible speed for information or matter, the speed of light, is the same for every observer no matter how fast they themselves are moving.",
  "A single bolt of lightning is roughly five times hotter than the surface of the Sun.",
  "Most of the mass of a proton doesn't come from the mass of its quarks — it comes from the energy of the force binding them together.",
  "\"Not only is the universe stranger than we think, it is stranger than we can think.\" — Werner Heisenberg.",
  "There is a number so large, Graham's number, that the observable universe doesn't have enough space to write out even its number of digits in ordinary notation.",
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
