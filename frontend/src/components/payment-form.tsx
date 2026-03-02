"use client";

import { useState } from "react";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Coins } from "lucide-react";
import { getKosynUSD, prepareContractCall } from "@/lib/contracts";

interface PaymentFormProps {
  amount: number;
  doctorName: string;
  doctorAddress: string;
  onPaymentComplete: (method: "kusd" | "stripe") => void;
}

export function PaymentForm({
  amount,
  doctorName,
  doctorAddress,
  onPaymentComplete,
}: PaymentFormProps) {
  const account = useActiveAccount();
  const [method, setMethod] = useState<"kusd" | "stripe">("kusd");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balanceRaw } = useReadContract({
    contract: getKosynUSD(),
    method: "balanceOf",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  // KUSD has 6 decimals
  const kusdBalance = balanceRaw ? Number(balanceRaw) / 1e6 : 0;
  const insufficientBalance = kusdBalance < amount;

  const { mutate: sendTx } = useSendTransaction();

  const handlePay = async () => {
    setError(null);
    setIsProcessing(true);

    if (method === "stripe") {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, doctorName, doctorAddress }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError("Failed to create checkout session");
      } catch {
        setError("Checkout failed");
      }
      setIsProcessing(false);
      return;
    }

    // KUSD path: real on-chain transfer
    // amount is in whole KUSD units — multiply by 1e6 for 6-decimal token
    const kusdAmount = BigInt(Math.round(amount * 1_000_000));
    const tx = prepareContractCall({
      contract: getKosynUSD(),
      method: "transfer",
      params: [doctorAddress as `0x${string}`, kusdAmount],
    });

    sendTx(tx, {
      onSuccess: () => {
        setIsProcessing(false);
        onPaymentComplete("kusd");
      },
      onError: (err) => {
        setIsProcessing(false);
        setError(err.message ?? "Transaction failed");
      },
    });
  };

  return (
    <div className="rounded-lg border border-border p-5 space-y-4">
      <p className="text-sm font-medium">Payment Method</p>

      <div className="flex gap-2">
        <Button
          variant={method === "kusd" ? "default" : "outline"}
          size="sm"
          onClick={() => setMethod("kusd")}
          className="flex-1"
        >
          <Coins className="h-4 w-4 mr-1" />
          KUSD
        </Button>
        <Button
          variant={method === "stripe" ? "default" : "outline"}
          size="sm"
          onClick={() => setMethod("stripe")}
          className="flex-1"
        >
          <CreditCard className="h-4 w-4 mr-1" />
          Card
        </Button>
      </div>

      {method === "kusd" && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span>{kusdBalance.toFixed(2)} KUSD</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fee</span>
            <span>{amount} KUSD</span>
          </div>
          {insufficientBalance && (
            <Badge variant="destructive" className="text-xs">
              Insufficient balance
            </Badge>
          )}
        </div>
      )}

      {method === "stripe" && (
        <p className="text-xs text-muted-foreground">
          Pay ${amount} via card. KUSD will be minted and transferred to{" "}
          {doctorName} inside a TEE enclave.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        className="w-full"
        onClick={handlePay}
        disabled={
          isProcessing || !account || (method === "kusd" && insufficientBalance)
        }
      >
        {isProcessing
          ? "Processing..."
          : `Pay ${amount} ${method === "kusd" ? "KUSD" : "USD"}`}
      </Button>
    </div>
  );
}
