import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Trip } from "@/models/Trip";
import { JoinRequest } from "@/models/JoinRequest";
import { ArrivalIntent } from "@/models/ArrivalIntent";
import { Feedback } from "@/models/Feedback";
import { AbuseLog } from "@/models/AbuseLog";
import { estimateTotalMoneySaved, type TripForSavings } from "@/lib/adminMetrics";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 30;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  // Re-checked here independent of the middleware redirect — same
  // "server enforces, client/edge-redirect alone is not enough" pattern the
  // rest of the app already follows for consent-gated data.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await dbConnect();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - TREND_DAYS * DAY_MS);

  const [
    totalUsers,
    onboardedUsers,
    wau,
    mau,
    tripsTotal,
    tripsByMode,
    tripsGirlsOnly,
    requestsByStatus,
    arrivalsTotal,
    arrivalsGirlsOnly,
    programCounts,
    feedbackDocs,
    abuseRecent,
    abuseTotal,
    abuseLast7d,
    tripsForSavings,
    tripTrendRaw,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ onboarded: true }),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo } }),
    Trip.countDocuments(),
    Trip.aggregate([{ $group: { _id: "$mode", count: { $sum: 1 } } }]),
    Trip.countDocuments({ girlsOnly: true }),
    JoinRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ArrivalIntent.countDocuments(),
    ArrivalIntent.countDocuments({ girlsOnly: true }),
    User.aggregate([
      { $match: { onboarded: true } },
      { $group: { _id: "$program", count: { $sum: 1 } } },
    ]),
    Feedback.find().sort({ createdAt: -1 }).limit(200).populate("userId", "name email").lean(),
    AbuseLog.find().sort({ createdAt: -1 }).limit(50).lean(),
    AbuseLog.countDocuments(),
    AbuseLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Trip.find(
      {},
      { pickupLocation: 1, expectedFare: 1, totalCapacity: 1, seatsRemaining: 1, status: 1 }
    ).lean(),
    Trip.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const requestCounts: Record<string, number> = {};
  for (const r of requestsByStatus as Array<{ _id: string; count: number }>) {
    requestCounts[r._id] = r.count;
  }
  const requestsTotal = Object.values(requestCounts).reduce((a, b) => a + b, 0);
  const acceptRate = requestsTotal > 0 ? (requestCounts.accepted || 0) / requestsTotal : 0;

  // Fill every day in the window, including days with zero trips, so the
  // chart doesn't silently compress a quiet stretch.
  const trendByDay = new Map<string, number>();
  for (const t of tripTrendRaw as Array<{ _id: string; count: number }>) {
    trendByDay.set(t._id, t.count);
  }
  const tripTrend: Array<{ date: string; count: number }> = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = dayKey(new Date(now.getTime() - i * DAY_MS));
    tripTrend.push({ date: d, count: trendByDay.get(d) || 0 });
  }

  const feedbackByCategory: Record<string, typeof feedbackDocs> = {};
  for (const f of feedbackDocs) {
    const cat = (f as unknown as { category: string }).category;
    (feedbackByCategory[cat] ||= []).push(f);
  }

  const moneySaved = estimateTotalMoneySaved(tripsForSavings as unknown as TripForSavings[]);

  return NextResponse.json({
    users: {
      total: totalUsers,
      onboarded: onboardedUsers,
      wau,
      mau,
    },
    trips: {
      total: tripsTotal,
      byMode: tripsByMode,
      girlsOnly: tripsGirlsOnly,
      trend: tripTrend,
    },
    requests: {
      total: requestsTotal,
      byStatus: requestCounts,
      acceptRate,
    },
    arrivals: {
      total: arrivalsTotal,
      girlsOnly: arrivalsGirlsOnly,
    },
    programCounts,
    moneySaved,
    feedback: {
      byCategory: feedbackByCategory,
      total: feedbackDocs.length,
    },
    abuse: {
      recent: abuseRecent,
      total: abuseTotal,
      last7d: abuseLast7d,
    },
  });
}
