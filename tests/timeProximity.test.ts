import { describe, it, expect } from "vitest";
import { splitByProximity } from "@/lib/timeProximity";

describe("splitByProximity", () => {
  const reference = new Date("2026-08-01T10:00:00");

  it("puts items within the exact window (30 min) in `exact`, sorted closest-first", () => {
    const items = [
      { label: "20 min after", time: new Date("2026-08-01T10:20:00") },
      { label: "5 min before", time: new Date("2026-08-01T09:55:00") },
      { label: "same time", time: new Date("2026-08-01T10:00:00") },
    ];
    const { exact } = splitByProximity(items, reference);
    expect(exact.map((i) => i.label)).toEqual(["same time", "5 min before", "20 min after"]);
  });

  it("puts items beyond the exact window but within the nearby window (3h) in `nearby`", () => {
    const items = [
      { label: "1.5h after", time: new Date("2026-08-01T11:30:00") },
      { label: "2h before", time: new Date("2026-08-01T08:00:00") },
    ];
    const { exact, nearby } = splitByProximity(items, reference);
    expect(exact).toHaveLength(0);
    expect(nearby.map((i) => i.label)).toEqual(["1.5h after", "2h before"]);
  });

  it("excludes items beyond the nearby window entirely", () => {
    const items = [{ label: "5h after", time: new Date("2026-08-01T15:00:00") }];
    const { exact, nearby } = splitByProximity(items, reference);
    expect(exact).toHaveLength(0);
    expect(nearby).toHaveLength(0);
  });
});
