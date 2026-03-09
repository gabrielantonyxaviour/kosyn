"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cpu, Info, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LogLine } from "@/hooks/use-cre-logs";

interface CreFeedProps {
  workflow: string;
  /** Externally managed logs — when provided, the feed renders these and skips internal simulation. */
  logs?: LogLine[];
  /** @deprecated Only used when `logs` is not provided (legacy simulation mode). */
  isActive?: boolean;
}

const levelColors: Record<string, string> = {
  INFO: "text-blue-400",
  OK: "text-emerald-400",
  ERR: "text-red-400",
};

const CRE_STEPS = [
  {
    label: "HTTP Trigger",
    desc: "Receives the incoming request and routes it into the CRE workflow runtime.",
  },
  {
    label: "Confidential HTTP",
    desc: "Processes data inside a Trusted Execution Environment (TEE). No one — not even Chainlink node operators — can see the plaintext.",
  },
  {
    label: "HTTP Client (IPFS)",
    desc: "Stores the encrypted blob on IPFS via Pinata. Only the content hash (CID) is exposed.",
  },
  {
    label: "EVM Write",
    desc: "Commits the CID hash to the HealthRecordRegistry smart contract on Avalanche Fuji, creating an immutable audit trail.",
  },
];

export function CreFeed({ workflow, logs: externalLogs }: CreFeedProps) {
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const logs = externalLogs ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/10 shrink-0">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            CRE Logs
          </span>
          <button
            onClick={() => setShowInfo(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="How CRE works"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
        <ScrollArea className="flex-1 min-h-0 bg-[#0a0a0a]">
          <div className="p-3 font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <span className="text-muted-foreground">
                Waiting for workflow...
              </span>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={`shrink-0 w-6 ${levelColors[l.level]}`}>
                  {l.level}
                </span>
                {l.href ? (
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/80 underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary hover:decoration-primary transition-colors inline-flex items-center gap-1"
                  >
                    {l.message}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-foreground/80">{l.message}</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4 text-primary" />
              How CRE Works
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Chainlink Runtime Environment (CRE) executes this workflow inside a
            Trusted Execution Environment. Your health data is never exposed in
            plaintext outside the enclave.
          </p>
          <div className="space-y-3 mt-1">
            {CRE_STEPS.map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  {i < CRE_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
