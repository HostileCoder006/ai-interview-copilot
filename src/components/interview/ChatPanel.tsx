import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/interview-types";
import { ScoreCard } from "./ScoreCard";
import { Brain } from "lucide-react";

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-surface-2/60 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "ai";

  return (
    <div className={`flex flex-col gap-2 ${isAI ? "items-start" : "items-end"}`}>
      {/* Bubble */}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
          isAI
            ? "rounded-bl-md border border-border bg-surface-2/60 text-foreground/90"
            : "rounded-br-md bg-foreground text-background"
        }`}
      >
        {message.content}
      </div>

      {/* Evaluation card — shown below user messages */}
      {!isAI && message.evaluation && (
        <div className="w-full max-w-[92%]">
          <ScoreCard evaluation={message.evaluation} />
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[];
  isEvaluating: boolean;
  isStarted: boolean;
  isLoading: boolean;
}

export function ChatPanel({ messages, isEvaluating, isStarted, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isEvaluating]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 space-y-4">
      {/* Empty state */}
      {!isStarted && messages.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Brain className="h-7 w-7" />
          </div>
          <div className="font-display text-[20px] text-foreground">Ready when you are</div>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Click "Start Interview" to begin. Alex will ask you a technical question and evaluate
            your answer in real time.
          </p>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Evaluating indicator */}
      {isEvaluating && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}
