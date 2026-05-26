import { useState, useCallback, useRef } from "react";
import type {
  ChatMessage,
  EvaluationResult,
  InterviewQuestion,
  InterviewStatus,
} from "@/lib/interview-types";
import { evaluateAnswerAsync } from "@/lib/evaluator-client";
import {
  buildInterviewerReply,
  formatOpeningQuestion,
  formatSessionClosing,
  type InterviewerCompany,
} from "@/lib/interviewer-dialogue";
import { getRandomQuestion } from "@/lib/interview-questions";
import {
  buildHistoryFromEvaluations,
  persistInterviewSession,
} from "@/lib/session-persistence";
import { metricsFromEvaluation, type SpeechMetrics } from "@/lib/speech-metrics";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random()}`;
}

export interface UseInterviewOptions {
  question: InterviewQuestion;
  company?: string;
  onComplete?: (messages: ChatMessage[], finalScore: number) => void;
  onMetricsUpdate?: (metrics: SpeechMetrics) => void;
}

export interface UseInterviewReturn {
  status: InterviewStatus;
  messages: ChatMessage[];
  currentEvaluation: EvaluationResult | null;
  liveMetrics: SpeechMetrics | null;
  isEvaluating: boolean;
  isLoading: boolean;
  elapsedSeconds: number;
  questionCount: number;
  submitAnswer: (answer: string) => Promise<void>;
  startInterview: () => void;
  endInterview: () => void;
  reset: () => void;
}

const DEFAULT_METRICS: SpeechMetrics = {
  fillerCount: 0,
  fillerWords: [],
  pauseCount: 0,
  wpm: 0,
  clarityScore: 0,
  confidenceScore: 0,
  pacingScore: 0,
  technicalScore: 0,
};

export function useInterview({
  question: initialQuestion,
  company = "General",
  onComplete,
  onMetricsUpdate,
}: UseInterviewOptions): UseInterviewReturn {
  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<SpeechMetrics | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const answerStartRef = useRef(0);
  const currentQuestionRef = useRef(initialQuestion);
  const followUpIndexRef = useRef(0);
  const allMetricsRef = useRef<SpeechMetrics[]>([]);
  const evaluationsRef = useRef<EvaluationResult[]>([]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    const full: ChatMessage = { ...msg, id: newId() };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const recordMetrics = useCallback(
    (metrics: SpeechMetrics) => {
      setLiveMetrics(metrics);
      allMetricsRef.current = [...allMetricsRef.current, metrics];
      onMetricsUpdate?.(metrics);
    },
    [onMetricsUpdate],
  );

  const startInterview = useCallback(() => {
    setIsLoading(true);
    setStatus("active");
    setMessages([]);
    setCurrentEvaluation(null);
    setLiveMetrics(null);
    setElapsedSeconds(0);
    setQuestionCount(0);
    currentQuestionRef.current = initialQuestion;
    followUpIndexRef.current = 0;
    allMetricsRef.current = [];
    evaluationsRef.current = [];
    startTimer();
    answerStartRef.current = 0;

    setTimeout(() => {
      addMessage({
        role: "ai",
        content: formatOpeningQuestion(
          company as InterviewerCompany,
          initialQuestion.text,
        ),
        timestamp: Date.now(),
      });
      answerStartRef.current = 0;
      setIsLoading(false);
    }, 800);
  }, [initialQuestion, company, addMessage, startTimer]);

  const finishSession = useCallback(
    (finalMessages: ChatMessage[], lastEvaluation: EvaluationResult) => {
      const transcript = finalMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");

      persistInterviewSession(
        buildHistoryFromEvaluations({
          company,
          difficulty: initialQuestion.difficulty,
          category: initialQuestion.category,
          mode: "text",
          elapsedSeconds: elapsedRef.current,
          evaluations: evaluationsRef.current,
          metricsSamples: allMetricsRef.current,
          transcript,
        }),
      );

      addMessage({
        role: "ai",
        content: formatSessionClosing(company as InterviewerCompany),
        timestamp: Date.now(),
      });
      stopTimer();
      setStatus("complete");
      onComplete?.(finalMessages, lastEvaluation.overallScore);
    },
    [company, initialQuestion, elapsedSeconds, addMessage, stopTimer, onComplete],
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!answer.trim() || status !== "active") return;

      const answerDuration = Math.max(elapsedSeconds - answerStartRef.current, 5);
      answerStartRef.current = elapsedSeconds;
      const trimmed = answer.trim();

      addMessage({
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      });

      setIsEvaluating(true);
      setStatus("evaluating");

      try {
        const evaluation = await evaluateAnswerAsync(
          trimmed,
          currentQuestionRef.current,
          answerDuration,
        );

        setCurrentEvaluation(evaluation);
        evaluationsRef.current = [...evaluationsRef.current, evaluation];
        recordMetrics(metricsFromEvaluation(trimmed, answerDuration, evaluation));

        setMessages((prev) => {
          const updated = [...prev];
          const lastUser = [...updated].reverse().find((m) => m.role === "user");
          if (lastUser) {
            const idx = updated.lastIndexOf(lastUser);
            updated[idx] = { ...lastUser, evaluation };
          }
          return updated;
        });

        const nextCount = questionCount + 1;
        setQuestionCount(nextCount);

        if (nextCount >= 3) {
          setIsEvaluating(false);
          const snapshot = [
            ...messages,
            {
              id: newId(),
              role: "user" as const,
              content: trimmed,
              timestamp: Date.now(),
              evaluation,
            },
          ];
          finishSession(snapshot, evaluation);
          return;
        }

        const q = currentQuestionRef.current;
        const useAdaptiveFollowUp =
          followUpIndexRef.current < q.followUps.length && nextCount % 2 === 1;

        let aiReply: string;

        if (useAdaptiveFollowUp) {
          aiReply = buildInterviewerReply({
            company: company as InterviewerCompany,
            answer: trimmed,
            followUps: q.followUps,
            followUpIndex: followUpIndexRef.current,
            mode: "follow_up",
            scores: {
              correctness: evaluation.correctnessScore,
              communication: evaluation.communicationScore,
            },
          });
          followUpIndexRef.current += 1;
        } else {
          const nextQuestion = getRandomQuestion(q.category, q.difficulty);
          currentQuestionRef.current = nextQuestion;
          followUpIndexRef.current = 0;

          aiReply = buildInterviewerReply({
            company: company as InterviewerCompany,
            answer: trimmed,
            followUps: q.followUps,
            followUpIndex: 0,
            mode: "new_question",
            nextQuestionText: nextQuestion.text,
            scores: {
              correctness: evaluation.correctnessScore,
              communication: evaluation.communicationScore,
            },
          });
        }

        setTimeout(() => {
          addMessage({
            role: "ai",
            content: aiReply,
            timestamp: Date.now(),
          });
          setStatus("active");
        }, 600);
      } catch {
        addMessage({
          role: "ai",
          content:
            "I lost you for a second — can you restate the core of your approach?",
          timestamp: Date.now(),
        });
        setStatus("active");
      } finally {
        setIsEvaluating(false);
      }
    },
    [
      status,
      elapsedSeconds,
      questionCount,
      messages,
      company,
      addMessage,
      recordMetrics,
      finishSession,
    ],
  );

  const endInterview = useCallback(() => {
    stopTimer();
    if (evaluationsRef.current.length > 0) {
      const last = evaluationsRef.current[evaluationsRef.current.length - 1]!;
      finishSession(messages, last);
      return;
    }
    setStatus("complete");
    addMessage({
      role: "ai",
      content: formatSessionClosing(company as InterviewerCompany),
      timestamp: Date.now(),
    });
  }, [stopTimer, messages, company, addMessage, finishSession]);

  const reset = useCallback(() => {
    stopTimer();
    setStatus("idle");
    setMessages([]);
    setCurrentEvaluation(null);
    setLiveMetrics(null);
    setIsLoading(false);
    setElapsedSeconds(0);
    setQuestionCount(0);
    allMetricsRef.current = [];
    evaluationsRef.current = [];
    followUpIndexRef.current = 0;
    currentQuestionRef.current = initialQuestion;
  }, [stopTimer, initialQuestion]);

  return {
    status,
    messages,
    currentEvaluation,
    liveMetrics,
    isEvaluating,
    isLoading,
    elapsedSeconds,
    questionCount,
    submitAnswer,
    startInterview,
    endInterview,
    reset,
  };
}
