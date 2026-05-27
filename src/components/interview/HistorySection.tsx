import type { InterviewHistoryEntry } from "@/lib/interview-types";
import { ProgressBar } from "@/components/ui-bits";
import { Clock, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useInterviewSessions } from "@/hooks/useInterviewSessions";
import { computeInterviewStats, formatRelativeSessionDate } from "@/lib/interview-history-utils";

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-[oklch(0.78_0.16_160)] bg-[oklch(0.74_0.16_160/0.1)] border-[oklch(0.74_0.16_160/0.25)]"
      : score >= 65
        ? "text-[oklch(0.82_0.14_80)] bg-[oklch(0.80_0.14_80/0.1)] border-[oklch(0.80_0.14_80/0.25)]"
        : "text-[oklch(0.74_0.20_25)] bg-[oklch(0.66_0.21_25/0.1)] border-[oklch(0.66_0.21_25/0.25)]";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[12px] font-semibold ${color}`}
    >
      {score}
    </span>
  );
}

export function HistorySection() {
  const sessions = useInterviewSessions();
  const stats = computeInterviewStats(sessions);
  const recent = [...sessions].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5);

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-2/30 p-8 text-center text-[13px] text-muted-foreground">
        Complete an interview to see your history and progress here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sessions", value: stats.sessionCount },
          { label: "Avg Score", value: stats.avgOverall },
          { label: "Best", value: stats.bestScore },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface-2/40 p-3 text-center"
          >
            <div className="font-display text-[28px] leading-none text-foreground">{s.value}</div>
            <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {stats.scoreTrend.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-2/40 p-4">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Score Trend
          </div>
          <div className="flex h-12 items-end gap-1.5">
            {[...stats.scoreTrend].reverse().map((score, i) => (
              <div
                key={i}
                title={`Score: ${score}`}
                className={`flex-1 rounded-sm opacity-80 transition-all hover:opacity-100 ${
                  score >= 80
                    ? "bg-[oklch(0.74_0.16_160)]"
                    : score >= 65
                      ? "bg-[oklch(0.80_0.14_80)]"
                      : "bg-[oklch(0.66_0.21_25)]"
                }`}
                style={{ height: `${(score / 100) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-2/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Recent Sessions
          </span>
          <Link
            to="/analytics"
            className="flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recent.map((s: InterviewHistoryEntry) => (
            <li
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2/60"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                {s.company[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                  {s.company}
                  <span className="text-[10px] font-normal capitalize text-muted-foreground">
                    {s.mode ?? "text"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {s.duration} · {formatRelativeSessionDate(s.timestamp, s.date)}
                </div>
                <div className="mt-1.5">
                  <ProgressBar
                    value={s.overallScore}
                    tone={
                      s.overallScore >= 80 ? "success" : s.overallScore >= 65 ? "warning" : "danger"
                    }
                  />
                </div>
              </div>
              <ScorePill score={s.overallScore} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
