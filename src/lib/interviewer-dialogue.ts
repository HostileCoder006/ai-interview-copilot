// ─── Interviewer dialogue engine ─────────────────────────────────────────────
// Natural, adaptive FAANG-style interviewer lines (no UI coupling).

export type InterviewerCompany =
  | "Google"
  | "Amazon"
  | "Microsoft"
  | "Meta"
  | "Apple"
  | "Stripe"
  | "General";

export interface AnswerSignals {
  wordCount: number;
  hasComplexity: boolean;
  hasEdgeCases: boolean;
  hasOptimization: boolean;
  hasTradeoffs: boolean;
  hasScalability: boolean;
  hasBruteForce: boolean;
  hasDataStructure: boolean;
  hasExamples: boolean;
  looksLikeSystemDesign: boolean;
}

export interface InterviewerReplyInput {
  company: InterviewerCompany;
  answer: string;
  followUps: string[];
  followUpIndex: number;
  mode: "follow_up" | "new_question";
  nextQuestionText?: string;
  scores?: {
    correctness?: number;
    communication?: number;
  };
}

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function joinParts(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

export function analyzeAnswerSignals(answer: string): AnswerSignals {
  const lower = answer.toLowerCase();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;

  return {
    wordCount,
    hasComplexity:
      /\bo\(|complexity|big.?o|time complexity|space complexity|linear|logn|quadratic/i.test(lower),
    hasEdgeCases: /edge|null|empty|corner|boundary|overflow|duplicate|off.?by|invalid/i.test(lower),
    hasOptimization:
      /optim|better|faster|reduce|improve|hash|heap|trie|dp|dynamic programming|memo/i.test(lower),
    hasTradeoffs:
      /trade.?off|versus|vs\.|downside|cost|cons\b|latency|throughput|availability|consistency/i.test(
        lower,
      ),
    hasScalability:
      /scale|shard|replicat|partition|load balanc|million|billion|distributed|cache|queue|kafka|cdn/i.test(
        lower,
      ),
    hasBruteForce: /brute|naive|nested loop|try every/i.test(lower),
    hasDataStructure: /array|list|tree|graph|map|set|stack|queue|heap|trie|linked/i.test(lower),
    hasExamples: /example|for instance|say we|dry run|walk through|imagine/i.test(lower),
    looksLikeSystemDesign:
      /api|database|service|component|deploy|reliab|fault|storage|schema|microservice/i.test(lower),
  };
}

function reactionPrefix(signals: AnswerSignals, scores?: InterviewerReplyInput["scores"]): string {
  const strong = (scores?.correctness ?? 0) >= 78 || (scores?.communication ?? 0) >= 78;
  const weak = (scores?.correctness ?? 100) < 55 || signals.wordCount < 25;

  if (weak) {
    return pickOne([
      "I need a bit more signal here.",
      "I'm not fully following yet — help me out.",
      "Let's slow down and go deeper on this part.",
      "Okay — I want more substance before we move on.",
    ]);
  }

  if (strong && signals.hasExamples) {
    return pickOne([
      "Nice — that example helped.",
      "Okay, that tracks.",
      "Good, I follow the reasoning.",
      "Makes sense so far.",
      "Right — that's the direction I'd expect.",
    ]);
  }

  if (strong) {
    return pickOne(["Okay.", "Got it.", "Alright.", "Fair enough.", "Understood."]);
  }

  return pickOne([
    "Okay.",
    "I see where you're going.",
    "Alright — walk me through that once more.",
    "Hmm — let's pressure-test that a bit.",
  ]);
}

const DEPTH_PROBES = {
  complexity: [
    "What's the time and space complexity, and can you justify it step by step?",
    "Before we go further — what's the Big-O here, and what drives the dominant term?",
    "How does runtime change as input size grows? Be specific.",
  ],
  edgeCases: [
    "What breaks this approach? Walk me through the edge cases you'd test in an onsite.",
    "If this went to production tomorrow, what inputs would make it fail?",
    "What about empty input, duplicates, or pathological cases — how do you handle those?",
  ],
  optimization: [
    "You hinted at a heavier approach — how would you optimize it, and what's the tradeoff?",
    "If latency mattered at p99, what would you change first?",
    "Can we do better than the naive solution? What structure or invariant unlocks that?",
  ],
  tradeoffs: [
    "What tradeoffs are you making — consistency vs availability, memory vs speed, simplicity vs scale?",
    "If product asked for faster iteration vs stronger correctness, what would you sacrifice?",
    "Compare two reasonable designs here — why pick one over the other?",
  ],
  scalability: [
    "How does this behave at 10x traffic? What becomes the bottleneck?",
    "Where would you shard, cache, or async — and what failure modes appear?",
    "If QPS jumped overnight, what's your scaling plan in the first 30 minutes?",
  ],
  depth: [
    "Can you go one level deeper on the implementation details?",
    "What invariant are you maintaining in the core loop or data structure?",
    "How would you explain this to a junior engineer on the team in two minutes?",
  ],
  examples: [
    "Walk me through a concrete example — small input, then a slightly nasty one.",
    "Dry-run your approach on paper for me with real numbers.",
  ],
} as const;

function pickDeepProbe(signals: AnswerSignals, followUps: string[], followUpIndex: number): string {
  const bank = followUps[followUpIndex % Math.max(followUps.length, 1)];

  if (signals.wordCount < 30) {
    return pickOne([
      "I need more than a high-level sketch — talk me through your approach and why it's correct.",
      "Expand on the core idea: data structure, algorithm, and why it works.",
      joinParts([pickOne(DEPTH_PROBES.examples), bank ? `Also: ${bank}` : ""]),
    ]);
  }

  if (!signals.hasComplexity) {
    return pickOne(DEPTH_PROBES.complexity);
  }

  if (!signals.hasEdgeCases) {
    return pickOne(DEPTH_PROBES.edgeCases);
  }

  if (signals.hasBruteForce && !signals.hasOptimization) {
    return pickOne(DEPTH_PROBES.optimization);
  }

  if (signals.looksLikeSystemDesign && !signals.hasScalability) {
    return pickOne(DEPTH_PROBES.scalability);
  }

  if (signals.looksLikeSystemDesign && !signals.hasTradeoffs) {
    return pickOne(DEPTH_PROBES.tradeoffs);
  }

  if (!signals.hasExamples && signals.wordCount < 80) {
    return pickOne(DEPTH_PROBES.examples);
  }

  if (bank) {
    return pickOne([
      bank,
      joinParts([pickOne(["One more thing —", "Quick follow-up —", "Let me push on this:"]), bank]),
      joinParts([pickOne(DEPTH_PROBES.depth), bank]),
    ]);
  }

  return pickOne([
    ...DEPTH_PROBES.tradeoffs,
    ...DEPTH_PROBES.optimization,
    ...DEPTH_PROBES.scalability,
    ...DEPTH_PROBES.depth,
  ]);
}

function transitionToNewQuestion(company: InterviewerCompany, question: string): string {
  const lead = pickOne([
    "Let's switch problems.",
    "Different topic —",
    "I want to try another one.",
    "Okay, new question for you.",
    "Let's change gears.",
    "Next one:",
    "Alright — here's another scenario.",
  ]);

  const companyFlavor: Partial<Record<InterviewerCompany, string[]>> = {
    Google: ["Think about correctness first, then how you'd operate this at Google scale."],
    Amazon: ["Keep the customer impact in mind — what fails first under load?"],
    Microsoft: ["Assume this ships to enterprise customers — reliability matters."],
    Meta: ["Picture billions of events — where does this design strain?"],
    Apple: ["Assume tight latency and privacy constraints on device and cloud."],
    Stripe: ["Money movement is unforgiving — call out idempotency and failure handling."],
  };

  const flavor = companyFlavor[company];
  const tail = flavor ? pickOne(flavor) : "";

  return joinParts([lead, question, tail]);
}

export function formatOpeningQuestion(company: InterviewerCompany, question: string): string {
  const intro = pickOne([
    "Thanks for joining — I'll drive today like a real onsite.",
    "Hi — I'll ask a few technical questions and dig in where it matters.",
    "Good to meet you. We'll do a typical technical loop — depth over buzzwords.",
    "Alright — let's jump in. I'll probe until I'm confident in your reasoning.",
  ]);

  const framed = pickOne([
    `To start: ${question}`,
    `First question: ${question}`,
    `Let's begin with this — ${question}`,
    question.endsWith("?") ? question : `${question}?`,
  ]);

  const companyNote =
    company !== "General"
      ? pickOne([
          `I'll calibrate to a ${company} bar — push back if I'm unclear.`,
          `I'll interview at roughly a ${company} level — ask clarifying questions anytime.`,
        ])
      : "";

  return joinParts([intro, framed, companyNote]);
}

export function formatSessionClosing(company: InterviewerCompany): string {
  const base = pickOne([
    "That's time — I have enough to write up feedback on communication and technical depth.",
    "We'll stop here. I'll synthesize how you structured answers and handled follow-ups.",
    "Good stopping point. I'll put together notes on clarity, depth, and tradeoff thinking.",
    "Okay — wrapping the technical portion. I'll score this like a real loop debrief.",
  ]);

  const companyTail =
    company !== "General"
      ? pickOne([
          `Think about what you'd tighten before a ${company} onsite.`,
          `Compare your answers to the bar you'd want at ${company}.`,
        ])
      : "";

  return joinParts([base, companyTail]);
}

export function buildInterviewerReply(input: InterviewerReplyInput): string {
  const signals = analyzeAnswerSignals(input.answer);
  const prefix = reactionPrefix(signals, input.scores);

  if (input.mode === "new_question" && input.nextQuestionText) {
    const transition = transitionToNewQuestion(input.company, input.nextQuestionText);
    return pickOne([
      joinParts([prefix, transition]),
      transition,
      joinParts([prefix, pickOne(["", "Thanks."]), transition]),
    ]);
  }

  const probe = pickDeepProbe(signals, input.followUps, input.followUpIndex);
  return joinParts([prefix, probe]);
}
