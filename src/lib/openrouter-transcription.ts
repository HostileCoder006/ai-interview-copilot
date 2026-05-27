import { OPENROUTER_BASE_URL } from "./api-config";

const SUPPORTED_FORMATS = new Set(["wav", "mp3", "flac", "m4a", "ogg", "webm", "aac"]);

export type TranscriptionApiResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string; detail: string };

function bytesToBase64(bytes: Uint8Array): string {
  const bufferCtor = (
    globalThis as { Buffer?: { from: (u: Uint8Array) => { toString: (enc: string) => string } } }
  ).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function audioFormatFromFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "m4a";
  if (ext && SUPPORTED_FORMATS.has(ext)) return ext;

  const type = file.type.toLowerCase();
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("wav")) return "wav";
  if (type.includes("flac")) return "flac";
  if (type.includes("aac")) return "aac";
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";

  return "webm";
}

export async function transcribeWithOpenRouter(options: {
  audio: File;
  apiKey: string;
  model: string;
}): Promise<TranscriptionApiResult> {
  const bytes = new Uint8Array(await options.audio.arrayBuffer());
  if (bytes.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Empty audio file.",
      detail: "",
    };
  }

  const format = audioFormatFromFile(options.audio);
  const data = bytesToBase64(bytes);

  const response = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://ai-copilot-interviews.app",
      "X-Title": "AI Copilot Technical Interviews",
    },
    body: JSON.stringify({
      model: options.model,
      input_audio: { data, format },
      language: "en",
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `Transcription failed: ${response.status}`,
      detail: raw,
    };
  }

  let payload: { text?: string };
  try {
    payload = JSON.parse(raw) as { text?: string };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "Invalid transcription response.",
      detail: raw.slice(0, 500),
    };
  }

  return { ok: true, text: payload.text?.trim() ?? "" };
}
