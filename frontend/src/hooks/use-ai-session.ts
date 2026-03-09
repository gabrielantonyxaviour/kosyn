"use client";

import { useState, useEffect, useCallback } from "react";
import { usePasskey } from "@/hooks/use-passkey";
import { readContract } from "thirdweb";
import { getHealthRecordRegistry } from "@/lib/contracts";

export interface AiSession {
  sessionToken: string;
  expiresAt: number;
  patientAddress: string;
}

export type SessionState = "locked" | "authorizing" | "active" | "expired";

const RECORD_TYPE_NAMES: Record<number, string> = {
  0: "Health",
  1: "Prescription",
  2: "Certificate",
  3: "Consultation",
};

interface OnChainRecordSummary {
  id: number;
  recordType: string;
  uploadTimestamp: number;
  ipfsCid: string;
}

function formatHealthContext(records: OnChainRecordSummary[]): string {
  if (records.length === 0) return "No health records available.";
  return records
    .map((r) => {
      const date = new Date(r.uploadTimestamp * 1000).toLocaleDateString();
      return `[${r.recordType.toUpperCase()}] Record #${r.id} — uploaded ${date} (CID: ${r.ipfsCid.slice(0, 12)}...)`;
    })
    .join("\n");
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

        // Fetch patient records from chain for health context
        const contract = getHealthRecordRegistry();
        const recordIds = await readContract({
          contract,
          method: "getPatientRecords",
          params: [patientAddress as `0x${string}`],
        });
        const records = await Promise.all(
          recordIds.map(async (id) => {
            const r = await readContract({
              contract,
              method: "getRecord",
              params: [id],
            });
            return {
              id: Number(id),
              recordType: RECORD_TYPE_NAMES[Number(r.recordType)] ?? "Health",
              uploadTimestamp: Number(r.uploadTimestamp),
              ipfsCid: r.ipfsCid,
            } as OnChainRecordSummary;
          }),
        );
        const healthContext = formatHealthContext(
          records.filter((r) => r.ipfsCid !== ""),
        );

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
