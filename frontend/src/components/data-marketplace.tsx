"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { getDataMarketplace, prepareContractCall } from "@/lib/contracts";

const RECORD_TYPE_LABELS = [
  "General",
  "Lab Results",
  "Imaging",
  "Prescription",
];

export function DataMarketplace() {
  const account = useActiveAccount();
  const [isOptingIn, setIsOptingIn] = useState(false);
  const { mutateAsync: sendTx } = useSendTransaction();

  const { data: listing, refetch } = useReadContract({
    contract: getDataMarketplace(),
    method: "listings",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  const { data: queryCount } = useReadContract({
    contract: getDataMarketplace(),
    method: "queryCount",
    params: [],
  });

  const isOptedIn = Array.isArray(listing) ? listing[1] : false;

  const handleToggle = async (checked: boolean) => {
    if (!account) return;
    setIsOptingIn(true);
    try {
      if (checked) {
        const tx = prepareContractCall({
          contract: getDataMarketplace(),
          method: "listData",
          params: [[0, 1, 2, 3]],
        });
        await sendTx(tx);
      } else {
        const tx = prepareContractCall({
          contract: getDataMarketplace(),
          method: "delistData",
          params: [],
        });
        await sendTx(tx);
      }
      await refetch();
    } catch (e) {
      toast.error("Failed to update marketplace listing");
    } finally {
      setIsOptingIn(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Marketplace
        </p>
        {isOptingIn ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={isOptedIn}
            onCheckedChange={handleToggle}
            disabled={!account}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Sell anonymized health data for KUSD. All data is fully de-identified
        inside TEE enclaves — companies only receive aggregated statistics.
      </p>
      {!account && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Connect wallet to manage data sharing
        </p>
      )}
      {isOptedIn && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Sharing record types
            </p>
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPE_LABELS.map((label) => (
                <Badge key={label} variant="default" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Marketplace Stats
            </p>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xl font-bold">
                {queryCount !== undefined ? queryCount.toString() : "0"}
              </span>
              <span className="text-xs text-muted-foreground">
                total queries
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Earnings distributed via CRE distribution workflow
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            asChild
          >
            <a href="/data" target="_blank" rel="noopener noreferrer">
              View Data API →
            </a>
          </Button>
        </>
      )}
    </div>
  );
}
