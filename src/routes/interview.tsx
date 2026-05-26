import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useInterview } from "@/hooks/useInterview";
import { getRandomQuestion } from "@/lib/interview-questions";
import { ChatPanel } from "@/components/interview/ChatPanel";
import { AnswerInput } from "@/components/interview/AnswerInput";
import { InterviewSidebar } from "@/components/interview/InterviewSidebar";
import { FinalReport } from "@/components/interview/FinalReport";
import { HistorySection } from "@/components/interview/HistorySection";
import type { Category, Difficulty } from "@/lib/interview-types";
import { Camera, Sparkles, ChevronDown, History, Play, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/interview")({ component: InterviewPage });

// ─── Config selectors ─────────────────────────────────────────────────────────

const CATEGORIES: Category[] = ["DSA", "System Design", "OOP", "Behavioral"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const COMPANIES = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Stripe", "General"];

function Select<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-surface-2 pl-3 pr-8 text-[12.5px] text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── AIInterviewerHeader ──────────────────────────────────────────────────────

function AIInterviewerHeader({ company, status }: { company: string; status: string }) {
  const isLive = status === "active" || status === "evaluating";
  const isEval = status === "evaluating";

  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      {/* Avatar */}
      <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] text-[15px] font-semibold text-primary-foreground shadow-[0_0_20px_-4px_oklch(0.78_0.14_295/0.6)]">
        A
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card transition-colors ${
            isLive ? "bg-[oklch(0.74_0.16_160)]" : "bg-muted"
          }`}
        />
      </div>

      {/* Info */}
      <div className="leading-tight">
        <div className="text-[13.5px] font-semibold text-foreground">Alex</div>
        <div className="text-[11.5px] text-muted-foreground">AI Interviewer · {company} track</div>
      </div>

      {/* Status badge */}
      <div className="ml-auto">
        {isEval && (
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10.5px] font-medium text-primary">
            <Loader2 className="h-3 w-3 animate-spin" /> Evaluating…
          </span>
        )}
        {isLive && !isEval && (
          <span className="flex items-center gap-1.5 rounded-full border border-[oklch(0.74_0.16_160/0.3)] bg-[oklch(0.74_0.16_160/0.08)] px-2.5 py-1 text-[10.5px] font-medium text-[oklch(0.78_0.16_160)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.74_0.16_160)]" />
            Live
          </span>
        )}
        {status === "idle" && (
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10.5px] text-muted-foreground">
            Ready
          </span>
        )}
        {status === "complete" && (
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10.5px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Complete
          </span>
        )}
      </div>
    </div>
  );
}

// ─── InterviewPage ────────────────────────────────────────────────────────────

function InterviewPage() {
  const [category, setCategory] = useState<Category>("DSA");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [company, setCompany] = useState("Amazon");
  const [showHistory, setShowHistory] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  // Pick a question based on current config
  // useMemo so it only changes when config changes or session resets
  const question = useMemo(
    () => getRandomQuestion(category, difficulty),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, difficulty, sessionKey],
  );

  const {
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
  } = useInterview({ question, company });

  const handleRestart = () => {
    reset();
    setSessionKey((k) => k + 1);
  };

  const isActive = status === "active" || status === "evaluating";
  const isComplete = status === "complete";

  return (
    <AppShell
      eyebrow="Text Mode"
      title="Interview with Alex"
      actions={
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="hidden items-center gap-1.5 rounded-full border border-[oklch(0.74_0.16_160/0.3)] bg-[oklch(0.74_0.16_160/0.08)] px-2.5 py-1 text-[10.5px] font-medium text-[oklch(0.78_0.16_160)] md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[oklch(0.74_0.16_160)]" />
              Recording
            </span>
          )}
          <Link to="/voice">
            <button className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-3 text-[12px] font-medium text-foreground/85 transition hover:border-primary/40 hover:text-foreground md:inline-flex">
              <Camera className="h-3.5 w-3.5" /> Camera Mode
            </button>
          </Link>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition ${
              showHistory
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface/80 text-foreground/85 hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">History</span>
          </button>
        </div>
      }
    >
      {/* Camera mode nudge */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
        <Camera className="h-4 w-4 shrink-0 text-primary" />
        <p className="flex-1 text-[12.5px] text-foreground/85">
          For the full experience with webcam, live speech analysis, and communication coaching —
          try Camera Interview Mode.
        </p>
        <Link to="/voice">
          <button className="btn-glow h-8 rounded-lg px-3 text-[12px] font-semibold">
            <Camera className="h-3.5 w-3.5" /> Try Camera
          </button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* ── LEFT: Main interview panel ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Config row — only shown when idle */}
          {status === "idle" && (
            <div className="animate-in-up rounded-xl border border-border bg-surface-2/40 p-4">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Configure Session
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Category"
                  value={category}
                  options={CATEGORIES}
                  onChange={setCategory}
                />
                <Select
                  label="Difficulty"
                  value={difficulty}
                  options={DIFFICULTIES}
                  onChange={setDifficulty}
                />
                <Select
                  label="Company"
                  value={company}
                  options={COMPANIES}
                  onChange={(v) => setCompany(v)}
                />
              </div>
            </div>
          )}

          {/* Chat window */}
          {!isComplete && (
            <div
              className="surface-card flex flex-col overflow-hidden p-0"
              style={{ height: "calc(100vh - 340px)", minHeight: "480px" }}
            >
              <AIInterviewerHeader company={company} status={status} />

              <ChatPanel
                messages={messages}
                isEvaluating={isEvaluating}
                isStarted={status !== "idle"}
                isLoading={isLoading}
              />

              <AnswerInput
                onSubmit={submitAnswer}
                disabled={status !== "active"}
                isEvaluating={isEvaluating}
              />
            </div>
          )}

          {/* Final report */}
          {isComplete && (
            <FinalReport
              messages={messages}
              elapsedSeconds={elapsedSeconds}
              onRestart={handleRestart}
            />
          )}
        </div>

        {/* ── RIGHT: Sidebar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {showHistory ? (
            <div className="animate-in-up">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Interview History
                </span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-[11px] text-muted-foreground transition hover:text-foreground"
                >
                  Hide
                </button>
              </div>
              <HistorySection />
            </div>
          ) : (
            <InterviewSidebar
              question={question}
              status={status}
              elapsedSeconds={elapsedSeconds}
              questionCount={questionCount}
              latestEvaluation={currentEvaluation}
              liveMetrics={liveMetrics}
              onStart={startInterview}
              onEnd={endInterview}
            />
          )}

          {/* Restart button when complete */}
          {isComplete && !showHistory && (
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-[12.5px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> New Interview
            </button>
          )}

          {/* Start button shortcut when idle and sidebar is showing history */}
          {status === "idle" && !showHistory && (
            <button
              onClick={startInterview}
              className="btn-glow flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition active:scale-[0.98]"
            >
              <Play className="h-4 w-4" /> Start Interview
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
