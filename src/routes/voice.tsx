import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, CardHeader, ProgressBar } from "@/components/ui-bits";
import {
  Camera, Mic, MicOff, VideoOff, Play, Square, ChevronRight,
  Brain, Zap, AlertCircle, CheckCircle2, Clock, BarChart3,
  MessageSquare, Target, TrendingUp, Award, RefreshCw, Building2,
  Activity, Volume2, Loader2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useOnlineTranscription } from "@/hooks/useOnlineTranscription";
import type { InterviewQuestion } from "@/lib/interview-types";
import {
  buildInterviewerReply,
  formatOpeningQuestion,
  formatSessionClosing,
  type InterviewerCompany,
} from "@/lib/interviewer-dialogue";
import {
  analyzeSpeech,
  averageMetrics,
  metricsFromEvaluation,
  type SpeechMetrics,
} from "@/lib/speech-metrics";
import { persistInterviewSession } from "@/lib/session-persistence";
import { formatSessionDuration } from "@/lib/interview-storage";
import type { InterviewHistoryEntry } from "@/lib/interview-types";

export const Route = createFileRoute("/voice")({ component: CameraInterviewPage });

// ─── Types ────────────────────────────────────────────────────────────────────

type InterviewPhase = "setup" | "active" | "thinking" | "feedback";
type Company = "Google" | "Amazon" | "Microsoft" | "Meta" | "Apple" | "Stripe";
type Difficulty = "Easy" | "Medium" | "Hard";

interface Message {
  from: "ai" | "user";
  text: string;
  timestamp: number;
}

