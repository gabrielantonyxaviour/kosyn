"use client";

import { useState, useEffect, useCallback } from "react";
import { usePasskey } from "@/hooks/use-passkey";
import { getRecords } from "@/lib/demo-api";
import type { DemoRecord } from "@/app/api/demo/store";

export interface AiSession {
  sessionToken: string;
  expiresAt: number;
  patientAddress: string;
}

export type SessionState = "locked" | "authorizing" | "active" | "expired";

function formatHealthContext(records: DemoRecord[]): string {
  if (records.length === 0) return "No health records available.";
  return records
    .map((r) => {
      const header = `[${r.recordType.toUpperCase()}] ${r.label || r.templateType}`;
      if (!r.formData) return header;
      const fields = Object.entries(r.formData)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `${header}\n${fields}`;
    })
    .join("\n\n");
}

export function useAiSession(patientAddress: string) {
  const [state, setState] = useState<SessionState>("locked");
  const [session, setSession] = useState<AiSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { deriveKey } = usePasskey();

  // Countdown timer
  useEffect(() => {
    if (state !== "active" || !session) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((session.expiresAt - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);
      if (remaining === 0) {
        setState("expired");
        setSession(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, session]);

  const authorize = useCallback(
    async (expiresInMinutes: number) => {
      setState("authorizing");

      try {
        // Trigger passkey (Touch ID / Face ID)
        const key = await deriveKey();
        if (!key) {
          // User cancelled
          setState("locked");
          return;
        }

        // Fetch patient records for health context
        const records = await getRecords(patientAddress);
        const healthContext = formatHealthContext(records);

        // Create server-side session
        const res = await fetch("/api/ai-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientAddress,
            healthContext,
            expiresInMinutes,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create session");
        }

        const data = (await res.json()) as {
          sessionToken: string;
          expiresAt: number;
        };

        setSession({
          sessionToken: data.sessionToken,
          expiresAt: data.expiresAt,
          patientAddress,
        });
        setTimeRemaining(Math.floor((data.expiresAt - Date.now()) / 1000));
        setState("active");
      } catch {
        setState("locked");
      }
    },
    [patientAddress, deriveKey],
  );

  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      await fetch("/api/ai-session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: session.sessionToken }),
      });
    } catch {
      // Best effort cleanup
    }

    setSession(null);
    setState("locked");
    setTimeRemaining(0);
  }, [session]);

  return { state, session, timeRemaining, authorize, endSession };
}
