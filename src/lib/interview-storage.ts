import type { InterviewHistoryEntry } from "./interview-types";

const STORAGE_KEY = "interviewai.sessions.v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getStoredInterviewSessions(): InterviewHistoryEntry[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as InterviewHistoryEntry[];
  } catch {
    return [];
  }
}

export function saveInterviewSession(entry: InterviewHistoryEntry) {
  if (!canUseStorage()) return;

  const sessions = getStoredInterviewSessions();
  const next = [entry, ...sessions.filter((session) => session.id !== entry.id)].slice(0, 50);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("interview-sessions-updated"));
}

export function subscribeToInterviewSessions(callback: () => void) {
  if (!canUseStorage()) return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener("interview-sessions-updated", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("interview-sessions-updated", callback);
  };
}

export function formatSessionDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function formatSessionDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
