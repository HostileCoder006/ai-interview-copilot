import type { EvaluationResult, InterviewQuestion } from "./interview-types";

// ─── Mock AI Evaluator ────────────────────────────────────────────────────────
// Simulates the evaluation logic that will be replaced by an OpenAI/Gemini call.
//
// TODO: Replace evaluateAnswer() with:
//   const res = await openai.chat.completions.create({
//     model: "gpt-4o",
//     messages: [
//       { role: "system", content: SYSTEM_PROMPT },
//       { role: "user", content: `Question: ${question.text}\nAnswer: ${answer}` },
//     ],
//     response_format: { type: "json_object" },
//   });
//   return JSON.parse(res.choices[0].message.content) as EvaluationResult;

const FILLER_WORDS = [
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

function countFillers(text: string): number {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((count, filler) => {
    const matches = lower.match(new RegExp(`\\b${filler}\\b`, "g"));
    return count + (matches?.length ?? 0);
  }, 0);
}

function wordsPerMinute(text: string, durationSeconds: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / Math.max(durationSeconds / 60, 0.1));
}

/** Heuristic scoring — deterministic enough to feel real, varied enough to be useful */
export function evaluateAnswer(
  answer: string,
  question: InterviewQuestion,
  durationSeconds: number,
): EvaluationResult {
  const lower = answer.toLowerCase();
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const fillerCount = countFillers(answer);
  const wpm = wordsPerMinute(answer, durationSeconds);

  // ── Correctness ─────────────────────────────────────────────────────────────
  // Check how many of the question's tags appear in the answer
  const tagHits = question.tags.filter(
    (tag) => lower.includes(tag.replace(/-/g, " ")) || lower.includes(tag.replace(/-/g, "")),
  ).length;
  const tagCoverage = tagHits / Math.max(question.tags.length, 1);

  const mentionsComplexity =
    lower.includes("o(") || lower.includes("time complexity") || lower.includes("space complexity");
  const mentionsEdgeCases =
    lower.includes("edge") ||
    lower.includes("null") ||
    lower.includes("empty") ||
    lower.includes("corner");
  const mentionsOptimization =
    lower.includes("optimal") ||
    lower.includes("optimize") ||
    lower.includes("efficient") ||
    lower.includes("better");

  let correctness = Math.round(
    40 +
      tagCoverage * 25 +
      (mentionsComplexity ? 12 : 0) +
      (mentionsEdgeCases ? 8 : 0) +
      (wordCount > 60 ? 10 : wordCount > 30 ? 5 : 0) +
      Math.random() * 8,
  );
  correctness = Math.min(98, Math.max(30, correctness));

  // ── Communication ────────────────────────────────────────────────────────────
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  let communication = Math.round(
    90 - fillerRatio * 250 - (wordCount < 20 ? 20 : 0) + Math.random() * 6,
  );
  communication = Math.min(98, Math.max(25, communication));

  // ── Confidence ───────────────────────────────────────────────────────────────
  const hedgeWords = ["maybe", "perhaps", "i think", "not sure", "i guess", "probably"];
  const hedgeCount = hedgeWords.filter((w) => lower.includes(w)).length;
  let confidence = Math.round(85 - hedgeCount * 8 - fillerCount * 3 + Math.random() * 8);
  confidence = Math.min(98, Math.max(25, confidence));

  // ── Optimization ─────────────────────────────────────────────────────────────
  let optimization = Math.round(
    35 +
      (mentionsOptimization ? 20 : 0) +
      (mentionsComplexity ? 18 : 0) +
      tagCoverage * 15 +
      Math.random() * 12,
  );
  optimization = Math.min(98, Math.max(20, optimization));

  // ── Overall ──────────────────────────────────────────────────────────────────
  const overall = Math.round(
    correctness * 0.35 + communication * 0.25 + confidence * 0.2 + optimization * 0.2,
  );

  // ── Strengths ────────────────────────────────────────────────────────────────
  const strengths: string[] = [];
  if (correctness >= 75) strengths.push("Solid understanding of the core algorithm");
  if (communication >= 80) strengths.push("Clear and structured verbal explanation");
  if (confidence >= 80) strengths.push("Confident delivery — minimal hedging");
  if (mentionsComplexity) strengths.push("Proactively addressed time/space complexity");
  if (mentionsEdgeCases) strengths.push("Considered edge cases without prompting");
  if (wpm >= 120 && wpm <= 180) strengths.push("Natural speaking pace — easy to follow");
  if (fillerCount <= 2) strengths.push("Minimal filler words — polished delivery");
  if (strengths.length === 0) strengths.push("Attempted the problem — good starting point");

  // ── Weaknesses ───────────────────────────────────────────────────────────────
  const weaknesses: string[] = [];
  if (correctness < 65) weaknesses.push("Core solution logic needs more depth");
  if (!mentionsComplexity) weaknesses.push("Didn't address time/space complexity");
  if (!mentionsEdgeCases) weaknesses.push("Edge cases (null, empty, duplicates) not considered");
  if (fillerCount > 4)
    weaknesses.push(
      `High filler word usage (${fillerCount} instances) — practice deliberate pauses`,
    );
  if (hedgeCount > 2) weaknesses.push("Too many hedge phrases signal uncertainty — be more direct");
  if (wordCount < 25) weaknesses.push("Answer was too brief — elaborate on your reasoning");
  if (wpm > 200) weaknesses.push("Speaking pace was too fast — slow down for clarity");
  if (weaknesses.length === 0) weaknesses.push("Minor polish needed — keep practicing");

  const missingPoints: string[] = [];
  if (!mentionsComplexity) missingPoints.push("State the time and space complexity clearly.");
  if (!mentionsEdgeCases) {
    missingPoints.push(
      "Cover edge cases such as null, empty input, duplicates, or very large input.",
    );
  }
  if (!mentionsOptimization && question.difficulty !== "Easy") {
    missingPoints.push("Compare the brute-force approach with the optimized approach.");
  }
  if (tagCoverage < 0.5) {
    missingPoints.push(
      `Use the expected topic vocabulary: ${question.tags.slice(0, 3).join(", ")}.`,
    );
  }
  if (wordCount < 50) {
    missingPoints.push(
      "Walk through the reasoning step by step instead of giving only the final idea.",
    );
  }
  if (missingPoints.length === 0) {
    missingPoints.push("Add a short dry run or trade-off discussion to make the answer stronger.");
  }

  // ── Suggestion ───────────────────────────────────────────────────────────────
  let suggestion = "";
  if (!mentionsComplexity) {
    suggestion =
      "Always state the time and space complexity before moving on — interviewers expect it.";
  } else if (fillerCount > 4) {
    suggestion =
      "Replace filler words with a 1-second pause. Silence signals confidence, not uncertainty.";
  } else if (!mentionsEdgeCases) {
    suggestion =
      "After your main solution, always ask yourself: what happens with null input, empty arrays, or duplicates?";
  } else if (correctness < 65) {
    suggestion =
      "Structure your answer as: approach → why it works → complexity → edge cases. This framework keeps you on track.";
  } else {
    suggestion =
      "Strong answer. Next time, try to proactively mention trade-offs between approaches before the interviewer asks.";
  }

  // ── Follow-up ────────────────────────────────────────────────────────────────
  let followUp: string | null = null;
  if (!mentionsComplexity) {
    followUp = "Good approach. What's the time and space complexity of your solution?";
  } else if (!mentionsEdgeCases) {
    followUp = "Solid. Now let's stress-test it — what edge cases should we handle?";
  } else if (mentionsOptimization === false && question.difficulty !== "Easy") {
    followUp =
      "Can you think of a way to optimize this further, or discuss the trade-offs of your current approach?";
  } else if (question.followUps.length > 0) {
    followUp = question.followUps[Math.floor(Math.random() * question.followUps.length)];
  }

  return {
    correctnessScore: correctness,
    communicationScore: communication,
    confidenceScore: confidence,
    optimizationScore: optimization,
    overallScore: overall,
    missingPoints,
    incorrectStatements: [],
    strengths,
    weaknesses,
    suggestion,
    improvedAnswer:
      "A stronger answer should start with the core approach, explain why it works, state time and space complexity, cover edge cases, and mention trade-offs or optimizations.",
    followUp,
  };
}

/** Simulated async delay to mimic real API latency */
export async function evaluateAnswerAsync(
  answer: string,
  question: InterviewQuestion,
  durationSeconds: number,
): Promise<EvaluationResult> {
  // Simulate network + model latency (1.5–3s)
  const delay = 1500 + Math.random() * 1500;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return evaluateAnswer(answer, question, durationSeconds);
}
