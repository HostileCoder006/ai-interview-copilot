// ─── OpenRouter API Configuration ────────────────────────────────────────────
// API keys live in .env only (never commit keys here).
// See .env.example for variable names.

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Whisper large v3 — OpenRouter STT (JSON + base64 audio) */
export const TRANSCRIPTION_MODEL = "openai/whisper-large-v3";

/** Fallback if the primary STT model is unavailable */
export const TRANSCRIPTION_MODEL_FALLBACK = "openai/whisper-1";

/** DeepSeek v4 flash — fast, cheap, strong at structured JSON evaluation */
export const EVALUATION_MODEL = "deepseek/deepseek-v4-flash";
