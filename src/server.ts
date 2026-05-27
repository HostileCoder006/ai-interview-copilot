import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { evaluateAnswer } from "./lib/mock-evaluator";
import type { EvaluationResult, InterviewQuestion } from "./lib/interview-types";
import {
  OPENROUTER_BASE_URL,
  TRANSCRIPTION_MODEL,
  TRANSCRIPTION_MODEL_FALLBACK,
  EVALUATION_MODEL,
} from "./lib/api-config";
import { transcribeWithOpenRouter } from "./lib/openrouter-transcription";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

type RuntimeEnv = Record<string, string | undefined>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
}

function getEnvValue(env: unknown, key: string): string | undefined {
  const runtimeEnv = env as RuntimeEnv | undefined;
  const nodeProcess = (globalThis as unknown as { process?: { env?: RuntimeEnv } }).process;
  return runtimeEnv?.[key] ?? nodeProcess?.env?.[key];
}

type ApiKeyPurpose = "transcription" | "evaluation" | "default";

/** Resolve OpenRouter API key from .env (supports separate STT vs chat keys). */
function resolveApiKey(env: unknown, purpose: ApiKeyPurpose = "default"): string {
  const shared = getEnvValue(env, "OPENROUTER_API_KEY");
  const transcription = getEnvValue(env, "OPENROUTER_TRANSCRIPTION_API_KEY");
  const evaluation = getEnvValue(env, "OPENROUTER_EVALUATION_API_KEY");

  if (purpose === "transcription") {
    return transcription ?? shared ?? "";
  }
  if (purpose === "evaluation") {
    return evaluation ?? shared ?? "";
  }
  return shared ?? transcription ?? evaluation ?? "";
}

function clampScore(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string").slice(0, 8);
}

function parseInterviewQuestion(raw: FormDataEntryValue | null): InterviewQuestion | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<InterviewQuestion>;
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      return {
        id: parsed.id ?? "voice",
        text: parsed.text,
        category: parsed.category ?? "DSA",
        difficulty: parsed.difficulty ?? "Medium",
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t) => typeof t === "string") : [],
        followUps: Array.isArray(parsed.followUps)
          ? parsed.followUps.filter((t) => typeof t === "string")
          : [],
        hints: Array.isArray(parsed.hints) ? parsed.hints.filter((t) => typeof t === "string") : [],
      };
    }
  } catch {
    // fall through — treat as plain question text
  }

  return {
    id: "voice",
    text: raw.trim(),
    category: "DSA",
    difficulty: "Medium",
    tags: [],
    followUps: [],
    hints: [],
  };
}

