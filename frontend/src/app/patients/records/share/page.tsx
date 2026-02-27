"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Eye,
  Server,
  CheckCircle2,
  Wifi,
  X,
  ArrowRight,
  Sparkles,
  CircleDollarSign,
} from "lucide-react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { getDataMarketplace } from "@/lib/contracts";
import { wrapKeyForMarketplace } from "@/lib/crypto";
import { usePasskey } from "@/hooks/use-passkey";
import { toast } from "sonner";

// HIPAA Safe Harbor: 18 identifiers stripped before aggregation
const hipaaIdentifiers = [
  "Names",
  "Geographic data",
  "Dates (except year)",
  "Phone numbers",
  "Fax numbers",
  "Email addresses",
  "SSN",
  "Medical record numbers",
  "Health plan IDs",
  "Account numbers",
  "Certificate/license numbers",
  "Vehicle IDs & serial numbers",
  "Device IDs & serial numbers",
  "Web URLs",
  "IP addresses",
  "Biometric IDs",
  "Full-face photos",
  "Any unique identifying number",
];

// All supported record types as uint8 values
const ALL_RECORD_TYPES = [1, 2, 3, 4, 5] as const;

export default function ShareDataPage() {
  const account = useActiveAccount();
  const [enabling, setEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const { mutateAsync: sendTx } = useSendTransaction();
  const { deriveRawKey } = usePasskey();

  const handleEnable = async () => {
    if (!account) {
      toast.error("Connect your wallet first");
      return;
    }

    setEnabling(true);
    try {
      // Step 1: Register as active contributor on-chain
      setStepLabel("Registering as contributor...");
      const listTx = prepareContractCall({
        contract: getDataMarketplace(),
        method: "listData",
        params: [[...ALL_RECORD_TYPES]],
      });
      await sendTx(listTx);

      // Step 2: Derive raw key material via Face ID / Touch ID
      setStepLabel("Touch ID / Face ID required to secure your key...");
      const pubKeyB64 = process.env.NEXT_PUBLIC_CRE_MARKETPLACE_PUBKEY;
      if (!pubKeyB64) {
        toast.error(
          "Marketplace public key not configured — skipping key escrow",
        );
      } else {
        const rawKey = await deriveRawKey();
        if (!rawKey) {
          throw new Error("Passkey verification cancelled or unsupported");
        }

        // Step 3: Wrap key with CRE public key and register on-chain
        setStepLabel("Registering marketplace key on-chain...");
        const wrappedBundle = await wrapKeyForMarketplace(rawKey, pubKeyB64);
        // Store base64 bundle as UTF-8 bytes — CRE reads and decodes back to string
        const rawBytes = new TextEncoder().encode(wrappedBundle);
        const wrappedBytes = `0x${Array.from(rawBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}` as `0x${string}`;

        const keyTx = prepareContractCall({
          contract: getDataMarketplace(),
          method: "registerMarketplaceKey",
          params: [wrappedBytes],
        });
        await sendTx(keyTx);
      }

      // Step 4: Update the demo store opt-in so the aggregation layer can find records
      setStepLabel("Finalizing data sharing setup...");
      await fetch(`/api/demo?action=opt-in-data-sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address }),
      });

      toast.success("Data sharing enabled — you'll earn KUSD for each query");
      setEnabled(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to enable data sharing",
      );
    } finally {
      setEnabling(false);
      setStepLabel("");
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Wifi className="h-4 w-4" />
          Data Sharing Program
        </div>
        <h1 className="text-2xl font-bold">
          Contribute to Medical AI Research
        </h1>
      </div>

      {/* Visual pipeline */}
      <div className="relative">
        <div className="flex items-stretch gap-0 rounded-xl border border-border overflow-hidden">
          <div className="flex-1 p-5 bg-muted/30 border-r border-border">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
                Step 1
              </span>
            </div>
            <p className="text-sm font-medium">Your Encrypted Records</p>
            <p className="text-xs text-muted-foreground mt-1">
              AES-256-GCM encrypted on IPFS. Only you can decrypt.
            </p>
          </div>

          <div className="flex items-center -mx-3 z-10">
            <div className="rounded-full border border-border bg-background p-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex-1 p-5 bg-primary/5 border-r border-border">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Step 2
              </span>
            </div>
            <p className="text-sm font-medium">HIPAA De-Identification</p>
            <p className="text-xs text-muted-foreground mt-1">
              18 Safe Harbor identifiers stripped. Aggregated with k-anonymity.
            </p>
          </div>

          <div className="flex items-center -mx-3 z-10">
            <div className="rounded-full border border-border bg-background p-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex-1 p-5 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                Step 3
              </span>
            </div>
            <p className="text-sm font-medium">Researchers Get Statistics</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregated insights only. You earn KUSD per query.
            </p>
          </div>
        </div>
      </div>

      {/* 18 HIPAA Identifiers */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">
            18 HIPAA Safe Harbor Identifiers Removed
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {hipaaIdentifiers.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1 text-xs text-red-400"
            >
              <X className="h-3 w-3" />
              {id}
            </span>
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="grid grid-cols-3 gap-px rounded-xl border border-border overflow-hidden">
        {[
          {
            icon: Shield,
            title: "HIPAA Compliant",
            desc: "Safe Harbor de-identification with on-chain ACE policy enforcement",
            color: "text-primary",
          },
          {
            icon: Lock,
            title: "Consent On-Chain",
            desc: "Your opt-in is stored in the DataMarketplace smart contract — revoke anytime",
            color: "text-blue-400",
          },
          {
            icon: CheckCircle2,
            title: "Earn KUSD",
            desc: "Every research query distributes KUSD equally to all contributing patients",
            color: "text-emerald-400",
          },
        ].map((g) => (
          <div key={g.title} className="bg-muted/20 p-4 text-center space-y-2">
            <g.icon className={`h-5 w-5 mx-auto ${g.color}`} />
            <p className="text-sm font-medium">{g.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {g.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Enable action */}
      <div className="text-center space-y-4">
        {!enabled ? (
          <>
            <Button
              onClick={handleEnable}
              disabled={enabling || !account}
              size="lg"
              className="px-8"
            >
              <Shield className="h-4 w-4 mr-2" />
              {enabling
                ? stepLabel || "Processing..."
                : !account
                  ? "Connect wallet to continue"
                  : "Enable Data Sharing"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This calls DataMarketplace.listData() on Avalanche Fuji. All
              record types included. Revoke anytime.
            </p>
          </>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Data sharing enabled — you&apos;ll earn KUSD for each AI query
            <CircleDollarSign className="h-4 w-4 ml-1" />
          </div>
        )}
      </div>
    </main>
  );
}
