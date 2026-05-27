import { useState } from "react";
import type { InterviewQuestion, InterviewStatus, EvaluationResult } from "@/lib/interview-types";
import type { SpeechMetrics } from "@/lib/speech-metrics";
import { ProgressBar } from "@/components/ui-bits";
import {
  Clock,
  Lightbulb,
  Lock,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Zap,
  Target,
  Brain,
} from "lucide-react";

// ─── Timer display ────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── HintPanel ────────────────────────────────────────────────────────────────

function HintPanel({ hints }: { hints: string[] }) {
  const [revealed, setReveal] = useState(0);

  return (
    <div>
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Hints
      </div>
      <div className="space-y-2">
        {hints.map((hint, i) => {
          const isLocked = i >= revealed;
          return (
            <button
              key={i}
              onClick={() => setReveal(Math.max(revealed, i + 1))}
              className={`flex w-full items-start gap-2.5 rounded-lg border border-border bg-surface-2/60 p-3 text-left text-[12px] transition hover:border-primary/30 ${
                isLocked ? "opacity-50" : ""
              }`}
            >
              {isLocked ? (
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className={isLocked ? "blur-[3px] select-none" : "text-foreground/85"}>
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── LiveMetrics ──────────────────────────────────────────────────────────────

function LiveMetrics({ evaluation }: { evaluation: EvaluationResult }) {
  const metrics = [
    {
      label: "Correctness",
      value: evaluation.correctnessScore,
      tone: "success" as const,
      icon: Target,
    },
    {
      label: "Communication",
      value: evaluation.communicationScore,
      tone: "info" as const,
      icon: MessageSquare,
    },
    {
      label: "Confidence",
      value: evaluation.confidenceScore,
      tone: "primary" as const,
      icon: Brain,
    },
    {
      label: "Optimization",
      value: evaluation.optimizationScore,
      tone: "warning" as const,
      icon: Zap,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" /> Live Scores
      </div>
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <m.icon className="h-3 w-3" />
                {m.label}
              </div>
              <span className="font-mono text-foreground">{m.value}</span>
            </div>
            <ProgressBar value={m.value} tone={m.tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── InterviewSidebar ─────────────────────────────────────────────────────────

function SpeechMetricsPanel({ metrics }: { metrics: SpeechMetrics }) {
  const rows = [
    { label: "Clarity", value: metrics.clarityScore, tone: "success" as const },
    { label: "Confidence", value: metrics.confidenceScore, tone: "primary" as const },
    {
      label: `Pace (${metrics.wpm || "—"} wpm)`,
      value: metrics.pacingScore,
      tone: "info" as const,
    },
    { label: "Technical", value: metrics.technicalScore, tone: "warning" as const },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" /> Live Analytics
      </div>
      <div className="space-y-3">
        {rows.map((m) => (
          <div key={m.label}>
            <div className="mb-1.5 flex justify-between text-[12px]">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-mono text-foreground">{m.value}</span>
            </div>
            <ProgressBar value={m.value} tone={m.tone} />
          </div>
        ))}
      </div>
      {metrics.fillerWords.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2/60 p-2.5">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Top fillers
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {metrics.fillerWords.slice(0, 4).map((f, i) => (
              <span
                key={i}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface InterviewSidebarProps {
  question: InterviewQuestion;
  status: InterviewStatus;
  elapsedSeconds: number;
  questionCount: number;
  latestEvaluation: EvaluationResult | null;
  liveMetrics?: SpeechMetrics | null;
  onStart: () => void;
  onEnd: () => void;
}

export function InterviewSidebar({
  question,
  status,
  elapsedSeconds,
  questionCount,
  latestEvaluation,
  liveMetrics,
  onStart,
  onEnd,
}: InterviewSidebarProps) {
  const isActive = status === "active" || status === "evaluating";
  const isComplete = status === "complete";

  return (
    <div className="flex flex-col gap-5 overflow-y-auto">
      {/* Session timer */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Session
          </div>
          {isActive && (
            <span className="flex items-center gap-1.5 text-[10.5px] text-[oklch(0.74_0.20_25)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.66_0.21_25)]" />
              Live
            </span>
          )}
        </div>
        <div className="mt-2 font-display text-[40px] leading-none text-foreground">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
          {questionCount} answer{questionCount !== 1 ? "s" : ""} submitted
        </div>

        {/* Progress bar — 3 questions per session */}
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[10.5px] text-muted-foreground">
            <span>Progress</span>
            <span>{questionCount}/3</span>
          </div>
          <ProgressBar value={(questionCount / 3) * 100} tone="primary" />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          {status === "idle" && (
            <button
              onClick={onStart}
              className="btn-glow flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition active:scale-[0.98]"
            >
              Start Interview
            </button>
          )}
          {isActive && (
            <button
              onClick={onEnd}
              className="flex-1 rounded-lg border border-border py-2 text-[12.5px] font-medium text-muted-foreground transition hover:border-[oklch(0.66_0.21_25/0.4)] hover:text-[oklch(0.74_0.20_25)]"
            >
              End Session
            </button>
          )}
          {isComplete && (
            <div className="flex-1 rounded-lg border border-[oklch(0.74_0.16_160/0.3)] bg-[oklch(0.74_0.16_160/0.06)] py-2 text-center text-[12.5px] font-medium text-[oklch(0.78_0.16_160)]">
              Session complete
            </div>
          )}
        </div>
      </div>

      {/* Question info */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Current Question
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10.5px] text-muted-foreground">
            {question.category}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
              question.difficulty === "Easy"
                ? "border-[oklch(0.74_0.16_160/0.3)] text-[oklch(0.78_0.16_160)]"
                : question.difficulty === "Medium"
                  ? "border-[oklch(0.80_0.14_80/0.3)] text-[oklch(0.82_0.14_80)]"
                  : "border-[oklch(0.66_0.21_25/0.3)] text-[oklch(0.74_0.20_25)]"
            }`}
          >
            {question.difficulty}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {question.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
        <button className="mt-3 flex items-center gap-1 text-[11.5px] text-muted-foreground transition hover:text-foreground">
          View question <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {liveMetrics ? (
        <SpeechMetricsPanel metrics={liveMetrics} />
      ) : (
        latestEvaluation && <LiveMetrics evaluation={latestEvaluation} />
      )}

      {/* Hints */}
      {(isActive || isComplete) && <HintPanel hints={question.hints} />}
    </div>
  );
}
