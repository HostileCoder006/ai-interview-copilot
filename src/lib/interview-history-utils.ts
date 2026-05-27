import type { InterviewHistoryEntry } from "./interview-types";

export interface InterviewAggregateStats {
  sessionCount: number;
  avgOverall: number;
  avgCommunication: number;
  avgClarity: number;
  avgConfidence: number;
  avgPacing: number;
  avgTechnical: number;
  avgCorrectness: number;
  avgFillers: number;
  avgWpm: number;
  avgPauses: number;
  bestScore: number;
  streakDays: number;
  scoreTrend: number[];
  recentStrengths: string[];
  recentWeaknesses: string[];
  recentRecommendations: string[];
}

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function uniqueTake(items: string[], limit: number) {
  return [...new Set(items.filter(Boolean))].slice(0, limit);
}

export function computeInterviewStats(sessions: InterviewHistoryEntry[]): InterviewAggregateStats {
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      avgOverall: 0,
      avgCommunication: 0,
      avgClarity: 0,
      avgConfidence: 0,
      avgPacing: 0,
      avgTechnical: 0,
      avgCorrectness: 0,
      avgFillers: 0,
      avgWpm: 0,
      avgPauses: 0,
      bestScore: 0,
      streakDays: 0,
      scoreTrend: [],
      recentStrengths: [],
      recentWeaknesses: [],
      recentRecommendations: [],
    };
  }

  const sorted = [...sessions].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  const scoreTrend = [...sorted]
    .reverse()
    .slice(-8)
    .map((s) => s.overallScore);

  const dayKeys = new Set(
    sorted
      .map((s) => {
        const t = s.timestamp ?? Date.now();
        return new Date(t).toDateString();
      })
      .filter(Boolean),
  );

  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dayKeys.has(d.toDateString())) streakDays++;
    else if (i > 0) break;
  }

  return {
    sessionCount: sessions.length,
    avgOverall: avg(sessions.map((s) => s.overallScore)),
    avgCommunication: avg(sessions.map((s) => s.communicationScore)),
    avgClarity: avg(sessions.map((s) => s.clarityScore ?? s.communicationScore)),
    avgConfidence: avg(sessions.map((s) => s.confidenceScore)),
    avgPacing: avg(sessions.map((s) => s.pacingScore ?? s.communicationScore)),
    avgTechnical: avg(sessions.map((s) => s.technicalScore ?? s.correctnessScore)),
    avgCorrectness: avg(sessions.map((s) => s.correctnessScore)),
    avgFillers: avg(sessions.map((s) => s.fillerWords)),
    avgWpm: avg(sessions.map((s) => s.wpm ?? 0).filter((w) => w > 0)),
    avgPauses: avg(sessions.map((s) => s.pauseCount ?? 0)),
    bestScore: Math.max(...sessions.map((s) => s.overallScore)),
    streakDays,
    scoreTrend,
    recentStrengths: uniqueTake(
      sorted.flatMap((s) => s.strengths ?? []),
      5,
    ),
    recentWeaknesses: uniqueTake(
      sorted.flatMap((s) => s.weaknesses ?? []),
      5,
    ),
    recentRecommendations: uniqueTake(
      sorted.flatMap((s) => s.recommendations ?? []),
      4,
    ),
  };
}

export function formatRelativeSessionDate(timestamp?: number, fallback = "") {
  if (!timestamp) return fallback;
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
