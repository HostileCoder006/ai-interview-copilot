// ─── Shared speech / answer metrics (voice + text) ───────────────────────────

export const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "actually",
  "so",
  "right",
  "okay",
  "kind of",
  "sort of",
];

export interface SpeechMetrics {
  fillerCount: number;
  fillerWords: string[];
  pauseCount: number;
  wpm: number;
  clarityScore: number;
  confidenceScore: number;
  pacingScore: number;
  technicalScore: number;
}

export function analyzeSpeech(transcript: string, durationSeconds: number): SpeechMetrics {
  const lower = transcript.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const fillerMap = new Map<string, number>();
  let fillerCount = 0;

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = transcript.match(regex) || [];
    if (matches.length > 0) {
      fillerCount += matches.length;
      fillerMap.set(filler, (fillerMap.get(filler) ?? 0) + matches.length);
    }
  }

  const topFillers = [...fillerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `"${word}" ×${count}`);

  const minutes = Math.max(durationSeconds / 60, 0.1);
  const wpm = Math.round(wordCount / minutes);

  const ellipsisPauses = (transcript.match(/\.\.\.|…/g) || []).length;
  const sentenceBreaks = (transcript.match(/[.!?]\s+(?=[A-Z])/g) || []).length;
  const longHesitation = (transcript.match(/\b(uh|um|er)\b/gi) || []).length;
  const pauseCount =
    ellipsisPauses + Math.max(0, sentenceBreaks - 2) + Math.floor(longHesitation / 2);

  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const clarityScore = Math.min(
    100,
    Math.max(25, Math.round(100 - fillerRatio * 280 - pauseCount * 4)),
  );

  let pacingScore: number;
  if (wpm >= 125 && wpm <= 175) pacingScore = 92;
  else if (wpm >= 105 && wpm <= 195) pacingScore = 78;
  else if (wpm < 90) pacingScore = 52;
  else if (wpm > 210) pacingScore = 58;
  else pacingScore = 68;

  const confidenceScore = Math.min(
    100,
    Math.max(30, Math.round(clarityScore * 0.55 + pacingScore * 0.35 - pauseCount * 2.5)),
  );

  const technicalTerms = [
    "complexity",
    "o(",
    "hash",
    "array",
    "tree",
    "graph",
    "algorithm",
    "optimize",
    "trade-off",
    "edge case",
    "distributed",
    "cache",
    "latency",
    "throughput",
  ];
  const termHits = technicalTerms.filter((term) => lower.includes(term)).length;
  const technicalScore = Math.min(
    95,
    Math.max(35, 40 + Math.min(30, Math.floor(wordCount / 4)) + termHits * 6),
  );

  return {
    fillerCount,
    fillerWords: topFillers,
    pauseCount,
    wpm,
    clarityScore,
    confidenceScore,
    pacingScore,
    technicalScore,
  };
}

export function metricsFromEvaluation(
  answer: string,
  elapsedSeconds: number,
  evaluation: {
    communicationScore: number;
    confidenceScore: number;
    correctnessScore: number;
    optimizationScore?: number;
  },
): SpeechMetrics {
  const speech = analyzeSpeech(answer, elapsedSeconds);
  const wpm = Math.round(
    answer.split(/\s+/).filter(Boolean).length / Math.max(elapsedSeconds / 60, 0.1),
  );

  let pacingScore = speech.pacingScore;
  if (wpm >= 125 && wpm <= 175) pacingScore = Math.max(pacingScore, 88);
  else if (wpm < 95) pacingScore = Math.min(pacingScore, 62);

  return {
    ...speech,
    wpm,
    clarityScore: evaluation.communicationScore,
    confidenceScore: evaluation.confidenceScore,
    pacingScore: Math.round((pacingScore + Math.min(100, evaluation.communicationScore + 4)) / 2),
    technicalScore: Math.round(
      (evaluation.correctnessScore +
        (evaluation.optimizationScore ?? evaluation.correctnessScore)) /
        2,
    ),
  };
}

export function averageMetrics(samples: SpeechMetrics[]): SpeechMetrics {
  if (samples.length === 0) {
    return {
      fillerCount: 0,
      fillerWords: [],
      pauseCount: 0,
      wpm: 0,
      clarityScore: 0,
      confidenceScore: 0,
      pacingScore: 0,
      technicalScore: 0,
    };
  }

  const n = samples.length;
  const totals = samples.reduce(
    (acc, m) => ({
      fillerCount: acc.fillerCount + m.fillerCount,
      pauseCount: acc.pauseCount + m.pauseCount,
      wpm: acc.wpm + m.wpm,
      clarityScore: acc.clarityScore + m.clarityScore,
      confidenceScore: acc.confidenceScore + m.confidenceScore,
      pacingScore: acc.pacingScore + m.pacingScore,
      technicalScore: acc.technicalScore + m.technicalScore,
    }),
    {
      fillerCount: 0,
      pauseCount: 0,
      wpm: 0,
      clarityScore: 0,
      confidenceScore: 0,
      pacingScore: 0,
      technicalScore: 0,
    },
  );

  return {
    fillerCount: Math.round(totals.fillerCount / n),
    fillerWords: [...new Set(samples.flatMap((m) => m.fillerWords))].slice(0, 8),
    pauseCount: Math.round(totals.pauseCount / n),
    wpm: Math.round(totals.wpm / n),
    clarityScore: Math.round(totals.clarityScore / n),
    confidenceScore: Math.round(totals.confidenceScore / n),
    pacingScore: Math.round(totals.pacingScore / n),
    technicalScore: Math.round(totals.technicalScore / n),
  };
}
