"use client";

import { useReadContract } from "thirdweb/react";
import { getHealthRecordRegistry } from "@/lib/contracts";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { getRecords as fetchDemoRecords } from "@/lib/demo-api";
import type { DemoRecord } from "@/app/api/demo/store";

export type RecordType =
  | "health"
  | "consultation"
  | "certificate"
  | "prescription";

export interface HealthRecord {
  id: number;
  ipfsCid: string;
  recordType: RecordType;
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

const RECORD_TYPE_MAP: Record<number, RecordType> = {
  0: "health",
  1: "consultation",
  2: "certificate",
  3: "prescription",
};

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
        recordType: RECORD_TYPE_MAP[Number(result.data[1])] || "health",
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

function mapDemoRecord(r: DemoRecord): HealthRecord {
  return {
    id: r.id,
    ipfsCid: r.ipfsCid,
    recordType: r.recordType as RecordType,
    uploadTimestamp: Math.floor(r.createdAt / 1000),
    lastAccessedAt: 0,
    isActive: true,
    patient: r.patientAddress,
    label: r.label,
    templateType: r.templateType,
    createdBy: r.createdBy,
  };
}

export function useDemoRecords(address: string | undefined): {
  records: HealthRecord[];
  isLoading: boolean;
} {
  const { data, isLoading } = useDemoPoll(
    () =>
      address ? fetchDemoRecords(address) : Promise.resolve([] as DemoRecord[]),
    5000,
  );

  return {
    records: (data || []).map(mapDemoRecord),
    isLoading,
  };
}