function normalizeEvaluation(value: unknown, fallback: EvaluationResult): EvaluationResult {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    correctnessScore: clampScore(data.correctnessScore, fallback.correctnessScore),
    communicationScore: clampScore(data.communicationScore, fallback.communicationScore),
    confidenceScore: clampScore(data.confidenceScore, fallback.confidenceScore),
    optimizationScore: clampScore(data.optimizationScore, fallback.optimizationScore),
    overallScore: clampScore(data.overallScore, fallback.overallScore),
    missingPoints: asStringArray(data.missingPoints, fallback.missingPoints),
    incorrectStatements: asStringArray(data.incorrectStatements, fallback.incorrectStatements),
    strengths: asStringArray(data.strengths, fallback.strengths),
    weaknesses: asStringArray(data.weaknesses, fallback.weaknesses),
    suggestion: typeof data.suggestion === "string" ? data.suggestion : fallback.suggestion,
    improvedAnswer:
      typeof data.improvedAnswer === "string" ? data.improvedAnswer : fallback.improvedAnswer,
    followUp:
      typeof data.followUp === "string"
        ? data.followUp
        : typeof data.followUpQuestion === "string"
          ? data.followUpQuestion
          : fallback.followUp,
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildEvaluationPrompt(
  question: InterviewQuestion,
  answer: string,
  durationSeconds: number,
): string {
  return `You are Alex, a strict but helpful technical interviewer at a top tech company.

Evaluate the candidate's spoken answer as if this were a real technical interview.

Question: ${question.text}
Category: ${question.category}
Difficulty: ${question.difficulty}
Expected topics: ${question.tags.join(", ")}
Answer duration: ${durationSeconds}s

Candidate's answer (transcribed from speech):
${answer}

Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{
  "correctnessScore": 0,
  "communicationScore": 0,
  "confidenceScore": 0,
  "optimizationScore": 0,
  "overallScore": 0,
  "missingPoints": [],
  "incorrectStatements": [],
  "strengths": [],
  "weaknesses": [],
  "suggestion": "",
  "improvedAnswer": "",
  "followUp": ""
}

Scoring guide (0–100):
- correctnessScore: Is the core algorithm/approach correct? Does it solve the problem?
- communicationScore: Was the explanation clear, structured, and easy to follow?
- confidenceScore: Did the candidate sound confident? Minimal hedging and filler words?
- optimizationScore: Did they discuss time/space complexity and optimizations?
- overallScore: Weighted average (correctness 35%, communication 25%, confidence 20%, optimization 20%)

For DSA: check algorithm choice, data structure, dry run, time/space complexity, edge cases, brute force vs optimized.
For system design: check requirements, APIs, data model, scaling, caching, consistency, failure handling, trade-offs.
For behavioral: check STAR structure, specificity, ownership, impact, reflection.

followUp: Ask one sharp follow-up question that probes a gap in their answer. If the answer was strong, ask about an edge case or optimization.`;
}

// ─── /api/evaluate ────────────────────────────────────────────────────────────
// Evaluates a text answer using DeepSeek via OpenRouter.

async function handleEvaluate(request: Request, env: unknown): Promise<Response> {
  const payload = (await request.json()) as {
    answer?: string;
    question?: InterviewQuestion;
    durationSeconds?: number;
  };

  if (!payload.answer || !payload.question) {
    return jsonResponse({ error: "Missing answer or question." }, { status: 400 });
  }

  const durationSeconds = Math.max(Number(payload.durationSeconds) || 5, 5);
  const fallback = evaluateAnswer(payload.answer, payload.question, durationSeconds);
  const apiKey = resolveApiKey(env, "evaluation");
  const model = getEnvValue(env, "OPENROUTER_EVALUATION_MODEL") ?? EVALUATION_MODEL;

  if (!apiKey) {
    return jsonResponse(
      { error: "Missing OPENROUTER_EVALUATION_API_KEY or OPENROUTER_API_KEY in .env" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://ai-copilot-interviews.app",
        "X-Title": "AI Copilot Technical Interviews",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You evaluate technical interview answers and return strict JSON only. No markdown, no explanation.",
          },
          {
            role: "user",
            content: buildEvaluationPrompt(payload.question, payload.answer, durationSeconds),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[evaluate] OpenRouter error ${response.status}: ${errText}`);
      return jsonResponse(fallback);
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    const parsed = content ? (JSON.parse(content) as unknown) : {};
    return jsonResponse(normalizeEvaluation(parsed, fallback));
  } catch (err) {
    console.error("[evaluate] Unexpected error:", err);
    return jsonResponse(fallback);
  }
}

// ─── /api/transcribe-and-evaluate ─────────────────────────────────────────────
// 1. Transcribes audio using openai/whisper-large-v3-turbo via OpenRouter
// 2. Evaluates the transcript using deepseek/deepseek-v4-flash via OpenRouter
// Returns: { transcript, evaluation: EvaluationResult }

async function handleTranscribeAndEvaluate(request: Request, env: unknown): Promise<Response> {
  const transcriptionKey = resolveApiKey(env, "transcription");
  const evaluationKey = resolveApiKey(env, "evaluation");
  const transcriptionModel =
    getEnvValue(env, "OPENROUTER_TRANSCRIPTION_MODEL") ?? TRANSCRIPTION_MODEL;
  const evaluationModel = getEnvValue(env, "OPENROUTER_EVALUATION_MODEL") ?? EVALUATION_MODEL;

  if (!transcriptionKey) {
    return jsonResponse(
      { error: "Missing OPENROUTER_TRANSCRIPTION_API_KEY or OPENROUTER_API_KEY in .env" },
      { status: 500 },
    );
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const audio = formData.get("audio");
  const questionRaw = formData.get("question");
  const durationRaw = formData.get("durationSeconds");

  if (!(audio instanceof File)) {
    return jsonResponse({ error: "Missing audio file." }, { status: 400 });
  }

  const question = parseInterviewQuestion(questionRaw);
  const durationSeconds = Math.max(Number(durationRaw) || 5, 5);

  // ── Step 1: Transcribe (OpenRouter expects JSON + base64, not multipart file) ─
  let transcript = "";
  try {
    let transcription = await transcribeWithOpenRouter({
      audio,
      apiKey: transcriptionKey,
      model: transcriptionModel,
    });

    if (
      !transcription.ok &&
      transcription.status >= 500 &&
      transcriptionModel !== TRANSCRIPTION_MODEL_FALLBACK
    ) {
      console.warn(
        `[transcribe] ${transcriptionModel} failed (${transcription.status}); retrying with ${TRANSCRIPTION_MODEL_FALLBACK}`,
      );
      transcription = await transcribeWithOpenRouter({
        audio,
        apiKey: transcriptionKey,
        model: TRANSCRIPTION_MODEL_FALLBACK,
      });
    }

    if (!transcription.ok) {
      console.error(
        `[transcribe] OpenRouter error ${transcription.status}: ${transcription.detail}`,
      );
      return jsonResponse(
        { error: transcription.message, detail: transcription.detail },
        { status: transcription.status },
      );
    }

    transcript = transcription.text;
  } catch (err) {
    console.error("[transcribe] Unexpected error:", err);
    return jsonResponse({ error: "Transcription request failed." }, { status: 500 });
  }

  // If no question was provided, just return the transcript
  if (!question || !transcript) {
    return jsonResponse({ transcript, evaluation: null });
  }

  // ── Step 2: Evaluate with DeepSeek ────────────────────────────────────────
  const fallback = evaluateAnswer(transcript, question, durationSeconds);

  if (!evaluationKey) {
    return jsonResponse({ transcript, evaluation: fallback });
  }

  try {
    const evalRes = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${evaluationKey}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://ai-copilot-interviews.app",
        "X-Title": "AI Copilot Technical Interviews",
      },
      body: JSON.stringify({
        model: evaluationModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You evaluate technical interview answers and return strict JSON only. No markdown, no explanation.",
          },
          {
            role: "user",
            content: buildEvaluationPrompt(question, transcript, durationSeconds),
          },
        ],
      }),
    });

    if (!evalRes.ok) {
      const errText = await evalRes.text();
      console.error(`[evaluate] OpenRouter error ${evalRes.status}: ${errText}`);
      return jsonResponse({ transcript, evaluation: fallback });
    }

    const evalPayload = (await evalRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = evalPayload.choices?.[0]?.message?.content;
    const parsed = content ? (JSON.parse(content) as unknown) : {};
    const evaluation = normalizeEvaluation(parsed, fallback);

    return jsonResponse({ transcript, evaluation });
  } catch (err) {
    console.error("[evaluate] Unexpected error:", err);
    return jsonResponse({ transcript, evaluation: fallback });
  }
}

// ─── /api/transcribe (legacy — transcript only) ───────────────────────────────
// Kept for backward compatibility. Returns { text: string }.

async function handleTranscribeOnly(request: Request, env: unknown): Promise<Response> {
  const apiKey = resolveApiKey(env, "transcription");
  const model = getEnvValue(env, "OPENROUTER_TRANSCRIPTION_MODEL") ?? TRANSCRIPTION_MODEL;

  if (!apiKey) {
    return jsonResponse(
      { error: "Missing OPENROUTER_TRANSCRIPTION_API_KEY or OPENROUTER_API_KEY in .env" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return jsonResponse({ error: "Missing audio file." }, { status: 400 });
  }

  try {
    let transcription = await transcribeWithOpenRouter({ audio, apiKey, model });

    if (
      !transcription.ok &&
      transcription.status >= 500 &&
      model !== TRANSCRIPTION_MODEL_FALLBACK
    ) {
      transcription = await transcribeWithOpenRouter({
        audio,
        apiKey,
        model: TRANSCRIPTION_MODEL_FALLBACK,
      });
    }

    if (!transcription.ok) {
      return jsonResponse(
        { error: transcription.message, detail: transcription.detail },
        { status: transcription.status },
      );
    }

    return jsonResponse({ text: transcription.text });
  } catch (err) {
    console.error("[transcribe-only] Unexpected error:", err);
    return jsonResponse({ error: "Transcription request failed." }, { status: 500 });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function handleApiRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/evaluate" && request.method === "POST") {
    return handleEvaluate(request, env);
  }
  if (pathname === "/api/transcribe-and-evaluate" && request.method === "POST") {
    return handleTranscribeAndEvaluate(request, env);
  }
  if (pathname === "/api/transcribe" && request.method === "POST") {
    return handleTranscribeOnly(request, env);
  }
  return null;
}

// ─── SSR entry ────────────────────────────────────────────────────────────────

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApiRequest(request, env);
      if (apiResponse) return apiResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
