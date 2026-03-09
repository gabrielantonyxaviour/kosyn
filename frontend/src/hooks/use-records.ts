"use client";

import { useReadContract } from "thirdweb/react";
import { getHealthRecordRegistry } from "@/lib/contracts";

export type { RecordType, OnChainRecord } from "@/hooks/use-onchain-records";
export { useOnChainRecords } from "@/hooks/use-onchain-records";

export interface HealthRecord {
  id: number;
  ipfsCid: string;
  recordType: string;
  uploadTimestamp: number;
  lastAccessedAt: number;
  isActive: boolean;
  patient: string;
  label?: string;
  templateType?: string;
  createdBy?: "patient" | "doctor";
}

export interface AccessLog {
  provider: string;
  timestamp: number;
  aiReportHash: string;
  granted: boolean;
}

export function usePatientRecords(address: string | undefined) {
  return useReadContract({
    contract: getHealthRecordRegistry(),
    method: "getPatientRecords",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });
}

export function useRecord(id: number) {
  const result = useReadContract({
    contract: getHealthRecordRegistry(),
    method: "records",
    params: [BigInt(id)],
  });

  const record: HealthRecord | null = result.data
    ? {
        id,
        ipfsCid: result.data[0],
        recordType:
          (
            {
              0: "health",
              1: "prescription",
              2: "certificate",
              3: "consultation",
            } as Record<number, string>
          )[Number(result.data[1])] || "health",
        uploadTimestamp: Number(result.data[2]),
        lastAccessedAt: Number(result.data[3]),
        isActive: result.data[4],
        patient: result.data[5],
      }
    : null;

  return { ...result, data: record };
}

export function useAccessLogs(recordId: number) {
  return useReadContract({
    contract: getHealthRecordRegistry(),
    method: "getAccessLogs",
    params: [BigInt(recordId)],
    queryOptions: { enabled: recordId > 0 },
  });
}
