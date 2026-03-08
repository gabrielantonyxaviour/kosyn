"use client";

import { useState } from "react";
import { Shield, ShieldCheck } from "lucide-react";

interface NillionProofBadgeProps {
  proof?: {
    signature: string;
    model: string;
    timestamp?: number;
  };
}

export function NillionProofBadge({ proof }: NillionProofBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!proof) return null;

  const sigPreview = proof.signature.slice(0, 16) + "…";
  const modelShort = proof.model.split("/").pop() ?? proof.model;

  return (
    <div className="inline-block">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
      >
        <ShieldCheck className="h-3 w-3" />
        TEE Verified
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg border border-border bg-card p-3 text-xs space-y-1.5 min-w-[240px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Nillion nilAI — cryptographic proof
          </div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Model</span>
              <span className="text-foreground font-mono">{modelShort}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Signature</span>
              <span className="text-foreground font-mono">{sigPreview}</span>
            </div>
            {proof.timestamp && (
              <div className="flex justify-between gap-4">
                <span>Generated</span>
                <span className="text-foreground">
                  {new Date(proof.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground/70 text-[10px] leading-relaxed pt-0.5">
            Response signed by AMD SEV-SNP + NVIDIA CC enclave. Verify via
            /v1/attestation/report.
          </p>
        </div>
      )}
    </div>
  );
}

export function NillionProofInline({ proof }: NillionProofBadgeProps) {
  if (!proof) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground/60">
        <Shield className="h-3 w-3" />
        Nillion Private LLM
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-emerald-400">
      <ShieldCheck className="h-3 w-3" />
      Nillion TEE — response signed
    </span>
  );
}
