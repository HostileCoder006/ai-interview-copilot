import type { EvaluationResult } from "@/lib/interview-types";
import { CheckCircle2, AlertCircle, Lightbulb, TrendingUp } from "lucide-react";

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ value, label, size = 72 }: { value: number; label: string; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;

  const color =
    value >= 80
      ? "oklch(0.74 0.16 160)"
      : value >= 60
        ? "oklch(0.80 0.14 80)"
        : "oklch(0.66 0.21 25)";

  const textColor =
    value >= 80
      ? "text-[oklch(0.78_0.16_160)]"
      : value >= 60
        ? "text-[oklch(0.82_0.14_80)]"
        : "text-[oklch(0.74_0.20_25)]";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="oklch(1 0 0 / 0.06)"
            strokeWidth="5"
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{
              transition: "stroke-dasharray 0.8s cubic-bezier(.2,.7,.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-[15px] font-semibold leading-none ${textColor}`}>
            {value}
          </span>
        </div>
      </div>
      <span className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ─── ScoreCard ────────────────────────────────────────────────────────────────

export function ScoreCard({ evaluation }: { evaluation: EvaluationResult }) {
  const overallColor =
    evaluation.overallScore >= 80
      ? "text-[oklch(0.78_0.16_160)]"
      : evaluation.overallScore >= 60
        ? "text-[oklch(0.82_0.14_80)]"
        : "text-[oklch(0.74_0.20_25)]";

  const overallBorder =
    evaluation.overallScore >= 80
      ? "border-[oklch(0.74_0.16_160/0.25)]"
      : evaluation.overallScore >= 60
        ? "border-[oklch(0.80_0.14_80/0.25)]"
        : "border-[oklch(0.66_0.21_25/0.25)]";

  const overallBg =
    evaluation.overallScore >= 80
      ? "bg-[oklch(0.74_0.16_160/0.05)]"
      : evaluation.overallScore >= 60
        ? "bg-[oklch(0.80_0.14_80/0.05)]"
        : "bg-[oklch(0.66_0.21_25/0.05)]";

  return (
    <div
      className={`animate-in-up rounded-2xl border ${overallBorder} ${overallBg} p-5 space-y-4`}
      style={{ animationDelay: "0.1s" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Answer Evaluation
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-display text-[28px] leading-none ${overallColor}`}>
            {evaluation.overallScore}
          </span>
          <span className="text-[11px] text-muted-foreground">/100</span>
        </div>
      </div>

      {/* Score rings */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-surface-2/40 p-4">
        <ScoreRing value={evaluation.correctnessScore} label="Correct" />
        <ScoreRing value={evaluation.communicationScore} label="Comm." />
        <ScoreRing value={evaluation.confidenceScore} label="Confid." />
        <ScoreRing value={evaluation.optimizationScore} label="Optim." />
      </div>

      {/* Strengths */}
      {evaluation.strengths.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[oklch(0.74_0.16_160)]">
            <CheckCircle2 className="h-3 w-3" /> Strengths
          </div>
          {evaluation.strengths.slice(0, 2).map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-[oklch(0.74_0.16_160/0.15)] bg-[oklch(0.74_0.16_160/0.05)] px-3 py-2 text-[12px] text-foreground/85"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[oklch(0.74_0.16_160)]" />
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Weaknesses */}
      {evaluation.weaknesses.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[oklch(0.80_0.14_80)]">
            <AlertCircle className="h-3 w-3" /> Improve
          </div>
          {evaluation.weaknesses.slice(0, 2).map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-[oklch(0.80_0.14_80/0.15)] bg-[oklch(0.80_0.14_80/0.05)] px-3 py-2 text-[12px] text-foreground/85"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-[oklch(0.80_0.14_80)]" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Missing points */}
      {evaluation.missingPoints.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-primary">
            <Lightbulb className="h-3 w-3" /> Missing points
          </div>
          {evaluation.missingPoints.slice(0, 3).map((point, i) => (
            <div
              key={i}
              className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-[12px] text-foreground/85"
            >
              {point}
            </div>
          ))}
        </div>
      )}

      {/* Suggestion */}
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-3">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[12px] leading-relaxed text-foreground/85">{evaluation.suggestion}</p>
      </div>

      {evaluation.improvedAnswer && (
        <div className="rounded-xl border border-border bg-surface-2/50 px-3.5 py-3">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Stronger answer pattern
          </div>
          <p className="text-[12px] leading-relaxed text-foreground/80">
            {evaluation.improvedAnswer}
          </p>
        </div>
      )}
    </div>
  );
}
