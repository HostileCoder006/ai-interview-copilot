import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ProgressBar,
  Sparkline,
  Stat,
} from "@/components/ui-bits";
import {
  Camera,
  Play,
  Flame,
  TrendingUp,
  ChevronRight,
  Clock,
  Mic,
  BarChart3,
  Zap,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useInterviewSessions } from "@/hooks/useInterviewSessions";
import { computeInterviewStats, formatRelativeSessionDate } from "@/lib/interview-history-utils";

export const Route = createFileRoute("/")({ component: Dashboard });

const companies = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Stripe"] as const;

function Dashboard() {
  const sessions = useInterviewSessions();
  const stats = computeInterviewStats(sessions);
  const recent = [...sessions].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5);

  const strengths =
    stats.recentStrengths.length > 0
      ? stats.recentStrengths
      : ["Complete a session to unlock personalized strengths"];
  const weaknesses =
    stats.recentWeaknesses.length > 0
      ? stats.recentWeaknesses
      : ["Your focus areas will appear after your first interview"];

  return (
    <AppShell
      eyebrow="Home"
      title="Ready to interview?"
      actions={
        <>
          {stats.streakDays > 0 && (
            <Badge tone="success">
              <Flame className="h-3 w-3" /> {stats.streakDays}-day streak
            </Badge>
          )}
          <Link to="/voice">
            <Button size="sm">
              <Camera className="h-3.5 w-3.5" /> Start Interview
            </Button>
          </Link>
        </>
      }
    >
      <section className="animate-in-up relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-surface)] p-8 md:p-10">
        <div
          aria-hidden
          className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_0%,#000,transparent)]"
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11.5px] font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              AI Interview Platform
            </div>
            <h2 className="font-display text-[38px] leading-[1.05] text-gradient md:text-[44px]">
              Practice like it&apos;s
              <br />
              the real thing.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Live camera or text mode — adaptive FAANG-style questions, real-time analytics, and
              session history that tracks your progress.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/voice">
                <Button size="md" className="gap-2">
                  <Camera className="h-4 w-4" /> Camera Interview
                </Button>
              </Link>
              <Link to="/interview">
                <Button variant="outline" size="md" className="gap-2">
                  <MessageSquare className="h-4 w-4" /> Text Interview
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <Stat
              label="Avg Score"
              value={stats.sessionCount ? String(stats.avgOverall) : "—"}
              accent="primary"
            />
            <Stat label="Sessions" value={String(stats.sessionCount)} accent="success" />
            <Stat
              label="Comm. Score"
              value={stats.sessionCount ? `${stats.avgCommunication}%` : "—"}
              accent="info"
            />
            <Stat
              label="Best"
              value={stats.sessionCount ? String(stats.bestScore) : "—"}
              accent="warning"
            />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="animate-in-up p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Recent Sessions
            </div>
            <Link
              to="/analytics"
              className="text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              View all <ChevronRight className="inline h-3 w-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No sessions yet. Start a camera or text interview to build your history.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2/40"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-[12px] font-bold text-primary">
                    {s.company[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                      <span>{s.company}</span>
                      <Badge tone={s.mode === "voice" ? "info" : "default"}>
                        {s.mode === "voice" ? "Camera" : "Text"}
                      </Badge>
                      <Badge
                        tone={
                          s.difficulty === "Easy"
                            ? "success"
                            : s.difficulty === "Medium"
                              ? "warning"
                              : "default"
                        }
                      >
                        {s.difficulty}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {s.duration}
                      <span>·</span>
                      {formatRelativeSessionDate(s.timestamp, s.date)}
                      {s.fillerWords > 0 && (
                        <>
                          <span>·</span>
                          <Mic className="h-3 w-3" />
                          {s.fillerWords} fillers
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-[15px] font-semibold ${
                        s.overallScore >= 80
                          ? "text-[oklch(0.78_0.16_160)]"
                          : s.overallScore >= 65
                            ? "text-[oklch(0.82_0.14_80)]"
                            : "text-[oklch(0.74_0.20_25)]"
                      }`}
                    >
                      {s.overallScore}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">score</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="animate-in-up">
            <CardHeader title="Quick Start" hint="Pick a company and jump in." />
            <div className="grid grid-cols-3 gap-2">
              {companies.map((c) => (
                <Link key={c} to="/voice">
                  <button className="w-full rounded-lg border border-border px-2 py-2.5 text-[12px] font-medium text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground">
                    {c}
                  </button>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="animate-in-up">
            <div className="flex items-start justify-between">
              <CardHeader
                title="Score Trend"
                hint={
                  stats.scoreTrend.length
                    ? `Last ${stats.scoreTrend.length} sessions`
                    : "Complete sessions to see trend"
                }
              />
              {stats.scoreTrend.length >= 2 &&
                stats.scoreTrend[stats.scoreTrend.length - 1]! >= stats.scoreTrend[0]! && (
                  <Badge tone="success">
                    <TrendingUp className="h-3 w-3" /> Improving
                  </Badge>
                )}
            </div>
            {stats.scoreTrend.length > 0 ? (
              <Sparkline points={stats.scoreTrend} tone="success" />
            ) : (
              <div className="flex h-16 items-center justify-center text-[12px] text-muted-foreground">
                No trend data yet
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-muted-foreground">Clarity</div>
                <div className="font-mono text-foreground">
                  {stats.sessionCount ? `${stats.avgClarity}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Pacing</div>
                <div className="font-mono text-foreground">
                  {stats.sessionCount ? `${stats.avgPacing}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Fillers</div>
                <div className="font-mono text-[oklch(0.82_0.14_80)]">
                  {stats.sessionCount ? `${stats.avgFillers} avg` : "—"}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Communication",
            value: stats.avgCommunication,
            tone: "success" as const,
            icon: Mic,
          },
          {
            label: "Technical Depth",
            value: stats.avgTechnical,
            tone: "primary" as const,
            icon: Zap,
          },
          {
            label: "Pacing",
            value: stats.avgPacing,
            tone: "info" as const,
            icon: BarChart3,
          },
          {
            label: "Confidence",
            value: stats.avgConfidence,
            tone: "warning" as const,
            icon: TrendingUp,
          },
        ].map((m) => (
          <Card key={m.label} className="animate-in-up">
            <div className="flex items-center justify-between">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 font-display text-[32px] leading-none text-foreground">
              {stats.sessionCount ? m.value : "—"}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {m.label}
            </div>
            <div className="mt-3">
              <ProgressBar value={stats.sessionCount ? m.value : 0} tone={m.tone} />
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="animate-in-up">
          <CardHeader
            title="What's working"
            action={<CheckCircle2 className="h-4 w-4 text-[oklch(0.74_0.16_160)]" />}
          />
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-[oklch(0.74_0.16_160/0.15)] bg-[oklch(0.74_0.16_160/0.05)] p-3 text-[12.5px]"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.74_0.16_160)]" />
                <span className="text-foreground/85">{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="animate-in-up">
          <CardHeader
            title="Focus areas"
            action={<AlertCircle className="h-4 w-4 text-[oklch(0.80_0.14_80)]" />}
          />
          <ul className="space-y-2">
            {weaknesses.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-[oklch(0.80_0.14_80/0.15)] bg-[oklch(0.80_0.14_80/0.05)] p-3 text-[12.5px]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.80_0.14_80)]" />
                <span className="text-foreground/85">{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-4">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] p-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-[22px] text-foreground">
                Your next interview is waiting.
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {stats.sessionCount > 0
                  ? `${stats.sessionCount} sessions logged · avg ${stats.avgOverall}/100`
                  : "Adaptive AI · Live analytics · Persistent history"}
              </p>
            </div>
            <Link to="/voice">
              <Button size="md" className="shrink-0">
                <Play className="h-4 w-4" /> Launch Interview
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
