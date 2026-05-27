import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, CardHeader, ProgressBar, Sparkline } from "@/components/ui-bits";
import {
  TrendingUp,
  Camera,
  Clock,
  Mic,
  BarChart3,
  MessageSquare,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useInterviewSessions } from "@/hooks/useInterviewSessions";
import { computeInterviewStats, formatRelativeSessionDate } from "@/lib/interview-history-utils";

export const Route = createFileRoute("/analytics")({ component: HistoryPage });

function HistoryPage() {
  const sessions = useInterviewSessions();
  const stats = computeInterviewStats(sessions);
  const sorted = [...sessions].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  return (
    <AppShell
      eyebrow="History"
      title="Interview history"
      actions={
        <Link to="/voice">
          <Button size="sm">
            <Play className="h-3.5 w-3.5" /> New Interview
          </Button>
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Avg Score",
            value: stats.sessionCount ? String(stats.avgOverall) : "—",
            icon: BarChart3,
          },
          {
            label: "Sessions",
            value: String(stats.sessionCount),
            icon: Camera,
          },
          {
            label: "Comm. Score",
            value: stats.sessionCount ? `${stats.avgCommunication}%` : "—",
            icon: Mic,
          },
          {
            label: "Avg Fillers",
            value: stats.sessionCount ? String(stats.avgFillers) : "—",
            icon: MessageSquare,
          },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center justify-between">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-[36px] leading-none">{s.value}</div>
            <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </div>
          </Card>
        ))}
      </section>

      {sessions.length === 0 ? (
        <Card className="mt-4 p-12 text-center">
          <p className="text-[14px] text-muted-foreground">
            No interview history yet. Complete a camera or text session to see scores, trends, and
            coaching insights here.
          </p>
          <Link to="/voice" className="mt-4 inline-block">
            <Button size="md">
              <Camera className="h-4 w-4" /> Start Camera Interview
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <div className="flex items-start justify-between">
                <CardHeader
                  title="Overall score trend"
                  hint={`${stats.scoreTrend.length} sessions`}
                />
                {stats.scoreTrend.length >= 2 &&
                  stats.scoreTrend[stats.scoreTrend.length - 1]! >= stats.scoreTrend[0]! && (
                    <Badge tone="primary">
                      <TrendingUp className="h-3 w-3" /> Improving
                    </Badge>
                  )}
              </div>
              <Sparkline points={stats.scoreTrend} />
              <div className="mt-3 grid grid-cols-4 gap-3 text-[12px]">
                {[
                  { l: "Best", v: stats.bestScore },
                  {
                    l: "Worst",
                    v: Math.min(...sessions.map((s) => s.overallScore)),
                  },
                  { l: "Avg", v: stats.avgOverall },
                  { l: "Sessions", v: stats.sessionCount },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="text-muted-foreground">{x.l}</div>
                    <div className="font-mono text-foreground">{x.v}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Communication breakdown" hint="Averaged across sessions" />
              <div className="space-y-3.5">
                {[
                  { l: "Clarity", v: stats.avgClarity, tone: "success" as const },
                  { l: "Pacing", v: stats.avgPacing, tone: "primary" as const },
                  { l: "Confidence", v: stats.avgConfidence, tone: "info" as const },
                  {
                    l: "Technical",
                    v: stats.avgTechnical,
                    tone: "warning" as const,
                  },
                ].map((r) => (
                  <div key={r.l}>
                    <div className="mb-1.5 flex justify-between text-[12px]">
                      <span className="text-muted-foreground">{r.l}</span>
                      <span className="font-mono text-foreground">{r.v}%</span>
                    </div>
                    <ProgressBar value={r.v} tone={r.tone} />
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
            <Card>
              <CardHeader title="Speech coaching insights" hint="From your saved sessions" />
              <div className="space-y-3">
                {[
                  {
                    icon: Zap,
                    label: "Filler words",
                    value: `${stats.avgFillers} avg per session`,
                    good: stats.avgFillers <= 4,
                  },
                  {
                    icon: BarChart3,
                    label: "Speaking pace",
                    value: stats.avgWpm ? `${stats.avgWpm} wpm avg` : "—",
                    good: stats.avgWpm >= 110 && stats.avgWpm <= 190,
                  },
                  {
                    icon: Mic,
                    label: "Hesitation pauses",
                    value: `${stats.avgPauses} avg per session`,
                    good: stats.avgPauses <= 3,
                  },
                  {
                    icon: MessageSquare,
                    label: "Sessions logged",
                    value: `${stats.sessionCount} total`,
                    good: stats.sessionCount >= 1,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                      <r.icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 text-[12.5px] text-foreground/85">{r.label}</div>
                    <div className="flex items-center gap-1.5">
                      {r.good ? (
                        <CheckCircle2 className="h-3 w-3 text-[oklch(0.74_0.16_160)]" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-[oklch(0.80_0.14_80)]" />
                      )}
                      <span
                        className={`font-mono text-[12px] ${r.good ? "text-[oklch(0.78_0.16_160)]" : "text-[oklch(0.82_0.14_80)]"}`}
                      >
                        {r.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-b border-border px-5 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Session Log
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="py-3 font-medium">Mode</th>
                      <th className="py-3 font-medium">Company</th>
                      <th className="py-3 font-medium">Diff</th>
                      <th className="py-3 font-medium">Dur</th>
                      <th className="py-3 font-medium">Comm</th>
                      <th className="py-3 font-medium">Fillers</th>
                      <th className="px-5 py-3 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-border transition hover:bg-surface-2/40"
                      >
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatRelativeSessionDate(r.timestamp, r.date)}
                        </td>
                        <td className="py-3 capitalize text-muted-foreground">
                          {r.mode ?? "text"}
                        </td>
                        <td className="py-3 font-medium text-foreground">{r.company}</td>
                        <td className="py-3">
                          <Badge
                            tone={
                              r.difficulty === "Easy"
                                ? "success"
                                : r.difficulty === "Medium"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {r.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {r.duration}
                        </td>
                        <td className="py-3 font-mono text-muted-foreground">
                          {r.communicationScore}%
                        </td>
                        <td
                          className={`py-3 font-mono ${r.fillerWords <= 3 ? "text-[oklch(0.78_0.16_160)]" : r.fillerWords <= 7 ? "text-[oklch(0.82_0.14_80)]" : "text-[oklch(0.74_0.20_25)]"}`}
                        >
                          {r.fillerWords}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-mono font-semibold ${r.overallScore >= 80 ? "text-[oklch(0.78_0.16_160)]" : r.overallScore >= 65 ? "text-[oklch(0.82_0.14_80)]" : "text-[oklch(0.74_0.20_25)]"}`}
                        >
                          {r.overallScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {(stats.recentStrengths.length > 0 || stats.recentWeaknesses.length > 0) && (
            <section className="mt-4 grid gap-4 md:grid-cols-2">
              {stats.recentStrengths.length > 0 && (
                <Card>
                  <CardHeader title="Recent strengths" />
                  <ul className="space-y-2 px-1">
                    {stats.recentStrengths.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-[oklch(0.74_0.16_160/0.15)] bg-[oklch(0.74_0.16_160/0.05)] p-3 text-[12.5px] text-foreground/85"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {stats.recentWeaknesses.length > 0 && (
                <Card>
                  <CardHeader title="Recent focus areas" />
                  <ul className="space-y-2 px-1">
                    {stats.recentWeaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-[oklch(0.80_0.14_80/0.15)] bg-[oklch(0.80_0.14_80/0.05)] p-3 text-[12.5px] text-foreground/85"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
