import { useState, useRef, useCallback, useEffect } from "react";

// ─── useSpeechRecognition ─────────────────────────────────────────────────────
// Wraps the browser Web Speech API with a clean React interface.
//
// TODO: Replace with Whisper API for higher accuracy:
//   - Record audio via MediaRecorder
//   - On stop, POST the Blob to POST /api/transcribe
//   - Stream back the transcript via SSE or return full text

export interface SpeechRecognitionState {
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Currently listening */
  isListening: boolean;
  /** Interim (not-yet-final) transcript shown in real time */
  interimTranscript: string;
  /** Accumulated final transcript for the current session */
  finalTranscript: string;
  /** Any error message */
  error: string | null;
}

export interface SpeechRecognitionControls {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionState & SpeechRecognitionControls {
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const SR =
    typeof window !== "undefined"
      ? ((window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
          .SpeechRecognition ??
        (
          window as unknown as {
            webkitSpeechRecognition?: typeof SpeechRecognition;
          }
        ).webkitSpeechRecognition)
      : undefined;

  const isSupported = Boolean(SR);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SR) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    // Stop any existing session first
    recognitionRef.current?.stop();

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }
      if (final) {
        setFinalTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed") {
        setError("Microphone permission denied. Allow mic access and try again.");
      } else if (e.error === "no-speech") {
        // Not a real error — just silence, ignore
      } else {
        setError(`Speech recognition error: ${e.error}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      rec.start();
    } catch {
      setError("Could not start speech recognition. Try refreshing.");
    }
  }, [SR]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
