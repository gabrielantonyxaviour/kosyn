import { useState, useCallback } from "react";

export type LogLevel = "INFO" | "OK" | "ERR";

export type LogLine = {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
  href?: string;
};

let logId = 0;

function ts() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useCreLogs() {
  const [logs, setLogs] = useState<LogLine[]>([]);

  const push = useCallback(
    (level: LogLevel, message: string, href?: string) => {
      setLogs((prev) => [
        ...prev,
        { id: logId++, time: ts(), level, message, href },
      ]);
    },
    [],
  );

  const clear = useCallback(() => setLogs([]), []);

  return { logs, push, clear } as const;
}

/** Truncate a hash for display: first N chars + "…" + last M chars */
export function truncHash(hash: string, start = 8, end = 4): string {
  if (hash.length <= start + end + 2) return hash;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

export const FUJI_EXPLORER = "https://testnet.snowtrace.io/tx";
export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";
