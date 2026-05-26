import type { ChatMessage } from "@/lib/interview-types";
import { ProgressBar } from "@/components/ui-bits";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Target,
  Brain,
  Zap,
} from "lucide-react";

// ─── FinalReport ──────────────────────────────────────────────────────────────
// Shown when status === "complete". Aggregates all evaluations from the session.

interface FinalReportProps {
  messages: ChatMessage[];
  elapsedSeconds: number;
  onRestart: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function FinalReport({ messages, elapsedSeconds, onRestart }: FinalReportProps) {
  const evaluations = messages
    .filter((m) => m.role === "user" && m.evaluation)
    .map((m) => m.evaluation!);

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">No answers were submitted.</p>
        <button
          onClick={onRestart}
          className="btn-glow rounded-lg px-5 py-2.5 text-[13px] font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const avg = (key: keyof (typeof evaluations)[0]) =>
    Math.round(evaluations.reduce((sum, e) => sum + (e[key] as number), 0) / evaluations.length);

  const overallScore = avg("overallScore");
  const correctness = avg("correctnessScore");
  const communication = avg("communicationScore");
  const confidence = avg("confidenceScore");
  const optimization = avg("optimizationScore");

  const allStrengths = [...new Set(evaluations.flatMap((e) => e.strengths))].slice(0, 4);
  const allWeaknesses = [...new Set(evaluations.flatMap((e) => e.weaknesses))].slice(0, 4);
  const allMissingPoints = [...new Set(evaluations.flatMap((e) => e.missingPoints))].slice(0, 6);

  const scoreColor =
    overallScore >= 80
      ? "text-[oklch(0.78_0.16_160)]"
      : overallScore >= 60
        ? "text-[oklch(0.82_0.14_80)]"
        : "text-[oklch(0.74_0.20_25)]";

  const headline =
    overallScore >= 80
      ? "Excellent performance — you're interview-ready."
      : overallScore >= 60
        ? "Good effort. A few areas to polish before the real thing."
        : "Keep practicing. Focus on the recommendations below.";

  return (
    <div className="animate-in-up space-y-5 py-2">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-surface)] p-7">
        <div aria-hidden className="absolute inset-0 [background:var(--gradient-glow)]" />
        <div
          aria-hidden
          className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-1 text-center md:flex-row md:text-left md:gap-8">
          <div className="flex flex-col items-center">
            <div className={`font-display text-[68px] leading-none ${scoreColor}`}>
              {overallScore}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Overall Score
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Session Complete
              </span>
            </div>
            <h2 className="mt-1 font-display text-[22px] text-foreground">{headline}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] text-muted-foreground">
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
                {evaluations.length} answer{evaluations.length !== 1 ? "s" : ""}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Correctness", value: correctness, icon: Target, tone: "success" as const },
          {
            label: "Communication",
            value: communication,
            icon: MessageSquare,
            tone: "info" as const,
          },
          { label: "Confidence", value: confidence, icon: Brain, tone: "primary" as const },
          { label: "Optimization", value: optimization, icon: Zap, tone: "warning" as const },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface-2/40 p-4">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className="mt-2 font-display text-[32px] leading-none text-foreground">
              {s.value}
            </div>
            <div className="mt-2">
              <ProgressBar value={s.value} tone={s.tone} />
            </div>
          </div>
        ))}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[oklch(0.74_0.16_160)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
          </div>
          <ul className="space-y-2">
            {allStrengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-[oklch(0.74_0.16_160/0.15)] bg-[oklch(0.74_0.16_160/0.05)] px-3 py-2 text-[12px] text-foreground/85"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[oklch(0.74_0.16_160)]" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[oklch(0.80_0.14_80)]">
            <AlertCircle className="h-3.5 w-3.5" /> Areas to Improve
          </div>
          <ul className="space-y-2">
            {allWeaknesses.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-[oklch(0.80_0.14_80/0.15)] bg-[oklch(0.80_0.14_80/0.05)] px-3 py-2 text-[12px] text-foreground/85"
              >
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-[oklch(0.80_0.14_80)]" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Coaching recommendations */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
          <Lightbulb className="h-3.5 w-3.5" /> Coaching Recommendations
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {[...new Set(evaluations.map((e) => e.suggestion))].map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/60 p-3"
            >
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </div>
              <span className="text-[12px] leading-relaxed text-foreground/85">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {allMissingPoints.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
            <AlertCircle className="h-3.5 w-3.5" /> Missing From Your Answers
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {allMissingPoints.map((point, i) => (
              <div
                key={i}
                className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[12px] leading-relaxed text-foreground/85"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-answer breakdown */}
      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Answer Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Correct</th>
                <th className="pb-2 font-medium">Comm.</th>
                <th className="pb-2 font-medium">Confid.</th>
                <th className="pb-2 font-medium">Optim.</th>
                <th className="pb-2 text-right font-medium">Overall</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 font-mono">{e.correctnessScore}</td>
                  <td className="py-2 font-mono">{e.communicationScore}</td>
                  <td className="py-2 font-mono">{e.confidenceScore}</td>
                  <td className="py-2 font-mono">{e.optimizationScore}</td>
                  <td
                    className={`py-2 text-right font-mono font-semibold ${
                      e.overallScore >= 80
                        ? "text-[oklch(0.78_0.16_160)]"
                        : e.overallScore >= 60
                          ? "text-[oklch(0.82_0.14_80)]"
                          : "text-[oklch(0.74_0.20_25)]"
                    }`}
                  >
                    {e.overallScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pb-4">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-foreground transition hover:border-primary/40 hover:bg-muted/40"
        >
          <RefreshCw className="h-4 w-4" /> New Interview
        </button>
        <button className="btn-glow flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold">
          <BarChart3 className="h-4 w-4" /> Save to History
        </button>
      </div>
    </div>
  );
}
