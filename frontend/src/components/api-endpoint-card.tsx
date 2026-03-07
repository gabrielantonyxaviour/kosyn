"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import {
  getKosynUSD,
  getDataMarketplace,
  prepareContractCall,
  ADDRESSES,
} from "@/lib/contracts";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

interface ApiEndpointCardProps {
  endpoint: string;
  method: "GET";
  description: string;
  price: number;
  category: string;
  asButton?: boolean;
}

type Step = "idle" | "approving" | "paying" | "fetching" | "done" | "error";

export function ApiEndpointCard({
  endpoint,
  method,
  description,
  price,
  category,
  asButton,
}: ApiEndpointCardProps) {
  const account = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { mutateAsync: sendTx } = useSendTransaction();

  // KUSD has 6 decimals — multiply by 1e6 not 1e18
  const priceWei = BigInt(Math.floor(price * 1e6));

  const handlePay = async () => {
    if (!account) return;
    try {
      setStep("approving");
      const approveTx = prepareContractCall({
        contract: getKosynUSD(),
        method: "approve",
        params: [ADDRESSES.dataMarketplace, priceWei],
      });
      await sendTx(approveTx);

      setStep("paying");
      const queryTx = prepareContractCall({
        contract: getDataMarketplace(),
        method: "submitQuery",
        params: [endpoint, priceWei],
      });
      const receipt = await sendTx(queryTx);
      const txHash = receipt.transactionHash;

      setStep("fetching");
      const resp = await fetch(`/api/data/${endpoint}`, {
        headers: { "X-Payment": txHash },
      });
      const data = await resp.json();
      setResult(JSON.stringify(data, null, 2));
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setResult("");
    setError("");
  };

  if (asButton) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Lock className="h-3.5 w-3.5 mr-1.5" />
          Try API — {price} KUSD
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">
                /api/data/{endpoint}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!account && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Connect your wallet to pay for API access
                </p>
              )}
              {account && step === "idle" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Payment required
                    </p>
                    <p className="text-2xl font-bold">
                      {price}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        KUSD
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Distributed to contributing patients via CRE
                    </p>
                  </div>
                  <Button className="w-full" onClick={handlePay}>
                    Pay {price} KUSD → Get Data
                  </Button>
                </div>
              )}
              {(step === "approving" ||
                step === "paying" ||
                step === "fetching") && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {step === "approving" && "Approving KUSD transfer..."}
                    {step === "paying" &&
                      "Submitting payment to marketplace..."}
                    {step === "fetching" && "Fetching anonymized data..."}
                  </p>
                </div>
              )}
              {step === "done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Payment confirmed
                    </span>
                  </div>
                  <pre className="rounded-lg border border-border bg-muted/50 p-3 text-xs overflow-auto max-h-48 font-mono">
                    {result}
                  </pre>
                </div>
              )}
              {step === "error" && (
                <div className="space-y-3">
                  <p className="text-sm text-red-400">{error}</p>
                  <Button variant="outline" size="sm" onClick={reset}>
                    Try again
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card className="border-border bg-card/50 hover:bg-card transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-mono">
                {method}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {price} KUSD
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            /api/data/{endpoint}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Try API
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              /api/data/{endpoint}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!account && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Connect your wallet to pay for API access
              </p>
            )}
            {account && step === "idle" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Payment required
                  </p>
                  <p className="text-2xl font-bold">
                    {price}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      KUSD
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Distributed to contributing patients via CRE
                  </p>
                </div>
                <Button className="w-full" onClick={handlePay}>
                  Pay {price} KUSD → Get Data
                </Button>
              </div>
            )}
            {(step === "approving" ||
              step === "paying" ||
              step === "fetching") && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {step === "approving" && "Approving KUSD transfer..."}
                  {step === "paying" && "Submitting payment to marketplace..."}
                  {step === "fetching" && "Fetching anonymized data..."}
                </p>
              </div>
            )}
            {step === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Payment confirmed</span>
                </div>
                <pre className="rounded-lg border border-border bg-muted/50 p-3 text-xs overflow-auto max-h-48 font-mono">
                  {result}
                </pre>
              </div>
            )}
            {step === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-400">{error}</p>
                <Button variant="outline" size="sm" onClick={reset}>
                  Try again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
