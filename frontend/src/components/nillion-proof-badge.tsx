"use client";

import { useState } from "react";
import { ShieldCheck, Shield, Copy, Check, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NillionProofBadgeProps {
  proof?: {
    signature: string;
    model: string;
    timestamp?: number;
  };
}

export function NillionProofBadge({ proof }: NillionProofBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (!proof) return null;

  const modelShort = proof.model.split("/").pop() ?? proof.model;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proof.signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
          <span className="text-[10px] font-medium">Verified</span>
          <ArrowUpRight className="h-2.5 w-2.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-[0.15em] text-muted-foreground">
              nillion
            </span>
            <span className="text-sm text-muted-foreground/70 font-normal">
              nilAI Proof
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* What is this */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            This response was generated inside an AMD SEV-SNP + NVIDIA
            Confidential Computing TEE enclave. The cryptographic signature
            below proves the response was produced by the attested model without
            tampering.
          </p>

          {/* Proof details */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Model</span>
              <span className="text-xs font-mono text-foreground">
                {modelShort}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Enclave</span>
              <span className="text-xs font-mono text-foreground">
                AMD SEV-SNP + NVIDIA CC
              </span>
            </div>
            {proof.timestamp && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Timestamp</span>
                <span className="text-xs font-mono text-foreground">
                  {new Date(proof.timestamp).toLocaleString()}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">
                ECDSA Signature (secp256k1)
              </span>
              <div className="flex items-start gap-2">
                <code className="flex-1 text-[10px] font-mono text-foreground bg-background rounded px-2 py-1.5 break-all leading-relaxed border border-border">
                  {proof.signature}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Verification steps */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              How to verify
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Fetch the enclave public key via{" "}
                <code className="text-[10px] font-mono bg-muted px-1 rounded">
                  GET /v1/public_key
                </code>
              </li>
              <li>
                Fetch the TEE attestation report via{" "}
                <code className="text-[10px] font-mono bg-muted px-1 rounded">
                  GET /v1/attestation/report
                </code>
              </li>
              <li>
                Verify the ECDSA signature against the response content using
                the public key
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
