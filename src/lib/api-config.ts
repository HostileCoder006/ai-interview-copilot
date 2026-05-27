// OpenRouter API configuration.
// API keys live in .env only. Never commit real keys.

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Whisper large v3 - OpenRouter speech-to-text */
export const TRANSCRIPTION_MODEL = "openai/whisper-large-v3";

/** Fallback if the primary STT model is unavailable */
export const TRANSCRIPTION_MODEL_FALLBACK = "openai/whisper-1";

/** DeepSeek v4 flash - structured interview evaluation */
export const EVALUATION_MODEL = "deepseek/deepseek-v4-flash";
