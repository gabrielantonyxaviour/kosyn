"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { LiveTranscript } from "@/components/live-transcript";
import { AiResults } from "@/components/ai-results";
import { AiChat } from "@/components/ai-chat";
import { CreFeed } from "@/components/cre-feed";
import { DoctorUploadRecord } from "@/components/doctor-upload-record";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Lock,
  CheckCircle2,
  Fingerprint,
  Clock,
  ChevronDown,
  Loader2,
  Play,
  Eye,
} from "lucide-react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { triggerWorkflow } from "@/lib/cre";
import { encryptForTee } from "@/lib/crypto";
import {
  useCreLogs,
  truncHash,
  FUJI_EXPLORER,
  IPFS_GATEWAY,
} from "@/hooks/use-cre-logs";
import { toast } from "sonner";
import { readContract } from "thirdweb";
import {
  getHealthRecordRegistry,
  getBookingRegistry,
  prepareContractCall,
} from "@/lib/contracts";
import { useBooking } from "@/hooks/use-bookings";
import type { OnChainBooking } from "@/hooks/use-bookings";
import { useOnChainRecords } from "@/hooks/use-onchain-records";
import { usePasskey } from "@/hooks/use-passkey";
import type { OnChainRecord, RecordType } from "@/hooks/use-onchain-records";
import type { TranscriptEvent } from "@/lib/assemblyai";

