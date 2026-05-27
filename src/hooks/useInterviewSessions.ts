import { useEffect, useState } from "react";
import type { InterviewHistoryEntry } from "@/lib/interview-types";
import { getStoredInterviewSessions, subscribeToInterviewSessions } from "@/lib/interview-storage";

export function useInterviewSessions(): InterviewHistoryEntry[] {
  const [sessions, setSessions] = useState<InterviewHistoryEntry[]>(() =>
    typeof window !== "undefined" ? getStoredInterviewSessions() : [],
  );

  useEffect(() => {
    const sync = () => setSessions(getStoredInterviewSessions());
    sync();
    return subscribeToInterviewSessions(sync);
  }, []);

  return sessions;
}