interface FeedbackReport {
  overallScore: number;
  communicationScore: number;
  pacingScore: number;
  clarityScore: number;
  technicalScore: number;
  fillerWordCount: number;
  pauseCount: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  transcript: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVIEW_QUESTIONS: Record<Company | "General", Record<Difficulty, { question: string; followUps: string[] }[]>> = {
  General: {
    Easy: [
      { question: "I'd like you to reverse a linked list — talk me through your approach and complexity as you go.", followUps: ["What changes if you do it iteratively vs recursively?", "How would you detect and handle a cycle?"] },
      { question: "When would you reach for a stack versus a queue? Give me a real scenario for each.", followUps: ["How would you implement a queue using only stacks — and what's the cost?"] },
    ],
    Medium: [
      { question: "Given integers and a target sum, how would you find two numbers that add up — walk me through the approach you'd use in an interview.", followUps: ["What if multiple pairs are valid?", "How do duplicates in the array affect your logic?", "What's the invariant in your hash-map solution?"] },
      { question: "Longest substring without repeating characters — how would you attack that?", followUps: ["Why does sliding window fit here?", "What breaks if the input isn't ASCII?"] },
    ],
    Hard: [
      { question: "Design an LRU cache with O(1) get and put — what data structures and invariants do you need?", followUps: ["Why doubly linked list plus hash map?", "How would you make this thread-safe under contention?", "What if entries need TTL expiry?"] },
      { question: "Median from a data stream in real time — how would you structure that?", followUps: ["Why two heaps — walk me through rebalance.", "How does memory grow if the stream never ends?"] },
    ],
  },
  Google: {
    Easy: [{ question: "How do you decide if a binary tree is balanced — and what does 'balanced' mean to you?", followUps: ["Height-balanced vs weight-balanced — when does each matter?"] }],
    Medium: [{ question: "You've got a grid of 0s and 1s — how would you count islands? Talk me through it.", followUps: ["BFS or DFS — which would you ship and why?", "What if the grid doesn't fit in memory?"] }],
    Hard: [{ question: "Sketch autocomplete at Google scale — ranking, data structures, and what you'd optimize first.", followUps: ["Trie vs sorted structures for prefixes?", "How would you personalize without killing latency?"] }],
  },
  Amazon: {
    Easy: [{ question: "Two pointers — when is it the right tool, and when does it fall apart?", followUps: ["Give me a case where you'd pick something else."] }],
    Medium: [{ question: "Order processing for a marketplace — what are the core services and failure modes?", followUps: ["Payment fails mid-checkout — what happens?", "How do you keep inventory from overselling?"] }],
    Hard: [{ question: "Recommendation engine at Amazon scale — how would you architect it?", followUps: ["Collaborative vs content-based — tradeoffs?", "Cold start for a brand-new user?"] }],
  },
  Microsoft: {
    Easy: [{ question: "Process vs thread — when do you choose each in production?", followUps: ["What does context switch cost you in practice?"] }],
    Medium: [{ question: "Design a file system — key abstractions and data structures.", followUps: ["Concurrent writes to the same file?", "What does your inode/metadata story look like?"] }],
    Hard: [{ question: "Distributed KV on Azure — consistency, availability, and partition behavior.", followUps: ["Network partition — what do clients see?", "Replication: sync vs async — your call and why."] }],
  },
  Meta: {
    Easy: [{ question: "Cycle in a linked list — how do you detect it, and can you find where it starts?", followUps: ["Walk me through Floyd's logic step by step."] }],
    Medium: [{ question: "News feed ranking — high level architecture and what you'd measure.", followUps: ["Celebrity with 50M followers — fan-out strategy?", "How do you avoid stale or spammy content dominating?"] }],
    Hard: [{ question: "Realtime chat at WhatsApp scale — delivery guarantees and architecture.", followUps: ["User offline for days — how do you catch up?", "E2E encryption — what changes in your design?"] }],
  },
  Apple: {
    Easy: [{ question: "GC vs ARC — when does each make sense on Apple platforms?", followUps: ["Retain cycles — how do you spot and break them?"] }],
    Medium: [{ question: "Photo sync like iCloud — hardest problems and how you'd solve them.", followUps: ["Conflict when two devices edit the same asset?", "Deduplication without hashing every byte on device?"] }],
    Hard: [{ question: "Privacy-preserving analytics — collect signal without exposing raw user data.", followUps: ["Differential privacy in plain language?", "Where does on-device ML help vs hurt?"] }],
  },
  Stripe: {
    Easy: [{ question: "Idempotency in payment APIs — why it matters and how you'd implement it.", followUps: ["Idempotency keys — lifecycle and storage."] }],
    Medium: [{ question: "Rate limiting Stripe's public API — algorithm and multi-region story.", followUps: ["Token bucket vs sliding window under burst traffic?", "Distributed limiter — how do you keep counts consistent?"] }],
    Hard: [{ question: "Realtime fraud on card charges — signals, latency budget, and false positives.", followUps: ["How do you tune precision vs recall live?", "Model refresh without taking risk offline?"] }],
  },
};

function saveVoiceSession(
  report: FeedbackReport,
  company: Company,
  difficulty: Difficulty,
  durationSeconds: number,
) {
  const completedAt = Date.now();
  const entry: InterviewHistoryEntry = {
    id: `voice-${completedAt}`,
    date: new Date(completedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    timestamp: completedAt,
    company,
    difficulty,
    category: "DSA",
    mode: "voice",
    duration: formatSessionDuration(durationSeconds),
    overallScore: report.overallScore,
    communicationScore: report.communicationScore,
    confidenceScore: report.communicationScore,
    correctnessScore: report.technicalScore,
    optimizationScore: report.technicalScore,
    fillerWords: report.fillerWordCount,
    clarityScore: report.clarityScore,
    pacingScore: report.pacingScore,
    technicalScore: report.technicalScore,
    pauseCount: report.pauseCount,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    recommendations: report.recommendations,
    transcript: report.transcript,
  };
  persistInterviewSession(entry);
}

function generateFeedbackReport(
  transcript: string,
  allMetrics: SpeechMetrics[],
  durationSeconds: number,
  questionCount: number,
): FeedbackReport {
  const metrics = averageMetrics(allMetrics);
  const overall = Math.round(
    metrics.clarityScore * 0.25 +
      metrics.confidenceScore * 0.25 +
      metrics.pacingScore * 0.2 +
      metrics.technicalScore * 0.3,
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (metrics.pacingScore >= 80) strengths.push("Excellent speaking pace — easy to follow");
  if (metrics.clarityScore >= 80) strengths.push("Clear and structured communication");
  if (metrics.technicalScore >= 80) strengths.push("Strong technical depth in explanations");
  if (metrics.fillerCount <= 3) strengths.push("Minimal filler words — confident delivery");
  if (metrics.wpm >= 130 && metrics.wpm <= 170) strengths.push("Natural conversational rhythm");
  if (questionCount >= 2) strengths.push("Engaged with follow-up questions effectively");

  if (metrics.fillerCount > 5) weaknesses.push(`High filler word usage (${metrics.fillerCount} instances): ${metrics.fillerWords.slice(0, 3).join(", ")}`);
  if (metrics.pauseCount > 3) weaknesses.push(`${metrics.pauseCount} noticeable hesitation pauses detected`);
  if (metrics.wpm < 100) weaknesses.push("Speaking pace was too slow — may signal uncertainty");
  if (metrics.wpm > 200) weaknesses.push("Speaking pace was too fast — harder to follow");
  if (metrics.clarityScore < 65) weaknesses.push("Answer structure could be clearer — try problem → approach → complexity format");
  if (metrics.technicalScore < 65) weaknesses.push("Technical explanations lacked depth — elaborate on trade-offs");

  if (metrics.fillerCount > 3) recommendations.push("Practice the 'pause instead of filler' technique — silence is more confident than 'um'");
  if (metrics.pacingScore < 70) recommendations.push("Record yourself and aim for 130–170 WPM for technical explanations");
  if (metrics.technicalScore < 75) recommendations.push("Structure answers as: approach → complexity → edge cases → optimization");
  recommendations.push("Do 2–3 mock interviews per week to build muscle memory for clear articulation");
  if (durationSeconds < 60) recommendations.push("Aim for 90–120 second answers — elaborate on your reasoning more");

  return {
    overallScore: overall,
    communicationScore: metrics.confidenceScore,
    pacingScore: metrics.pacingScore,
    clarityScore: metrics.clarityScore,
    technicalScore: metrics.technicalScore,
    fillerWordCount: metrics.fillerCount,
    pauseCount: metrics.pauseCount,
    strengths: strengths.length ? strengths : ["Completed the interview — great first step"],
    weaknesses: weaknesses.length ? weaknesses : ["No major issues detected"],
    recommendations,
    transcript,
  };
}

// ─── AI Interviewer Logic ─────────────────────────────────────────────────────

function getAIThinkingDelay(): number {
  return 1200 + Math.random() * 1000;
}

// ─── useContinuousSpeech ─────────────────────────────────────────────────────
// Browser SpeechRecognition — kept as a secondary live-display layer.
// The actual transcript is produced by the online Whisper API on stop.

function useContinuousSpeech(onFinal: (text: string) => void, onInterim: (text: string) => void) {
  const recRef    = useRef<SpeechRecognition | null>(null);
  const activeRef = useRef(false);
  const onFinalRef   = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  useEffect(() => { onFinalRef.current = onFinal; },   [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
    );
  });

  const getSR = () =>
    (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR || activeRef.current) return;
    activeRef.current = true;

    function session() {
      if (!activeRef.current) return;
      try { recRef.current?.abort(); } catch { /* ignore */ }
      const SR2 = getSR();
      if (!SR2) return;
      const rec = new SR2();
      rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
      recRef.current = rec;
      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t + " "; else interim += t;
        }
        if (final) onFinalRef.current(final);
        onInterimRef.current(interim);
      };
      rec.onend = () => { if (activeRef.current) setTimeout(session, 80); };
      rec.onerror = () => { /* non-fatal, onend restarts */ };
      try { rec.start(); } catch { if (activeRef.current) setTimeout(session, 300); }
    }
    session();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    activeRef.current = false;
    onInterimRef.current("");
    try { recRef.current?.abort(); } catch { /* ignore */ }
    recRef.current = null;
  }, []);

  useEffect(() => () => { activeRef.current = false; try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  return { isSupported, start, stop };
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({ company, setCompany, difficulty, setDifficulty, onStart }: {
  company: Company; setCompany: (c: Company) => void;
  difficulty: Difficulty; setDifficulty: (d: Difficulty) => void;
  onStart: () => void;
}) {
  const companies: Company[] = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Stripe"];
  const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

  return (
    <div className="mx-auto max-w-2xl animate-in-up">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-surface)] p-8 text-center">
        <div aria-hidden className="absolute inset-0 [background:var(--gradient-glow)]" />
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] shadow-[0_0_40px_-8px_oklch(0.78_0.14_295/0.6)]">
            <Camera className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-[32px] text-foreground">Live AI Camera Interview</h2>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Real-time webcam interview with AI analysis of your communication, pacing, and technical depth.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Company Track" />
          <div className="grid grid-cols-3 gap-2">
            {companies.map((c) => (
              <button key={c} onClick={() => setCompany(c)}
                className={`rounded-lg border px-2 py-2.5 text-[12px] font-medium transition hover:-translate-y-0.5 ${company === c ? "border-primary/50 bg-primary/10 text-foreground shadow-[var(--shadow-glow)]" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Difficulty" />
          <div className="flex flex-col gap-2">
            {difficulties.map((d) => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-[13px] font-medium transition ${
                  difficulty === d
                    ? d === "Easy" ? "border-[oklch(0.74_0.16_160/0.5)] bg-[oklch(0.74_0.16_160/0.08)] text-[oklch(0.78_0.16_160)]"
                    : d === "Medium" ? "border-[oklch(0.80_0.14_80/0.5)] bg-[oklch(0.80_0.14_80/0.08)] text-[oklch(0.82_0.14_80)]"
                    : "border-[oklch(0.66_0.21_25/0.5)] bg-[oklch(0.66_0.21_25/0.08)] text-[oklch(0.74_0.20_25)]"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                <span className={`h-2 w-2 rounded-full ${d === "Easy" ? "bg-[oklch(0.74_0.16_160)]" : d === "Medium" ? "bg-[oklch(0.80_0.14_80)]" : "bg-[oklch(0.66_0.21_25)]"}`} />
                {d}
                <span className="ml-auto text-[11px] opacity-60">{d === "Easy" ? "~20 min" : d === "Medium" ? "~35 min" : "~50 min"}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { icon: Camera, label: "Webcam required", desc: "Live video feed for immersive experience" },
          { icon: Mic, label: "Microphone required", desc: "Real-time speech transcription & analysis" },
          { icon: Brain, label: "AI Interviewer", desc: "Adaptive follow-ups based on your answers" },
        ].map((f) => (
          <div key={f.label} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[12.5px] font-medium text-foreground">{f.label}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button size="md" className="px-8 py-3 text-[14px]" onClick={onStart}>
          <Play className="h-4 w-4" /> Start Camera Interview
        </Button>
      </div>
    </div>
  );
}

// ─── Waveform Visualizer ──────────────────────────────────────────────────────

function WaveformVisualizer({ active, analyserRef }: { active: boolean; analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (active && analyserRef.current) {
        const bufLen = analyserRef.current.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyserRef.current.getByteFrequencyData(data);
        const barW = (W / bufLen) * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const barH = (data[i] / 255) * H * 0.85;
          const alpha = 0.4 + (data[i] / 255) * 0.6;
          ctx.fillStyle = `oklch(0.78 0.14 295 / ${alpha})`;
          ctx.beginPath();
          ctx.roundRect(x, H - barH, barW - 1, barH, 2);
          ctx.fill();
          x += barW + 1;
        }
      } else {
        const bars = 48;
        const barW = W / bars - 1;
        for (let i = 0; i < bars; i++) {
          const h = 4 + Math.abs(Math.sin(i * 0.5 + Date.now() * 0.002)) * 12;
          ctx.fillStyle = "oklch(0.78 0.14 295 / 0.2)";
          ctx.beginPath();
          ctx.roundRect(i * (barW + 1), H / 2 - h / 2, barW, h, 2);
          ctx.fill();
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyserRef]);

  return <canvas ref={canvasRef} width={400} height={48} className="h-12 w-full" />;
}

// ─── Confidence Meter ─────────────────────────────────────────────────────────

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 75 ? "oklch(0.74 0.16 160)" : value >= 50 ? "oklch(0.80 0.14 80)" : "oklch(0.66 0.21 25)";
  const label = value >= 75 ? "High" : value >= 50 ? "Medium" : "Low";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="6" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 201} 201`}
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.2,.7,.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[16px] font-semibold leading-none" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Confidence · {label}</span>
    </div>
  );
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { seconds, formatted: fmt(seconds) };
}

// ─── Active Interview Screen ──────────────────────────────────────────────────

function ActiveInterview({ company, difficulty, onComplete }: {
  company: Company;
  difficulty: Difficulty;
  onComplete: (report: FeedbackReport, durationSeconds: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking">("idle");

  const [messages, setMessages] = useState<Message[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState<SpeechMetrics>({
    fillerCount: 0, fillerWords: [], pauseCount: 0, wpm: 0,
    clarityScore: 85, confidenceScore: 80, pacingScore: 78, technicalScore: 75,
  });
  const [allMetrics, setAllMetrics] = useState<SpeechMetrics[]>([]);
  const allMetricsRef = useRef<SpeechMetrics[]>([]);

  const { seconds, formatted: timerFormatted } = useTimer(isRecording);
  const answerTimerRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // These refs let the speech callbacks always see the latest state
  // without being stale closures.
  const currentAnswerRef = useRef("");
  const phaseRef = useRef<"idle" | "listening" | "thinking">("idle");

  const questionBank = INTERVIEW_QUESTIONS[company]?.[difficulty] ?? INTERVIEW_QUESTIONS.General[difficulty];
  const currentQ = questionBank[questionIndex % questionBank.length];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, phase]);

  // Keep refs in sync with state
  useEffect(() => { currentAnswerRef.current = currentAnswer; }, [currentAnswer]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const activeQuestion: InterviewQuestion = {
    id: `voice-${questionIndex}`,
    text: currentQ.question,
    category: "DSA",
    difficulty,
    tags: [],
    followUps: currentQ.followUps,
    hints: [],
  };

  // ── Online transcription (OpenRouter Whisper + DeepSeek evaluation) ──────────
  const whisper = useOnlineTranscription({
    question: activeQuestion,
    durationSeconds: Math.max(seconds - answerTimerRef.current, 5),
  });

  // Mirror live interim captions into the transcript display while recording
  useEffect(() => {
    if (whisper.isListening && whisper.liveText) {
      setLiveTranscript(whisper.liveText);
    }
  }, [whisper.liveText, whisper.isListening]);

  // ── Browser speech (fallback captions when online transcription is not active) ─
  const onFinal = useCallback((text: string) => {
    if (!whisper.isListening) {
      setCurrentAnswer((prev) => prev + text);
      setFullTranscript((prev) => prev + text);
    }
  }, [whisper.isListening]);

  const onInterim = useCallback((text: string) => {
    if (!whisper.isListening) setLiveTranscript(text);
  }, [whisper.isListening]);

  const speech = useContinuousSpeech(onFinal, onInterim);

  // ── Camera init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(
        window.location.protocol === "http:" && window.location.hostname !== "localhost"
          ? "Camera access requires HTTPS. Open this page over https:// or run it on localhost."
          : "Your browser doesn't support camera access. Try Chrome or Edge.",
      );
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      .then((stream) => {
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
        const ac = new AudioContext();
        audioContextRef.current = ac;
        const analyser = ac.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ac.createMediaStreamSource(stream).connect(analyser);
        setCamReady(true);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCamError("Camera/mic permission denied. Click the camera icon in your browser's address bar and allow access, then refresh.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCamError("No camera or microphone found. Plug one in and refresh.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCamError("Camera is already in use by another app. Close it and refresh.");
        } else {
          setCamError(`Could not start camera: ${err.message || err.name}`);
        }
      });

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

// ── Interview flow ────────────────────────────────────────────────────────────

const beginListening = useCallback(async () => {
  try {
    console.log("[Interview] Starting recording...");

    setCurrentAnswer("");
    setLiveTranscript("");
    answerTimerRef.current = seconds;

    await whisper.startRecording();

    console.log("[Interview] Recording started");

    setPhase("listening");
  } catch (err) {
    console.error("[Interview] Failed to start recording:", err);
    setPhase("idle");
  }
}, [seconds, whisper]);

const startInterview = useCallback(() => {
  setIsRecording(true);
  setPhase("thinking");
  setMessages([]);
  setCurrentAnswer("");
  setFullTranscript("");
  setAllMetrics([]);
  allMetricsRef.current = [];
  setLiveMetrics({
    fillerCount: 0,
    fillerWords: [],
    pauseCount: 0,
    wpm: 0,
    clarityScore: 85,
    confidenceScore: 80,
    pacingScore: 78,
    technicalScore: 75,
  });

  whisper.resetResult();

  setTimeout(async () => {
    setMessages([
      {
        from: "ai",
        text: formatOpeningQuestion(
          company as InterviewerCompany,
          questionBank[0].question,
        ),
        timestamp: Date.now(),
      },
    ]);

    await beginListening();
  }, getAIThinkingDelay());
}, [company, questionBank, whisper, beginListening]);

const submitAnswer = useCallback(async () => {
  if (phase !== "listening") return;

  setPhase("thinking");

  const elapsed = Math.max(seconds - answerTimerRef.current, 5);
  answerTimerRef.current = seconds;

  console.log("[Interview] Stopping recording...");

  const transcription = await whisper.stopRecording();
  const rawAnswer = transcription?.transcript?.trim() ?? "";
  const evaluation = transcription?.evaluation ?? null;

  let answer = rawAnswer.trim();

  if (!answer) {
    speech.stop();
    answer = (currentAnswerRef.current + " " + liveTranscript).trim();
  }

  setCurrentAnswer("");
  setLiveTranscript("");

  if (!answer) {
    console.warn("[Interview] No transcript captured");
    setPhase("idle");
    return;
  }

  const metrics = evaluation
    ? metricsFromEvaluation(answer, elapsed, evaluation)
    : analyzeSpeech(answer, elapsed);

  setLiveMetrics(metrics);
  setAllMetrics((prev) => {
    const next = [...prev, metrics];
    allMetricsRef.current = next;
    return next;
  });

  setQuestionCount((c) => c + 1);

  setMessages((prev) => [
    ...prev,
    {
      from: "user",
      text: answer,
      timestamp: Date.now(),
    },
  ]);

  const newFull = (fullTranscript + " " + answer).trim();

  setFullTranscript(newFull);

  const currentCount = questionCount;

  setTimeout(async () => {
    if (currentCount >= 3) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: formatSessionClosing(company as InterviewerCompany),
          timestamp: Date.now(),
        },
      ]);

      setPhase("idle");

      setTimeout(() => {
        onComplete(
          generateFeedbackReport(
            newFull,
            allMetricsRef.current,
            seconds,
            currentCount + 1,
          ),
          seconds,
        );
      }, 2000);

      return;
    }

    const useFollowUp =
      followUpIndex < currentQ.followUps.length && currentCount % 2 === 0;

    let nextMsg: string;

    if (useFollowUp) {
      nextMsg = buildInterviewerReply({
        company: company as InterviewerCompany,
        answer,
        followUps: currentQ.followUps,
        followUpIndex,
        mode: "follow_up",
        scores: evaluation
          ? {
              correctness: evaluation.correctnessScore,
              communication: evaluation.communicationScore,
            }
          : undefined,
      });
      setFollowUpIndex((i) => i + 1);
    } else {
      const nextQ =
        questionBank[(questionIndex + 1) % questionBank.length];

      nextMsg = buildInterviewerReply({
        company: company as InterviewerCompany,
        answer,
        followUps: currentQ.followUps,
        followUpIndex,
        mode: "new_question",
        nextQuestionText: nextQ.question,
        scores: evaluation
          ? {
              correctness: evaluation.correctnessScore,
              communication: evaluation.communicationScore,
            }
          : undefined,
      });

      setQuestionIndex((i) => i + 1);
      setFollowUpIndex(0);
    }

    setMessages((prev) => [
      ...prev,
      {
        from: "ai",
        text: nextMsg,
        timestamp: Date.now(),
      },
    ]);

    await beginListening();
  }, getAIThinkingDelay());
}, [
  phase,
  whisper,
  speech,
  liveTranscript,
  seconds,
  fullTranscript,
 questionCount,
  followUpIndex,
  currentQ,
  questionBank,
  questionIndex,
  company,
  onComplete,
  beginListening,
]);

