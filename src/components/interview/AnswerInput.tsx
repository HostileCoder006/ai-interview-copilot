import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Loader2, AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

// ─── AnswerInput ──────────────────────────────────────────────────────────────

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
  isEvaluating: boolean;
}

export function AnswerInput({ onSubmit, disabled, isEvaluating }: AnswerInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Sync speech transcript into the text field
  useEffect(() => {
    if (finalTranscript) {
      setText((prev) => {
        const base = prev.trimEnd();
        return base ? base + " " + finalTranscript.trim() : finalTranscript.trim();
      });
    }
  }, [finalTranscript]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text, interimTranscript]);

  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  const handleSubmit = useCallback(() => {
    const combined = (text + " " + interimTranscript).trim();
    if (!combined || disabled) return;
    if (isListening) stopListening();
    resetTranscript();
    onSubmit(combined);
    setText("");
  }, [text, interimTranscript, disabled, isListening, stopListening, resetTranscript, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayText = text;
  const hasContent = displayText.trim() || interimTranscript.trim();

  return (
    <div className="border-t border-border bg-background/40 p-4 backdrop-blur-sm">
      {/* Speech error */}
      {speechError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[oklch(0.80_0.14_80/0.3)] bg-[oklch(0.80_0.14_80/0.06)] px-3 py-2 text-[12px] text-[oklch(0.82_0.14_80)]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {speechError}
        </div>
      )}

      {/* Live transcript preview */}
      {isListening && interimTranscript && (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary">
              Live transcription
            </span>
          </div>
          <p className="text-[12.5px] italic text-muted-foreground leading-relaxed">
            {interimTranscript}
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary" />
          </p>
        </div>
      )}

      {/* Input row */}
      <div
        className={`flex items-end gap-2 rounded-xl border bg-surface-2 p-2 transition-all duration-200 ${
          isListening
            ? "border-primary/50 shadow-[0_0_0_3px_oklch(0.78_0.14_295/0.12)]"
            : "border-border focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_oklch(0.78_0.14_295/0.08)]"
        }`}
      >
        {/* Mic button */}
        {isSupported && (
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={disabled}
            title={isListening ? "Stop recording" : "Start voice input"}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all ${
              isListening
                ? "bg-primary text-primary-foreground shadow-[0_0_16px_oklch(0.78_0.14_295/0.5)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            } disabled:opacity-40`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={displayText}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isListening
              ? "Speaking… (or type to add text)"
              : "Type your answer… or click the mic to speak (Enter to submit)"
          }
          className="flex-1 resize-none bg-transparent px-1 py-2 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
          style={{ minHeight: "36px", maxHeight: "160px" }}
        />

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasContent || disabled}
          title="Submit answer (Enter)"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-foreground text-background transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
        >
          {isEvaluating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-2 px-1 text-[10.5px] text-muted-foreground/60">
        {isSupported
          ? "Press Enter to submit · Shift+Enter for new line · Click mic for voice"
          : "Press Enter to submit · Shift+Enter for new line"}
      </p>
    </div>
  );
}
