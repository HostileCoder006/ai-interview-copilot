import type { EvaluationResult, InterviewHistoryEntry } from "./interview-types";
import {
  formatSessionDate,
  formatSessionDuration,
  saveInterviewSession,
} from "./interview-storage";
import type { SpeechMetrics } from "./speech-metrics";
import { averageMetrics } from "./speech-metrics";

export function buildHistoryFromEvaluations(options: {
  company: string;
  difficulty: InterviewHistoryEntry["difficulty"];
  category: InterviewHistoryEntry["category"];
  mode: InterviewHistoryEntry["mode"];
  elapsedSeconds: number;
  evaluations: EvaluationResult[];
  metricsSamples?: SpeechMetrics[];
  transcript: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}): InterviewHistoryEntry {
  const completedAt = Date.now();
  const evaluations = options.evaluations;
  const avg = (scores: number[]) =>
    scores.length ? Math.round(scores.reduce((t, s) => t + s, 0) / scores.length) : 0;

  const speech = options.metricsSamples?.length ? averageMetrics(options.metricsSamples) : null;

  return {
    id: `${options.mode}-${completedAt}`,
    date: formatSessionDate(completedAt),
    timestamp: completedAt,
    company: options.company,
    difficulty: options.difficulty,
    category: options.category,
    mode: options.mode,
    duration: formatSessionDuration(options.elapsedSeconds),
    overallScore: avg(evaluations.map((e) => e.overallScore)),
    communicationScore: avg(evaluations.map((e) => e.communicationScore)),
    confidenceScore: avg(evaluations.map((e) => e.confidenceScore)),
    correctnessScore: avg(evaluations.map((e) => e.correctnessScore)),
    optimizationScore: avg(evaluations.map((e) => e.optimizationScore)),
    fillerWords: speech?.fillerCount ?? 0,
    clarityScore: speech?.clarityScore ?? avg(evaluations.map((e) => e.communicationScore)),
    pacingScore: speech?.pacingScore ?? avg(evaluations.map((e) => e.communicationScore)),
    technicalScore: speech?.technicalScore ?? avg(evaluations.map((e) => e.correctnessScore)),
    wpm: speech?.wpm,
    pauseCount: speech?.pauseCount,
    topFillers: speech?.fillerWords,
    missingPoints: [...new Set(evaluations.flatMap((e) => e.missingPoints))],
    strengths:
      options.strengths ?? [...new Set(evaluations.flatMap((e) => e.strengths))].slice(0, 6),
    weaknesses:
      options.weaknesses ?? [...new Set(evaluations.flatMap((e) => e.weaknesses))].slice(0, 6),
    recommendations: options.recommendations,
    transcript: options.transcript,
  };
}

export function persistInterviewSession(entry: InterviewHistoryEntry) {
  saveInterviewSession(entry);
}
