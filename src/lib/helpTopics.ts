// Maps the current route to a section id on /help, so the "?" button always
// jumps to the explanation for whatever page you clicked it from, instead of
// always landing at the top of a long list.
const HELP_TOPICS: { prefix: string; topic: string }[] = [
  { prefix: "/trips", topic: "trips" },
  { prefix: "/recommendations", topic: "recommendations" },
  { prefix: "/events", topic: "events" },
  { prefix: "/settings", topic: "settings" },
  { prefix: "/feedback", topic: "feedback" },
];

export function helpTopicForPath(pathname: string): string | null {
  if (pathname === "/") return "home";
  return HELP_TOPICS.find((t) => pathname.startsWith(t.prefix))?.topic ?? null;
}
