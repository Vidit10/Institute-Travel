import { describe, it, expect } from "vitest";
import "./setup";
import { checkRateLimit } from "@/lib/rateLimit";
import { AbuseLog } from "@/models/AbuseLog";
import mongoose from "mongoose";

describe("checkRateLimit", () => {
  it("allows requests under the limit", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(userId, "user@iitdh.ac.in", "test:route");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks a user who exceeds the window limit and logs it", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    let lastResult;
    for (let i = 0; i < 25; i++) {
      lastResult = await checkRateLimit(userId, "spammer@iitdh.ac.in", "test:route");
    }

    expect(lastResult!.allowed).toBe(false);

    const logs = await AbuseLog.find({ userId });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].route).toBe("test:route");
  });

  it("keeps rejecting while blocked, even on a fresh call", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    for (let i = 0; i < 25; i++) {
      await checkRateLimit(userId, "spammer2@iitdh.ac.in", "test:route");
    }

    const result = await checkRateLimit(userId, "spammer2@iitdh.ac.in", "test:route");
    expect(result.allowed).toBe(false);
  });
});