const endInterview = useCallback(async () => {
  setPhase("thinking");

  let extra = "";
  let finalAnswerMetrics: SpeechMetrics | null = null;

  if (whisper.isListening) {
    const transcription = await whisper.stopRecording();
    extra = transcription?.transcript?.trim() ?? "";
    const evaluation = transcription?.evaluation ?? null;
    const elapsed = Math.max(seconds - answerTimerRef.current, 5);

    if (extra) {
      finalAnswerMetrics = evaluation
        ? metricsFromEvaluation(extra, elapsed, evaluation)
        : analyzeSpeech(extra, elapsed);
    }
  } else {
    speech.stop();
    extra = currentAnswerRef.current.trim();
    if (extra) {
      finalAnswerMetrics = analyzeSpeech(
        extra,
        Math.max(seconds - answerTimerRef.current, 5),
      );
    }
  }

  const transcript =
    ((fullTranscript + " " + extra).trim()) ||
    "No transcript recorded.";

  let metricsForReport = allMetricsRef.current;
  if (finalAnswerMetrics) {
    metricsForReport = [...metricsForReport, finalAnswerMetrics];
    setLiveMetrics(finalAnswerMetrics);
    setAllMetrics(metricsForReport);
    allMetricsRef.current = metricsForReport;
  }

  if (metricsForReport.length === 0) {
    metricsForReport = [
      analyzeSpeech(transcript, Math.max(seconds, 10)),
    ];
  }

  onComplete(
    generateFeedbackReport(
      transcript,
      metricsForReport,
      seconds,
      questionCount,
    ),
    seconds,
  );
}, [
  whisper,
  speech,
  fullTranscript,
  seconds,
  questionCount,
  onComplete,
]);

