import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, CardHeader, ProgressBar } from "@/components/ui-bits";
import {
  Sparkles,
  Send,
  Brain,
  Target,
  Mic,
  Camera,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/copilot")({ component: CoachPage });

function CoachPage() {
  return (
    <AppShell
      eyebrow="AI Coach"
      title="Interview Coach"
      actions={
        <Badge tone="primary">
          <Sparkles className="h-3 w-3" /> Memory active
        </Badge>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* CHAT */}
        <Card>
          <CardHeader
            title="Ask your coach"
            hint="Remembers your past sessions, weak spots, and communication patterns."
          />
          <div className="space-y-3">
            {[
              {
                from: "user",
                text: "How did I do in my last Amazon interview? What should I work on?",
              },
              {
                from: "ai",
                text: "Your Amazon session scored 84 overall — strong communication (88%) but your pacing dropped when explaining the system design trade-offs. You used 'basically' 4 times and paused before answering the scalability follow-up. Focus on: 1) structuring system design answers with a clear framework, 2) replacing filler words with deliberate pauses.",
              },
              { from: "user", text: "Can you give me a quick warm-up question for Google Hard?" },
              {
                from: "ai",
                text: "Sure. Design Google's autocomplete system. Focus on the trie data structure, ranking algorithm, and how you'd personalize results per user at scale. Walk me through your approach — I'll give feedback on your communication clarity as you explain.",
              },
            ].map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    m.from === "user"
                      ? "rounded-br-md bg-foreground text-background"
                      : "rounded-bl-md border border-border bg-surface-2/60 text-foreground/90"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-end gap-2 rounded-xl border border-border bg-surface-2 p-2 transition-colors focus-within:border-primary/40">
            <textarea
              rows={1}
              placeholder="Ask about your performance, get coaching, or request a practice question…"
              className="flex-1 resize-none bg-transparent px-2 py-2 text-[13px] outline-none placeholder:text-muted-foreground"
            />
            <Button size="sm">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Review my last session",
              "What are my weak spots?",
              "Give me a hard question",
              "How can I reduce filler words?",
            ].map((q) => (
              <button
                key={q}
                className="rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-[11.5px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* What the coach knows */}
          <Card>
            <CardHeader title="What I know about you" hint="Built from your interview sessions." />
            <ul className="space-y-2.5 text-[12.5px]">
              {[
                {
                  icon: Brain,
                  label: "Strong: hash maps, sliding window, greedy",
                  tone: "text-[oklch(0.78_0.16_160)]",
                },
                {
                  icon: Target,
                  label: "Weak: system design depth, DP optimization",
                  tone: "text-[oklch(0.82_0.14_80)]",
                },
                {
                  icon: Mic,
                  label: "Comm: clear but uses 'basically' often",
                  tone: "text-[oklch(0.82_0.14_80)]",
                },
                {
                  icon: TrendingUp,
                  label: "Trend: improving — +9% over last 6 sessions",
                  tone: "text-[oklch(0.78_0.16_160)]",
                },
              ].map((r) => (
                <li
                  key={r.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/40 p-3"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
                    <r.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={r.tone}>{r.label}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Communication scores */}
          <Card>
            <CardHeader title="Your communication profile" />
            <div className="space-y-3">
              {[
                { label: "Clarity", value: 82, tone: "success" as const },
                { label: "Confidence", value: 74, tone: "primary" as const },
                { label: "Pacing", value: 78, tone: "info" as const },
                { label: "Filler control", value: 68, tone: "warning" as const },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-mono text-foreground">{m.value}%</span>
                  </div>
                  <ProgressBar value={m.value} tone={m.tone} />
                </div>
              ))}
            </div>
          </Card>

          {/* Top coaching tips */}
          <Card>
            <CardHeader title="Top coaching tips" />
            <div className="space-y-2">
              {[
                {
                  icon: CheckCircle2,
                  text: "Pause 1–2s before answering — it signals confidence",
                  good: true,
                },
                {
                  icon: AlertCircle,
                  text: "Replace 'basically' with a direct statement",
                  good: false,
                },
                {
                  icon: AlertCircle,
                  text: "State complexity before explaining the approach",
                  good: false,
                },
                {
                  icon: CheckCircle2,
                  text: "Your hash map explanations are clear — keep it up",
                  good: true,
                },
              ].map((t, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-[12.5px] ${
                    t.good
                      ? "border-[oklch(0.74_0.16_160/0.2)] bg-[oklch(0.74_0.16_160/0.05)]"
                      : "border-[oklch(0.80_0.14_80/0.2)] bg-[oklch(0.80_0.14_80/0.05)]"
                  }`}
                >
                  <t.icon
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${t.good ? "text-[oklch(0.74_0.16_160)]" : "text-[oklch(0.80_0.14_80)]"}`}
                  />
                  <span className="text-foreground/85">{t.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* PRACTICE CTA */}
      <section className="mt-4">
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.06] p-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-display text-[20px] text-foreground">
                Ready to put coaching into practice?
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Start a live camera interview and apply what you've learned.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/voice">
                <Button size="md">
                  <Camera className="h-4 w-4" /> Camera Interview
                </Button>
              </Link>
              <Link to="/interview">
                <Button variant="outline" size="md">
                  <ChevronRight className="h-4 w-4" /> Text Mode
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
