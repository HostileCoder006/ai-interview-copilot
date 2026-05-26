import type { EvaluationResult, InterviewQuestion } from "./interview-types";
import { evaluateAnswerAsync as evaluateAnswerLocally } from "./mock-evaluator";

export async function evaluateAnswerAsync(
  answer: string,
  question: InterviewQuestion,
  durationSeconds: number,
): Promise<EvaluationResult> {
  try {
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer, question, durationSeconds }),
    });

    if (!response.ok) {
      throw new Error(`Evaluation failed with status ${response.status}`);
    }

    return (await response.json()) as EvaluationResult;
  } catch {
    return evaluateAnswerLocally(answer, question, durationSeconds);
  }
}

export async function transcribeInterviewAudio(audio: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audio, "answer.webm");

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { text?: string };
  return payload.text ?? "";
}
