import { useCallback, useRef, useState } from "react";
import type { EvaluationResult, InterviewQuestion } from "@/lib/interview-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  transcript: string;
  evaluation: EvaluationResult | null;
}

export type RecordingState =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "error";

export interface UseOnlineTranscriptionOptions {
  question: InterviewQuestion;
  durationSeconds?: number;
}

export interface UseOnlineTranscriptionReturn {
  recordingState: RecordingState;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<TranscriptionResult | null>;
  result: TranscriptionResult | null;
  resetResult: () => void;
  isListening: boolean;
  isProcessing: boolean;
  liveText: string;
}

// ---------------------------------------------------------------------------
// MIME type helper
// ---------------------------------------------------------------------------

function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "audio/webm";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnlineTranscription({
  question,
  durationSeconds = 5,
}: UseOnlineTranscriptionOptions): UseOnlineTranscriptionReturn {
  const [recordingState, setRecordingState] =
    useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef(durationSeconds);
  const stopResolveRef = useRef<
    ((value: TranscriptionResult | null) => void) | null
  >(null);

  durationRef.current = durationSeconds;

  const isListening = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  const stopRecording = useCallback((): Promise<TranscriptionResult | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      chunksRef.current = [];
      setRecordingState("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
        video: false,
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording failed");
        setRecordingState("error");
        stream.getTracks().forEach((t) => t.stop());
        stopResolveRef.current?.(null);
        stopResolveRef.current = null;
      };

      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          const actualMimeType = recorder.mimeType || mimeType;
          const blob = new Blob(chunksRef.current, { type: actualMimeType });

          if (blob.size === 0) {
            setError("No audio captured");
            setRecordingState("error");
            stopResolveRef.current?.(null);
            stopResolveRef.current = null;
            return;
          }

          setRecordingState("processing");

          const formData = new FormData();
          const ext = actualMimeType.includes("ogg") ? "ogg" : "webm";
          formData.append("audio", blob, `recording.${ext}`);
          formData.append("question", JSON.stringify(question));
          formData.append(
            "durationSeconds",
            String(Math.max(durationRef.current, 5)),
          );

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60_000);

          const response = await fetch("/api/transcribe-and-evaluate", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            const text = await response.text();
            throw new Error(
              `Server error ${response.status}: ${text.slice(0, 200)}`,
            );
          }

          const data = (await response.json()) as TranscriptionResult;
          setResult(data);
          setRecordingState("idle");
          stopResolveRef.current?.(data);
          stopResolveRef.current = null;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          setError(
            message === "The user aborted a request."
              ? "Transcription timed out. Try a shorter answer."
              : message,
          );
          setRecordingState("error");
          stopResolveRef.current?.(null);
          stopResolveRef.current = null;
        }
      };

      recorder.start(250);
      setRecordingState("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone error",
      );
      setRecordingState("error");
    }
  }, [question]);

  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
    setRecordingState("idle");
  }, []);

  return {
    recordingState,
    error,
    startRecording,
    stopRecording,
    result,
    resetResult,
    isListening,
    isProcessing,
    liveText: "",
  };
}