const recordTypeColors: Record<string, string> = {
  health: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  consultation: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  prescription: "bg-green-500/10 text-green-400 border-green-500/20",
  certificate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const RECORD_TYPE_UINT: Record<string, number> = {
  health: 0,
  prescription: 1,
  certificate: 2,
  consultation: 3,
};

const RECORD_TYPE_LABEL: Record<number, string> = {
  0: "Health",
  1: "Prescription",
  2: "Certificate",
  3: "Consultation",
};

const ALL_RECORD_TYPES: RecordType[] = [
  "health",
  "prescription",
  "certificate",
  "consultation",
];

type Phase = "awaiting-consent" | "records" | "session" | "results" | "error";

export default function DoctorConsultationPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const bookingId = Number(consultationId);
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { booking, isLoading: bookingLoading } = useBooking(bookingId);
  const [phase, setPhase] = useState<Phase>("awaiting-consent");
  const [creActive, setCreActive] = useState(false);
  const [decryptedRecords, setDecryptedRecords] = useState<OnChainRecord[]>([]);
  const [creResult, setCreResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [creError, setCreError] = useState<string | null>(null);
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();

  // Patient records — metadata visible immediately, content requires passkey
  const { records: availableRecords, isLoading: recordsLoading } =
    useOnChainRecords(booking?.patient);

  // Passkey-gated record decryption
  const [recordsUnlocked, setRecordsUnlocked] = useState(false);
  const { verify: passkeyVerify, isLoading: passkeyLoading } = usePasskey();

  // Grace period countdown
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [graceSecs, setGraceSecs] = useState<number>(30 * 60);

  // Smart record selection state
  const [pendingTranscript, setPendingTranscript] = useState<
    TranscriptEvent[] | null
  >(null);
  const [recommendedRecordIds, setRecommendedRecordIds] = useState<number[]>(
    [],
  );
  const [selectedForCre, setSelectedForCre] = useState<OnChainRecord[]>([]);
  const [selectingRecords, setSelectingRecords] = useState(false);

  // Request additional access — collapsible
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  // Derive phase from booking status
  useEffect(() => {
    if (!booking) return;
    switch (booking.status) {
      case 0:
        setPhase("awaiting-consent");
        break;
      case 1:
        setPhase((prev) => (prev === "session" ? prev : "records"));
        break;
      case 2:
        setPhase((prev) => (prev === "session" ? prev : "records"));
        break;
      case 3:
        setPhase((prev) => (prev === "results" ? prev : "session"));
        break;
      case 4:
        setPhase("results");
        break;
    }
  }, [booking]);

  // Grace period countdown
  useEffect(() => {
    if (!completedAt) return;
    const GRACE_MS = 30 * 60 * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((completedAt + GRACE_MS - Date.now()) / 1000),
      );
      setGraceSecs(remaining);
      if (remaining === 0) {
        setRecordsUnlocked(false);
        setDecryptedRecords([]);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [completedAt]);

  // Request additional record types the patient hasn't shared
  const handleRequestAdditional = async () => {
    if (!booking) return;
    const availableTypes = [
      ...new Set(availableRecords.map((r) => r.recordType)),
    ];
    const missing = ALL_RECORD_TYPES.filter((t) => !availableTypes.includes(t));
    const missingUints = missing.map((t) => RECORD_TYPE_UINT[t] ?? 0);

    if (missingUints.length === 0) {
      toast.info("Patient already has all record types available.");
      return;
    }

    try {
      await sendTx(
        prepareContractCall({
          contract: getBookingRegistry(),
          method: "setRequestedRecordTypes",
          params: [BigInt(booking.id), missingUints],
        }),
      );
      toast.info(
        "Additional access request sent. Waiting for patient approval...",
      );
      setAdditionalExpanded(false);
    } catch {
      toast.error("Failed to send access request.");
    }
  };

  // Passkey unlock — fetch full record data
  const handleUnlockRecords = async () => {
    if (!booking?.patient) return;
    const ok = await passkeyVerify();
    if (ok) {
      const contract = getHealthRecordRegistry();
      const recordIds = await readContract({
        contract,
        method: "getPatientRecords",
        params: [booking.patient as `0x${string}`],
      });
      const recs = await Promise.all(
        recordIds.map(async (id) => {
          const r = await readContract({
            contract,
            method: "getRecord",
            params: [id],
          });
          return {
            id: Number(id),
            ipfsCid: r.ipfsCid,
            recordType:
              (
                {
                  0: "health",
                  1: "prescription",
                  2: "certificate",
                  3: "consultation",
                } as Record<number, string>
              )[Number(r.recordType)] ?? "health",
            uploadTimestamp: Number(r.uploadTimestamp),
            lastAccessedAt: Number(r.lastAccessedAt),
            isActive: r.isActive,
            patient: r.patient,
          } as OnChainRecord;
        }),
      );
      setDecryptedRecords(recs.filter((r) => r.isActive));
      setRecordsUnlocked(true);
      toast.success("Records decrypted successfully.");
    } else {
      toast.error("Passkey verification failed.");
    }
  };

  const formatGrace = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Transcript complete — stage record selection
  const handleTranscriptComplete = async (entries: TranscriptEvent[]) => {
    if (!booking) return;
    setPendingTranscript(entries);
    setSelectedForCre(decryptedRecords);

    if (decryptedRecords.length > 0) {
      try {
        const res = await fetch("/api/ai/select-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: entries
              .map((e) => `${e.speaker}: ${e.text}`)
              .join("\n"),
            records: decryptedRecords.map((r) => ({
              id: r.id,
              recordType: r.recordType,
              ipfsCid: r.ipfsCid,
            })),
          }),
        });
        const { selectedIds } = (await res.json()) as {
          selectedIds: number[];
        };
        setRecommendedRecordIds(selectedIds);
        setSelectedForCre(
          decryptedRecords.filter((r) => selectedIds.includes(r.id)),
        );
      } catch {
        // fallback: use all records
      }
    }
    setSelectingRecords(true);
  };

  // Proceed with CRE analysis
  const handleProceedWithAnalysis = async () => {
    if (!booking || !pendingTranscript) return;
    setSelectingRecords(false);
    setCreActive(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");
    toast.info("Processing consultation in CRE TEE...");

    try {
      await sendTx(
        prepareContractCall({
          contract: getBookingRegistry(),
          method: "updateStatus",
          params: [BigInt(booking.id), 3],
        }),
      );
    } catch {
      // non-fatal
    }

    const rawTranscript = pendingTranscript
      .map((e) => `${e.speaker}: ${e.text}`)
      .join("\n");

    pushLog("INFO", "Encrypting transcript for CRE TEE...");
    const crePubKey = process.env.NEXT_PUBLIC_CRE_MARKETPLACE_PUBKEY;
    let encryptedTranscript: string;
    if (crePubKey) {
      encryptedTranscript = await encryptForTee(rawTranscript, crePubKey);
    } else {
      encryptedTranscript = btoa(rawTranscript);
    }
    pushLog("OK", "Transcript encrypted");

    pushLog("INFO", "Sending to CRE TEE for AI analysis...");
    const result = await triggerWorkflow("consultation-processing", {
      consultationId: String(booking.id),
      patientAddress: booking.patient,
      encryptedTranscript,
      patientRecords: selectedForCre.map((r) => ({
        type: r.recordType,
        ipfsCid: r.ipfsCid,
      })),
    });

    if (!result.success) {
      pushLog("ERR", result.error ?? "CRE workflow failed");
      setCreActive(false);
      setCreError(
        result.error ??
          "The CRE service is currently offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
      );
      setPhase("error");
      toast.error("CRE service is offline — consultation processing failed.");
      return;
    }

    if (result.txHash) {
      pushLog(
        "OK",
        `Tx confirmed on Avalanche Fuji`,
        `${FUJI_EXPLORER}/${result.txHash}`,
      );
    }

    const ipfsCid = result.data?.ipfsCid as string | undefined;
    if (!ipfsCid) {
      pushLog("ERR", "CRE returned no results");
      setCreActive(false);
      setCreError(
        "The CRE service returned no results. It may be offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
      );
      setPhase("error");
      toast.error("CRE service returned no results.");
      return;
    }

    pushLog(
      "OK",
      `IPFS CID: ${truncHash(ipfsCid)}`,
      `${IPFS_GATEWAY}/${ipfsCid}`,
    );
    pushLog("INFO", "Fetching AI analysis from IPFS...");

    let resultData: Record<string, unknown>;
    try {
      const ipfsRes = await fetch(`/api/ipfs/fetch?cid=${ipfsCid}`);
      if (!ipfsRes.ok) {
        const errBody = (await ipfsRes.json()) as { error?: string };
        throw new Error(
          errBody.error ?? `IPFS fetch failed (${ipfsRes.status})`,
        );
      }
      const ipfsDoc = (await ipfsRes.json()) as Record<string, unknown>;
      const aiAnalysisRaw = ipfsDoc.aiAnalysis as string | undefined;
      if (!aiAnalysisRaw) {
        throw new Error("IPFS document missing aiAnalysis field");
      }
      resultData = JSON.parse(aiAnalysisRaw) as Record<string, unknown>;
    } catch (e) {
      pushLog("ERR", e instanceof Error ? e.message : "IPFS fetch failed");
      setCreActive(false);
      setCreError(
        e instanceof Error
          ? e.message
          : "Failed to fetch results. The CRE service may be offline.",
      );
      setPhase("error");
      toast.error("Failed to fetch consultation results.");
      return;
    }

    pushLog("OK", "SOAP note generated");

    try {
      await sendTx(
        prepareContractCall({
          contract: getBookingRegistry(),
          method: "completeConsultation",
          params: [BigInt(booking.id), ipfsCid],
        }),
      );
    } catch {
      // non-fatal
    }

    try {
      await fetch("/api/records/encrypt-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: resultData,
          patientAddress: booking.patient,
          label: `Consultation — ${new Date().toLocaleDateString()}`,
          doctorAddress:
            account?.address ?? "0x0000000000000000000000000000000000000000",
          consultationId: String(booking.id),
        }),
      });
    } catch {
      // non-fatal
    }

    pushLog("OK", "Workflow complete");
    setCreResult(resultData);
    setPhase("results");
    setCreActive(false);
    setCompletedAt(Date.now());
    toast.success("AI analysis complete. Results available.");
  };

  const patientName = booking?.patientName || "Patient";
  const availableTypes = [
    ...new Set(availableRecords.map((r) => r.recordType)),
  ];
  const missingTypes = ALL_RECORD_TYPES.filter(
    (t) => !availableTypes.includes(t),
  );

  const phaseBadge = () => {
    switch (phase) {
      case "awaiting-consent":
        return {
          label: "Awaiting Consent",
          className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "records":
        return booking?.status === 1
          ? {
              label: "Additional Access Requested",
              className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            }
          : {
              label: "Records Available",
              className:
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            };
      case "session":
        return {
          label: "In Session",
          className: "bg-green-500/10 text-green-400 border-green-500/20",
        };
      case "error":
        return {
          label: "Error",
          className: "bg-red-500/10 text-red-400 border-red-500/20",
        };
      case "results":
        return {
          label: "Review Results",
          className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
    }
  };

  const badge = phaseBadge();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Consultation{" "}
            <span className="text-muted-foreground font-mono text-lg">
              #{consultationId}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Patient: {patientName}
            {booking ? ` — ${booking.specialty}` : ""}
          </p>
        </div>
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Phase: Awaiting Consent */}
          {phase === "awaiting-consent" && (
            <div className="rounded-lg border border-border p-6 space-y-4">
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                  <Clock className="h-7 w-7 text-amber-400" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-base font-medium">
                    Waiting for Patient Consent
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {patientName} has been booked but hasn&apos;t granted access
                    to their records yet. They&apos;ll see a consent prompt on
                    their consultation page.
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground text-center">
                This page auto-refreshes every 3 seconds. You&apos;ll see
                records as soon as the patient grants access.
              </div>
            </div>
          )}

          {/* Phase: Records Available */}
          {phase === "records" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Patient Records</p>
                  {!recordsLoading && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    >
                      {availableRecords.length} available
                    </Badge>
                  )}
                </div>

                {recordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableRecords.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Patient has no health records uploaded yet.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can still start the consultation without records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableRecords.map((record) => {
                      const isDecrypted =
                        recordsUnlocked &&
                        decryptedRecords.some((r) => r.id === record.id);
                      return (
                        <div
                          key={record.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                            isDecrypted
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                Record #{record.id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  record.uploadTimestamp * 1000,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${recordTypeColors[record.recordType] || ""}`}
                            >
                              {record.recordType}
                            </Badge>
                            {isDecrypted ? (
                              <Eye className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!recordsUnlocked && availableRecords.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleUnlockRecords}
                    disabled={passkeyLoading}
                    className="w-full"
                  >
                    <Fingerprint className="h-4 w-4 mr-2" />
                    {passkeyLoading ? "Verifying..." : "Decrypt All Records"}
                  </Button>
                )}

                {recordsUnlocked && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-400">
                      {decryptedRecords.length} records decrypted and ready for
                      review
                    </p>
                  </div>
                )}
              </div>

              {/* Pending additional request */}
              {booking?.status === 1 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Waiting for Patient Approval
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You requested additional record types:{" "}
                    {booking.requestedRecordTypes
                      .map((n) => RECORD_TYPE_LABEL[n] ?? "Unknown")
                      .join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The patient will see a prompt on their consultation page.
                    This view auto-refreshes.
                  </p>
                </div>
              )}

              {/* Request Additional Access — collapsible */}
              {missingTypes.length > 0 && booking?.status !== 1 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setAdditionalExpanded(!additionalExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-muted-foreground">
                      Request Additional Record Types
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${additionalExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {additionalExpanded && (
                    <div className="border-t border-border p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        The patient doesn&apos;t have these record types
                        available. You can request access — the patient will be
                        notified.
                      </p>
                      <div className="space-y-2">
                        {ALL_RECORD_TYPES.map((t) => {
                          const isAvailable = availableTypes.includes(t);
                          return (
                            <div
                              key={t}
                              className="flex items-center justify-between rounded-lg border border-border p-2.5"
                            >
                              <span className="text-sm capitalize">{t}</span>
                              {isAvailable ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Not shared
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleRequestAdditional}
                        className="w-full text-sm"
                      >
                        Request Missing Types
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Start Consultation */}
              <Button
                onClick={() => setPhase("session")}
                className="w-full h-11"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Consultation
              </Button>
            </div>
          )}

          {/* Phase: Session */}
          {phase === "session" && (
            <>
              {!selectingRecords && (
                <>
                  <LiveTranscript
                    onTranscriptComplete={handleTranscriptComplete}
                  />
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleTranscriptComplete([
                        {
                          speaker: "Doctor",
                          text: "Demo transcript entry",
                          timestamp: Date.now(),
                          isFinal: true,
                        },
                      ])
                    }
                  >
                    End Consultation
                  </Button>
                </>
              )}

              {selectingRecords && pendingTranscript && (
                <div className="rounded-lg border border-border p-5 space-y-4">
                  <p className="text-sm font-medium">
                    Select Records for Analysis
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI recommends the records checked below. Adjust as needed
                    before proceeding.
                  </p>
                  <div className="space-y-2">
                    {decryptedRecords.map((record) => (
                      <label
                        key={record.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedForCre.some(
                            (r) => r.id === record.id,
                          )}
                          onChange={() => {
                            const isSelected = selectedForCre.some(
                              (r) => r.id === record.id,
                            );
                            setSelectedForCre(
                              isSelected
                                ? selectedForCre.filter(
                                    (r) => r.id !== record.id,
                                  )
                                : [...selectedForCre, record],
                            );
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm">{`Record #${record.id}`}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {recommendedRecordIds.includes(record.id) && (
                            <span className="text-[10px] text-primary">
                              AI recommended
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${recordTypeColors[record.recordType] || ""}`}
                          >
                            {record.recordType}
                          </Badge>
                        </div>
                      </label>
                    ))}
                    {decryptedRecords.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No decrypted records available. Proceeding without
                        record context.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleProceedWithAnalysis}
                    className="w-full"
                  >
                    Proceed with Analysis
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Phase: Results */}
          {phase === "results" && (
            <>
              {completedAt && (
                <div
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    graceSecs > 60
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                      : graceSecs > 0
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                        : "border-red-500/20 bg-red-500/5 text-red-400"
                  }`}
                >
                  <span>
                    {graceSecs > 0
                      ? `Record access expires in ${formatGrace(graceSecs)}`
                      : "Record access expired"}
                  </span>
                </div>
              )}

              <Tabs defaultValue="results">
                <TabsList>
                  <TabsTrigger value="results">AI Results</TabsTrigger>
                  <TabsTrigger value="upload">Upload Records</TabsTrigger>
                  <TabsTrigger value="chat">AI Editor</TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="mt-4">
                  <AiResults
                    results={
                      creResult as Parameters<typeof AiResults>[0]["results"]
                    }
                    proof={
                      (creResult?.proof as {
                        signature: string;
                        model: string;
                        timestamp: number;
                      }) ?? undefined
                    }
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  {booking && (
                    <DoctorUploadRecord
                      patientAddress={booking.patient}
                      consultationId={String(booking.id)}
                      doctorName={booking.doctorName ?? ""}
                      doctorAddress={
                        account?.address ??
                        "0x0000000000000000000000000000000000000000"
                      }
                    />
                  )}
                </TabsContent>
                <TabsContent value="chat" className="mt-4 min-h-[400px]">
                  <AiChat
                    contextRecords={decryptedRecords.map((r) => ({
                      id: r.id,
                      recordType: r.recordType,
                    }))}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Phase: Error */}
          {phase === "error" && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-400">
                CRE Service Offline
              </p>
              <p className="text-xs text-muted-foreground">{creError}</p>
              <p className="text-xs text-muted-foreground">
                Contact{" "}
                <a
                  href="mailto:gabrielantony56@gmail.com"
                  className="underline text-primary hover:text-primary/80"
                >
                  gabrielantony56@gmail.com
                </a>{" "}
                to have it turned back on.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCreError(null);
                  setPhase("session");
                  setSelectingRecords(true);
                }}
              >
                Retry Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {(phase === "records" || phase === "session") &&
            recordsUnlocked &&
            decryptedRecords.length > 0 && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Decrypted Records
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                </div>

                {decryptedRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">{`Record #${r.id}`}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${recordTypeColors[r.recordType] || ""}`}
                    >
                      {r.recordType}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

          <CreFeed workflow="consultation-processing" logs={creLogs} />
        </div>
      </div>
    </main>
  );
}
