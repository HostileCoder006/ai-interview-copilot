// ─── Core Interview Types ─────────────────────────────────────────────────────
// Shared across hooks, components, and routes.
// Designed to be swapped for real API shapes when OpenAI/Gemini is integrated.

export type InterviewStatus = "idle" | "active" | "evaluating" | "complete";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Category = "DSA" | "System Design" | "OOP" | "Behavioral";

export interface InterviewQuestion {
  id: string;
  text: string;
  category: Category;
  difficulty: Difficulty;
  tags: string[];
  /** Follow-up prompts the AI can use based on the answer quality */
  followUps: string[];
  /** Hints revealed progressively */
  hints: string[];
}

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: number;
  /** Only present on user messages after evaluation */
  evaluation?: EvaluationResult;
}

export interface EvaluationResult {
  /** 0–100 */
  correctnessScore: number;
  communicationScore: number;
  confidenceScore: number;
  optimizationScore: number;
  overallScore: number;
  missingPoints: string[];
  incorrectStatements: string[];
  strengths: string[];
  weaknesses: string[];
  suggestion: string;
  improvedAnswer: string;
  /** The follow-up question Alex will ask next */
  followUp: string | null;
}

export interface InterviewSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  company: string;
  difficulty: Difficulty;
  category: Category;
  messages: ChatMessage[];
  finalScore?: number;
}

export type InterviewMode = "voice" | "text";

export interface InterviewHistoryEntry {
  id: string;
  date: string;
  timestamp?: number;
  company: string;
  difficulty: Difficulty;
  category: Category;
  mode?: InterviewMode;
  duration: string;
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  correctnessScore: number;
  optimizationScore: number;
  fillerWords: number;
  clarityScore?: number;
  pacingScore?: number;
  technicalScore?: number;
  wpm?: number;
  pauseCount?: number;
  topFillers?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  missingPoints?: string[];
  transcript?: string;
}
