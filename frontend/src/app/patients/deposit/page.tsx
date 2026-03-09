"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getKosynUSD } from "@/lib/contracts";
import {
  CreditCard,
  Coins,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

const PRESETS = [10, 25, 50, 100];

function DepositContent() {
  const account = useActiveAccount();
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const amountParam = searchParams.get("amount");

  const [selectedPreset, setSelectedPreset] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creOnline, setCreOnline] = useState<boolean | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: balance } = useReadContract({
    contract: getKosynUSD(),
    method: "balanceOf",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  useEffect(() => {
    async function checkBridge() {
      try {
        const res = await fetch("/api/stripe/deposit");
        const data = await res.json();
        setCreOnline(data.cre === true);
      } catch {
        setCreOnline(false);
      }
    }
    checkBridge();
    const interval = setInterval(checkBridge, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatted = balance ? (Number(balance) / 1e6).toFixed(2) : "0.00";
  const effectiveAmount = customAmount ? Number(customAmount) : selectedPreset;
  const canPay =
    !!account && effectiveAmount > 0 && creOnline === true && !loading;

  async function handleStripeCheckout() {
    if (!canPay) return;
    setLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          walletAddress: account!.address,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(
          data.error ?? "Something went wrong. Please try again.",
        );
        if (data.code === "CRE_OFFLINE") setCreOnline(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyAddress() {
    if (!account) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {payment === "success" && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          Payment successful! {amountParam} KUSD will be minted to your wallet
          shortly.
        </div>
      )}
      {payment === "cancelled" && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Payment cancelled. No charges were made.
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Add Funds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Balance:{" "}
          <span className="font-medium text-emerald-400">{formatted} KUSD</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Buy with Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Buy with Card</h2>
            </div>
            {creOnline !== null && (
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${creOnline ? "bg-emerald-400" : "bg-red-400"}`}
                />
                <span className="text-xs text-muted-foreground">
                  {creOnline ? "CRE online" : "CRE offline"}
                </span>
              </div>
            )}
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Pay with a debit or credit card. KUSD tokens are minted to your
            wallet instantly after payment. 1 KUSD = $1 USD.
          </p>

          {creOnline === false && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                The CRE service is currently offline. Card deposits require CRE
                to process payments. Please reach out to{" "}
                <a
                  href="mailto:gabrielantony56@gmail.com"
                  className="underline hover:text-amber-200"
                >
                  gabrielantony56@gmail.com
                </a>{" "}
                to have it turned back on.
              </p>
            </div>
          )}

          {checkoutError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
              {checkoutError}
            </div>
          )}

          <div className="mb-4 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPreset(p);
                  setCustomAmount("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selectedPreset === p && !customAmount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                ${p}
              </button>
            ))}
          </div>

          <input
            type="text"
            inputMode="decimal"
            placeholder="Custom amount (USD)"
            value={customAmount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              setCustomAmount(v);
            }}
            className="mb-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none focus:border-primary"
          />

          {effectiveAmount > 0 && (
            <p className="mb-5 text-xs text-muted-foreground">
              You&apos;ll receive{" "}
              <span className="font-medium text-foreground">
                {effectiveAmount} KUSD
              </span>
            </p>
          )}

          <button
            onClick={handleStripeCheckout}
            disabled={!canPay}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              "Redirecting…"
            ) : creOnline === false ? (
              "CRE offline — deposits unavailable"
            ) : (
              <>
                Pay ${effectiveAmount || "—"} with Stripe
                <ExternalLink className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Deposit KUSD */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Deposit KUSD</h2>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Send KUSD directly to your wallet on Avalanche Fuji (chain ID
            43113). Only send KUSD — other tokens won&apos;t be credited.
          </p>

          {account ? (
            <>
              <div className="mb-5 flex justify-center">
                <div className="rounded-xl border border-border bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${account.address}&margin=8`}
                    alt="Wallet address QR"
                    width={160}
                    height={160}
                    className="rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {account.address}
                </span>
                <button
                  onClick={copyAddress}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p>
                  Network:{" "}
                  <span className="text-foreground">
                    Avalanche Fuji Testnet
                  </span>
                </p>
                <p>
                  Token contract:{" "}
                  <span className="font-mono text-foreground">
                    {process.env.NEXT_PUBLIC_KOSYNUSD
                      ? `${process.env.NEXT_PUBLIC_KOSYNUSD.slice(0, 10)}…${process.env.NEXT_PUBLIC_KOSYNUSD.slice(-6)}`
                      : "Not deployed"}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to see your deposit address.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense>
      <DepositContent />
    </Suspense>
  );
}
