"use client";

import { readContract } from "thirdweb";
import { getHealthRecordRegistry, getProviderRegistry } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { useOnChainRecords } from "./use-onchain-records";

export interface OnChainAccessLog {
  recordId: number;
  provider: string;
  providerName: string;
  patient: string;
  timestamp: number;
  aiReportHash: string;
  granted: boolean;
}

export function useAccessLogs(patientAddress: string | undefined) {
  const { records } = useOnChainRecords(patientAddress);
  const [logs, setLogs] = useState<OnChainAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!patientAddress || records.length === 0) {
      if (records.length === 0 && patientAddress) setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const registry = getHealthRecordRegistry();
      const providerReg = getProviderRegistry();
      const providerNameCache = new Map<string, string>();

      const allLogs: OnChainAccessLog[] = [];

      for (const record of records) {
        const accessLogs = await readContract({
          contract: registry,
          method: "getAccessLogs",
          params: [BigInt(record.id)],
        });

        for (const log of accessLogs) {
          let providerName = providerNameCache.get(log.provider);
          if (!providerName) {
            try {
              const prov = await readContract({
                contract: providerReg,
                method: "getProvider",
                params: [log.provider as `0x${string}`],
              });
              providerName = prov.name || log.provider.slice(0, 10);
            } catch {
              providerName = log.provider.slice(0, 10);
            }
            providerNameCache.set(log.provider, providerName);
          }

          allLogs.push({
            recordId: record.id,
            provider: log.provider,
            providerName,
            patient: patientAddress!,
            timestamp: Number(log.timestamp),
            aiReportHash: log.aiReportHash,
            granted: log.granted,
          });
        }
      }

      if (!cancelled) {
        setLogs(allLogs.sort((a, b) => b.timestamp - a.timestamp));
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [patientAddress, records]);

  return { logs, isLoading };
}