const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicMuted(!micMuted); }
  };
  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(!camOff); }
  };

  // ── Error screen ──────────────────────────────────────────────────────────────
  if (camError) {
    const isHttps = camError.includes("HTTPS");
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[oklch(0.66_0.21_25/0.3)] bg-[oklch(0.66_0.21_25/0.06)] p-12 text-center">
        <AlertCircle className="h-10 w-10 text-[oklch(0.74_0.20_25)]" />
        <div className="font-display text-[22px]">{isHttps ? "HTTPS Required" : "Camera Access Required"}</div>
        <p className="max-w-sm text-[13px] text-muted-foreground">{camError}</p>
        {isHttps ? (
          <p className="max-w-sm rounded-lg border border-border bg-surface-2/60 px-4 py-3 font-mono text-[12px] text-foreground/70">
            Try opening: <span className="text-primary">http://localhost:3000</span>
          </p>
        ) : (
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  }

  // ── Error banners ─────────────────────────────────────────────────────────────
  const transcriptionErrorBanner = whisper.error && (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-[oklch(0.80_0.14_80/0.3)] bg-[oklch(0.80_0.14_80/0.06)] px-4 py-3 text-[12.5px] text-[oklch(0.82_0.14_80)]">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Transcription error: {whisper.error} — browser speech fallback is active.
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {transcriptionErrorBanner}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* LEFT — Camera + Transcript */}
        <div className="flex flex-col gap-4">
          {/* Camera Feed */}
          <Card className="relative overflow-hidden p-0">
            <div className="relative aspect-video w-full bg-[oklch(0.10_0.01_270)] rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline
                className={`h-full w-full object-cover transition-opacity duration-300 ${camOff ? "opacity-0" : "opacity-100"}`} />

              {camOff && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <VideoOff className="h-10 w-10 text-muted-foreground/50" />
                  <span className="text-[12px] text-muted-foreground">Camera off</span>
                </div>
              )}
              {!camReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-[12px] text-muted-foreground">Requesting camera access…</span>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[oklch(0.66_0.21_25/0.4)] bg-background/80 px-3 py-1.5 backdrop-blur-sm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[oklch(0.66_0.21_25)]" />
                  <span className="text-[11px] font-medium text-[oklch(0.74_0.20_25)]">REC {timerFormatted}</span>
                </div>
              )}

              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur-sm">
                <Building2 className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium text-foreground">{company} · {difficulty}</span>
              </div>

              {phase === "listening" && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-primary/40 bg-background/85 px-4 py-2 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                  <span className="text-[11.5px] font-medium text-primary">
                    {whisper.isListening ? "Recording…" : "Listening…"}
                  </span>
                </div>
              )}

              {whisper.isProcessing && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-background/85 px-4 py-2 backdrop-blur-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[11.5px] text-muted-foreground">Transcribing…</span>
                </div>
              )}

              {phase === "thinking" && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-background/85 px-4 py-2 backdrop-blur-sm">
                  <span className="text-[11.5px] text-muted-foreground">Alex is thinking</span>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      style={{ animation: `inUp 0.9s ${i * 0.15}s infinite alternate` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="flex gap-2">
                <button onClick={toggleMic}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${micMuted ? "border-[oklch(0.66_0.21_25/0.4)] bg-[oklch(0.66_0.21_25/0.1)] text-[oklch(0.74_0.20_25)]" : "border-border text-muted-foreground hover:text-foreground"}`}
                  title={micMuted ? "Unmute" : "Mute"}>
                  {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button onClick={toggleCam}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${camOff ? "border-[oklch(0.66_0.21_25/0.4)] bg-[oklch(0.66_0.21_25/0.1)] text-[oklch(0.74_0.20_25)]" : "border-border text-muted-foreground hover:text-foreground"}`}
                  title={camOff ? "Turn on camera" : "Turn off camera"}>
                  {camOff ? <VideoOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                {!isRecording ? (
                  <Button size="sm" onClick={startInterview} disabled={!camReady}>
                    <Play className="h-3.5 w-3.5" /> Start Interview
                  </Button>
                ) : (
                  <>
                    {phase === "listening" && (
                      <Button size="sm" onClick={submitAnswer}>
                        <ChevronRight className="h-3.5 w-3.5" /> Submit Answer
                      </Button>
                    )}
                    {phase === "idle" && (
                      <Button size="sm" onClick={beginListening}>
                        <Mic className="h-3.5 w-3.5" /> Start Answering
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={endInterview}>
                      <Square className="h-3.5 w-3.5" /> End
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Waveform + transcript */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Audio · Live Transcript</span>
              </div>
              {phase === "listening" && <Badge tone="success"><Activity className="h-3 w-3" /> Live</Badge>}
              {whisper.isListening && <Badge tone="info">Recording</Badge>}
              {whisper.isProcessing && <Badge tone="primary"><Loader2 className="h-3 w-3 animate-spin" /> Transcribing</Badge>}
              {!whisper.isListening && !whisper.isProcessing && speech.isSupported && phase === "listening" && <Badge tone="warning">Browser</Badge>}
            </div>
            <WaveformVisualizer active={phase === "listening"} analyserRef={analyserRef} />
            <div className="mt-3 min-h-[60px] rounded-lg border border-border bg-surface-2/40 p-3 text-[13px] leading-relaxed">
              {currentAnswer && <p className="text-foreground/85">{currentAnswer}</p>}
              {liveTranscript && (
                <p className="text-muted-foreground italic">
                  {liveTranscript}
                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary" />
                </p>
              )}
              {!currentAnswer && !liveTranscript && (
                <p className="text-muted-foreground/50 text-[12px]">
                  {whisper.isProcessing
                    ? "Transcribing your answer via Whisper…"
                    : isRecording
                      ? phase === "listening"
                        ? whisper.isListening
                          ? "Recording your answer — speak clearly…"
                          : "Speak your answer…"
                        : "Waiting for Alex…"
                      : "Interview not started yet."}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT — AI Interviewer + Analytics */}
        <div className="flex flex-col gap-4">
          {/* AI Interviewer Panel */}
          <Card className="flex flex-col p-0">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] text-[15px] font-semibold text-primary-foreground shadow-[0_0_20px_-4px_oklch(0.78_0.14_295/0.6)]">
                A
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-[oklch(0.74_0.16_160)]" />
              </div>
              <div className="leading-tight">
                <div className="text-[13.5px] font-semibold">Alex</div>
                <div className="text-[11.5px] text-muted-foreground">AI Interviewer · {company} track</div>
              </div>
              {phase === "thinking" && <Badge tone="primary" className="ml-auto">Thinking…</Badge>}
              {phase === "listening" && <Badge tone="success" className="ml-auto">● {whisper.isListening ? "Recording" : "Listening"}</Badge>}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "300px" }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Brain className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-[12px] text-muted-foreground">Alex is ready. Start the interview to begin.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${m.from === "user" ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md border border-border bg-surface-2/60 text-foreground/90"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {phase === "thinking" && (
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-surface-2/60 px-3.5 py-2.5 w-fit">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      style={{ animation: `inUp 0.9s ${i * 0.15}s infinite alternate` }} />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </Card>

          {/* Session + Confidence */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <CardHeader title="Session" action={<Clock className="h-3.5 w-3.5 text-muted-foreground" />} />
                <div className="font-display text-[40px] leading-none text-foreground">{timerFormatted}</div>
                <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  {questionCount} answer{questionCount !== 1 ? "s" : ""} · {isRecording ? "In progress" : "Not started"}
                </div>
                {isRecording && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[oklch(0.66_0.21_25)]" />
                    <span className="text-[11.5px] text-muted-foreground">Recording</span>
                  </div>
                )}
              </div>
              <ConfidenceMeter value={liveMetrics.confidenceScore} />
            </div>
          </Card>

          {/* Live Speech Analytics */}
          <Card>
            <CardHeader title="Live Speech Analytics" action={<BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />} />
            <div className="space-y-3">
              {[
                { label: "Clarity", value: liveMetrics.clarityScore, tone: "success" as const },
                { label: "Confidence", value: liveMetrics.confidenceScore, tone: "primary" as const },
                { label: `Pace (${liveMetrics.wpm || "—"} wpm)`, value: liveMetrics.pacingScore, tone: "info" as const },
                { label: `Pauses (~${liveMetrics.pauseCount})`, value: Math.max(0, 100 - liveMetrics.pauseCount * 8), tone: "warning" as const },
                { label: `Fillers (${liveMetrics.fillerCount})`, value: Math.max(0, 100 - liveMetrics.fillerCount * 10), tone: "warning" as const },
                { label: "Technical depth", value: liveMetrics.technicalScore, tone: "primary" as const },
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
            {liveMetrics.fillerWords.length > 0 && (
              <div className="mt-3 rounded-lg border border-[oklch(0.80_0.14_80/0.2)] bg-[oklch(0.80_0.14_80/0.05)] p-3">
                <div className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-[oklch(0.82_0.14_80)]">Detected fillers</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {liveMetrics.fillerWords.map((f, i) => (
                    <span key={i} className="rounded-full border border-[oklch(0.80_0.14_80/0.3)] bg-[oklch(0.80_0.14_80/0.08)] px-2 py-0.5 text-[11px] text-[oklch(0.82_0.14_80)]">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Report Screen ───────────────────────────────────────────────────

function FeedbackScreen({
  report,
  company,
  difficulty,
  durationSeconds,
  onRestart,
  onSaved,
}: {
  report: FeedbackReport;
  company: Company;
  difficulty: Difficulty;
  durationSeconds: number;
  onRestart: () => void;
  onSaved?: () => void;
}) {
  const scoreColor = (s: number) => s >= 80 ? "text-[oklch(0.78_0.16_160)]" : s >= 60 ? "text-[oklch(0.82_0.14_80)]" : "text-[oklch(0.74_0.20_25)]";
  const scoreTone = (s: number): "success" | "warning" | "danger" => s >= 80 ? "success" : s >= 60 ? "warning" : "danger";

  return (
    <div className="animate-in-up space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-surface)] p-8">
        <div aria-hidden className="absolute inset-0 [background:var(--gradient-glow)]" />
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-2 text-center md:flex-row md:text-left md:gap-8">
          <div className="flex flex-col items-center">
            <div className={`font-display text-[72px] leading-none ${scoreColor(report.overallScore)}`}>{report.overallScore}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Overall Score</div>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-[28px] text-foreground">Interview Complete</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {report.overallScore >= 80 ? "Excellent performance. Strong communication and technical depth."
                : report.overallScore >= 60 ? "Good effort. A few areas to polish before your real interview."
                : "Keep practicing. Focus on the recommendations below to improve quickly."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="primary"><Clock className="h-3 w-3" /> {report.fillerWordCount} filler words</Badge>
              <Badge tone={report.pauseCount > 3 ? "warning" : "success"}><Zap className="h-3 w-3" /> {report.pauseCount} pauses</Badge>
              <Badge tone="info"><MessageSquare className="h-3 w-3" /> {report.transcript.split(/\s+/).filter(Boolean).length} words spoken</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Communication", value: report.communicationScore, icon: MessageSquare },
          { label: "Pacing", value: report.pacingScore, icon: TrendingUp },
          { label: "Clarity", value: report.clarityScore, icon: Target },
          { label: "Technical Depth", value: report.technicalScore, icon: Brain },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className={`mt-2 font-display text-[36px] leading-none ${scoreColor(s.value)}`}>{s.value}</div>
            <div className="mt-2"><ProgressBar value={s.value} tone={scoreTone(s.value)} /></div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Strengths" action={<CheckCircle2 className="h-4 w-4 text-[oklch(0.74_0.16_160)]" />} />
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[oklch(0.74_0.16_160/0.15)] bg-[oklch(0.74_0.16_160/0.06)] p-3 text-[12.5px]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.74_0.16_160)]" />
                <span className="text-foreground/85">{s}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Areas to Improve" action={<AlertCircle className="h-4 w-4 text-[oklch(0.80_0.14_80)]" />} />
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[oklch(0.80_0.14_80/0.15)] bg-[oklch(0.80_0.14_80/0.06)] p-3 text-[12.5px]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.80_0.14_80)]" />
                <span className="text-foreground/85">{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Personalized Coaching Recommendations" action={<Award className="h-4 w-4 text-primary" />} />
        <div className="grid gap-2 md:grid-cols-2">
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/40 p-3.5">
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</div>
              <span className="text-[12.5px] text-foreground/85">{r}</span>
            </div>
          ))}
        </div>
      </Card>

      {report.transcript && (
        <Card>
          <CardHeader title="Session Transcript" hint="Your full spoken answers" />
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-2/40 p-4 text-[12.5px] leading-relaxed text-foreground/75">
            {report.transcript || "No transcript recorded."}
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="md" onClick={onRestart}><RefreshCw className="h-4 w-4" /> New Interview</Button>
        <Button
          size="md"
          onClick={() => {
            saveVoiceSession(report, company, difficulty, durationSeconds);
            onSaved?.();
          }}
        >
          <BarChart3 className="h-4 w-4" /> Save to History
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CameraInterviewPage() {
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [company, setCompany] = useState<Company>("Amazon");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const handleStart = () => setPhase("active");
  const handleComplete = (r: FeedbackReport, durationSeconds: number) => {
    setSessionDuration(durationSeconds);
    setReport(r);
    setPhase("feedback");
    saveVoiceSession(r, company, difficulty, durationSeconds);
  };
  const handleRestart = () => {
    setReport(null);
    setSessionDuration(0);
    setPhase("setup");
    setSessionKey((k) => k + 1);
  };

  const badgeContent =
    phase === "active" ? <Badge tone="success">● Live Session</Badge>
    : phase === "feedback" ? <Badge tone="primary"><Award className="h-3 w-3" /> Report Ready</Badge>
    : <Badge tone="info"><Camera className="h-3 w-3" /> Camera Mode</Badge>;

  return (
    <AppShell eyebrow="Live Interview" title="Live AI Camera Interview" actions={badgeContent}>
      {phase === "setup" && (
        <SetupScreen company={company} setCompany={setCompany} difficulty={difficulty} setDifficulty={setDifficulty} onStart={handleStart} />
      )}
      {phase === "active" && (
        <ActiveInterview key={sessionKey} company={company} difficulty={difficulty} onComplete={handleComplete} />
      )}
      {phase === "feedback" && report && (
        <FeedbackScreen
          report={report}
          company={company}
          difficulty={difficulty}
          durationSeconds={sessionDuration}
          onRestart={handleRestart}
        />
      )}
    </AppShell>
  );
}
