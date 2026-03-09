"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown, ChevronUp, X, RefreshCw } from "lucide-react";
import { readContract } from "thirdweb";
import { getHealthRecordRegistry, getPatientConsent } from "@/lib/contracts";
import { useDoctorBookings } from "@/hooks/use-bookings";
import type { OnChainRecord, RecordType } from "@/hooks/use-onchain-records";

const RECORD_TYPE_MAP: Record<number, RecordType> = {
  0: "health",
  1: "prescription",
  2: "certificate",
  3: "consultation",
};

interface RecordPickerProps {
  doctorAddress: string;
  selectedRecords: OnChainRecord[];
  onRecordsChange: (records: OnChainRecord[]) => void;
}

const recordTypeColors: Record<string, string> = {
  health: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  consultation: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  prescription: "bg-green-500/10 text-green-400 border-green-500/20",
  certificate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function RecordPicker({
  doctorAddress,
  selectedRecords,
  onRecordsChange,
}: RecordPickerProps) {
  const [allRecords, setAllRecords] = useState<OnChainRecord[]>([]);
  const [consentedPatients, setConsentedPatients] = useState<Set<string>>(
    new Set(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const { bookings } = useDoctorBookings(doctorAddress || undefined);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, OnChainRecord[]> = {};
    for (const record of allRecords) {
      if (!groups[record.patient]) {
        groups[record.patient] = [];
      }
      groups[record.patient].push(record);
    }
    return groups;
  }, [allRecords]);

  const loadRecords = useCallback(async () => {
    if (!doctorAddress) return;
    setLoading(true);
    try {
      // Get unique patient addresses from bookings
      const patientAddresses = [...new Set(bookings.map((b) => b.patient))];

      // Check on-chain consent for each patient
      const consentContract = getPatientConsent();
      const consented = new Set<string>();
      await Promise.all(
        patientAddresses.map(async (addr) => {
          try {
            const allowed = await readContract({
              contract: consentContract,
              method: "isProviderAllowed",
              params: [addr as `0x${string}`, doctorAddress as `0x${string}`],
            });
            if (allowed) consented.add(addr);
          } catch {
            // consent check failed — skip
          }
        }),
      );
      setConsentedPatients(consented);

      // Fetch records for consented patients
      const registry = getHealthRecordRegistry();
      const recordArrays = await Promise.all(
        [...consented].map(async (addr) => {
          const ids = await readContract({
            contract: registry,
            method: "getPatientRecords",
            params: [addr as `0x${string}`],
          });
          const recs = await Promise.all(
            ids.map(async (id) => {
              const r = await readContract({
                contract: registry,
                method: "getRecord",
                params: [id],
              });
              return {
                id: Number(id),
                patient: r.patient,
                recordType: RECORD_TYPE_MAP[Number(r.recordType)] ?? "health",
                ipfsCid: r.ipfsCid,
                uploadTimestamp: Number(r.uploadTimestamp),
                lastAccessedAt: Number(r.lastAccessedAt),
                isActive: r.isActive,
              } satisfies OnChainRecord;
            }),
          );
          return recs.filter((r) => r.ipfsCid !== "" && r.isActive);
        }),
      );
      setAllRecords(recordArrays.flat());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [doctorAddress, bookings]);

  useEffect(() => {
    if (isOpen) loadRecords();
  }, [isOpen, loadRecords]);

  const toggleRecord = (record: OnChainRecord) => {
    const isSelected = selectedRecords.some((r) => r.id === record.id);
    if (isSelected) {
      const next = selectedRecords.filter((r) => r.id !== record.id);
      onRecordsChange(next);
      if (next.length === 0) {
        setSelectedPatient(null);
      }
    } else {
      if (!selectedPatient) {
        setSelectedPatient(record.patient);
      }
      onRecordsChange([...selectedRecords, record]);
    }
  };

  const removeRecord = (id: number) => {
    const next = selectedRecords.filter((r) => r.id !== id);
    onRecordsChange(next);
    if (next.length === 0) {
      setSelectedPatient(null);
    }
  };

  const switchPatient = () => {
    onRecordsChange([]);
    setSelectedPatient(null);
  };

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>
            {selectedRecords.length > 0
              ? `${selectedRecords.length} record${selectedRecords.length > 1 ? "s" : ""} attached`
              : "Attach patient records"}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {selectedRecords.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
          {selectedRecords.map((r) => (
            <Badge
              key={r.id}
              variant="outline"
              className={`text-[10px] flex items-center gap-1 ${recordTypeColors[r.recordType] || ""}`}
            >
              {`Record #${r.id}`}
              <button
                type="button"
                onClick={() => removeRecord(r.id)}
                className="hover:opacity-70"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Loading accessible records...
            </p>
          ) : allRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              {consentedPatients.size === 0
                ? "No active consents — no records accessible."
                : "No records found."}
            </p>
          ) : (
            <>
              {selectedPatient && (
                <div className="flex items-center justify-between pb-1">
                  <p className="text-[10px] text-muted-foreground">
                    Viewing records for{" "}
                    <span className="font-mono text-foreground">
                      {selectedPatient.slice(0, 6)}...
                      {selectedPatient.slice(-4)}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={switchPatient}
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Switch patient
                  </Button>
                </div>
              )}
              {Object.entries(groupedRecords).map(
                ([patientAddress, records]) => {
                  const isLocked =
                    selectedPatient !== null &&
                    selectedPatient !== patientAddress;
                  return (
                    <div key={patientAddress}>
                      <p className="text-[10px] text-muted-foreground font-mono pt-1 pb-0.5 px-0.5">
                        {patientAddress.slice(0, 6)}...
                        {patientAddress.slice(-4)}
                        {isLocked && (
                          <span className="ml-1.5 text-muted-foreground/50">
                            (locked)
                          </span>
                        )}
                      </p>
                      {records.map((record) => {
                        const isSelected = selectedRecords.some(
                          (r) => r.id === record.id,
                        );
                        return (
                          <label
                            key={record.id}
                            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
                              isLocked
                                ? "border-border opacity-30 cursor-not-allowed"
                                : isSelected
                                  ? "border-primary/40 bg-primary/5 cursor-pointer"
                                  : "border-border hover:bg-muted/30 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isLocked}
                              onChange={() => toggleRecord(record)}
                              className="rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">
                                Record #{record.id}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${recordTypeColors[record.recordType] || ""}`}
                            >
                              {record.recordType}
                            </Badge>
                          </label>
                        );
                      })}
                    </div>
                  );
                },
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
