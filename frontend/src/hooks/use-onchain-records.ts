"use client";

import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { getHealthRecordRegistry } from "@/lib/contracts";
import { useState, useEffect } from "react";

export type RecordType =
  | "health"
  | "consultation"
  | "certificate"
  | "prescription";

export interface OnChainRecord {
  id: number;
  ipfsCid: string;
  recordType: RecordType;
  uploadTimestamp: number;
  lastAccessedAt: number;
  isActive: boolean;
  patient: string;
}

// Convention: 0=health, 1=prescription, 2=certificate, 3=consultation
const RECORD_TYPE_MAP: Record<number, RecordType> = {
  0: "health",
  1: "prescription",
  2: "certificate",
  3: "consultation",
};

export function useOnChainRecords(address: string | undefined) {
  const {
    data: recordIds,
    isLoading: idsLoading,
    refetch,
  } = useReadContract({
    contract: getHealthRecordRegistry(),
    method: "getPatientRecords",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });

  const [records, setRecords] = useState<OnChainRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (idsLoading) return;
    if (!recordIds || recordIds.length === 0) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const contract = getHealthRecordRegistry();
      const results = await Promise.all(
        recordIds!.map(async (id) => {
          const data = await readContract({
            contract,
            method: "getRecord",
            params: [id],
          });
          return {
            id: Number(id),
            ipfsCid: data.ipfsCid,
            recordType: RECORD_TYPE_MAP[Number(data.recordType)] ?? "health",
            uploadTimestamp: Number(data.uploadTimestamp),
            lastAccessedAt: Number(data.lastAccessedAt),
            isActive: data.isActive,
            patient: data.patient,
          } as OnChainRecord;
        }),
      );
      if (!cancelled) {
        setRecords(
          results
            .filter((r) => r.isActive)
            .sort((a, b) => b.uploadTimestamp - a.uploadTimestamp),
        );
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [recordIds, idsLoading]);

  return { records, isLoading, refetch };
}
