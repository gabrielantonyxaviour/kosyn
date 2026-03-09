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
import { FileText, Lock, CheckCircle2, Fingerprint } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { triggerWorkflow } from "@/lib/cre";
import { encryptForTee } from "@/lib/crypto";
import { toast } from "sonner";
import {
  getBooking,
  updateBooking,
  addAccessLog,
  getRecords,
  saveConsultationResult,
} from "@/lib/demo-api";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { usePasskey } from "@/hooks/use-passkey";
import type { DemoBooking, DemoRecord } from "@/app/api/demo/store";
import type { TranscriptEvent } from "@/lib/assemblyai";

const recordTypeColors: Record<string, string> = {
  health: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  consultation: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  prescription: "bg-green-500/10 text-green-400 border-green-500/20",
  certificate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

type Phase = "request-access" | "session" | "results" | "error";

const RECORD_TYPES: { value: string; label: string }[] = [
  { value: "health", label: "Health Records" },
  { value: "consultation", label: "Consultation Notes" },
  { value: "prescription", label: "Prescriptions" },
  { value: "certificate", label: "Certificates" },
];

export default function DoctorConsultationPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const account = useActiveAccount();
  const [phase, setPhase] = useState<Phase>("request-access");
  const [creActive, setCreActive] = useState(false);
  const [booking, setBooking] = useState<DemoBooking | null>(null);
  const [patientRecords, setPatientRecords] = useState<DemoRecord[]>([]);
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([
    "health",
    "prescription",
  ]);
  const [creResult, setCreResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [creError, setCreError] = useState<string | null>(null);

  // Item 2: Passkey-gated record decryption
  const [recordsUnlocked, setRecordsUnlocked] = useState(false);
  const { verify: passkeyVerify, isLoading: passkeyLoading } = usePasskey();

  // Item 3d: 30-min grace period countdown
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [graceSecs, setGraceSecs] = useState<number>(30 * 60);

  // Item 5: Smart record selection state
  const [pendingTranscript, setPendingTranscript] = useState<
    TranscriptEvent[] | null
  >(null);
  const [recommendedRecordIds, setRecommendedRecordIds] = useState<number[]>(
    [],
  );
  const [selectedForCre, setSelectedForCre] = useState<DemoRecord[]>([]);
  const [selectingRecords, setSelectingRecords] = useState(false);

  // Fetch booking on mount
  useEffect(() => {
    getBooking(consultationId).then((b) => {
      if (b) {
        setBooking(b);
        if (b.status === "access-granted" || b.status === "in-session") {
          setPhase("session");
        } else if (b.status === "completed") {
          setPhase("results");
        }
      }
    });
  }, [consultationId]);

  // Poll booking status during request-access phase
  const { data: polledBooking } = useDemoPoll(
    () => getBooking(consultationId),
    2000,
  );

  useEffect(() => {
    if (
      polledBooking &&
      phase === "request-access" &&
      (polledBooking.status === "access-granted" ||
        polledBooking.status === "in-session")
    ) {
      void Promise.resolve().then(() => {
        setBooking(polledBooking);
        setPhase("session");
        toast.success("Patient has granted access. Starting session.");
      });
    }
  }, [polledBooking, phase]);

  // Item 3d: Grace period countdown effect
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
        setPatientRecords([]);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [completedAt]);

  const handleRequestAccess = async () => {
    if (!booking) return;
    await updateBooking(booking.id, "access-requested", {
      requestedRecordTypes: selectedRecordTypes,
    });
    await addAccessLog({
      patientAddress: booking.patientAddress,
      accessorAddress:
        account?.address ?? "0x0000000000000000000000000000000000000000",
      accessorName: "Doctor",
      action: `Requested access to ${selectedRecordTypes.join(", ")} records`,
      consultationId: booking.consultationId,
    });
    setBooking({ ...booking, status: "access-requested" });
    toast.info("Access request sent. Waiting for patient approval...");
  };

  // Item 2: Passkey unlock handler
  const handleUnlockRecords = async () => {
    if (!booking?.patientAddress) return;
    const ok = await passkeyVerify();
    if (ok) {
      const recs = await getRecords(booking.patientAddress);
      setPatientRecords(recs);
      setRecordsUnlocked(true);
      await addAccessLog({
        patientAddress: booking.patientAddress,
        accessorAddress:
          account?.address ?? "0x0000000000000000000000000000000000000000",
        accessorName: "Doctor",
        action: "Passkey-authenticated record access",
        consultationId: booking.consultationId,
      });
      toast.success("Records unlocked.");
    } else {
      toast.error("Passkey verification failed.");
    }
  };

  // Item 3d: Format grace period
  const formatGrace = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Item 5: Modified handleTranscriptComplete — stages record selection first
  const handleTranscriptComplete = async (entries: TranscriptEvent[]) => {
    if (!booking) return;
    setPendingTranscript(entries);

    // Pre-select all records, then get AI recommendations
    setSelectedForCre(patientRecords);

    if (patientRecords.length > 0) {
      try {
        const res = await fetch("/api/ai/select-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: entries
              .map((e) => `${e.speaker}: ${e.text}`)
              .join("\n"),
            records: patientRecords.map((r) => ({
              id: r.id,
              recordType: r.recordType,
              label: r.label,
              formData: r.formData,
            })),
          }),
        });
        const { selectedIds } = (await res.json()) as { selectedIds: number[] };
        setRecommendedRecordIds(selectedIds);
        setSelectedForCre(
          patientRecords.filter((r) => selectedIds.includes(r.id)),
        );
      } catch {
        // fallback: use all records
      }
    }
    setSelectingRecords(true);
  };

  // Item 5: Proceed with CRE analysis after record selection
  const handleProceedWithAnalysis = async () => {
    if (!booking || !pendingTranscript) return;
    setSelectingRecords(false);
    setCreActive(true);
    toast.info("Processing consultation in CRE TEE...");

    await updateBooking(booking.id, "in-session");

    // Encrypt transcript with CRE TEE public key before sending
    // Only the CRE TEE can decrypt it — node operators never see plaintext
    const rawTranscript = pendingTranscript
      .map((e) => `${e.speaker}: ${e.text}`)
      .join("\n");

    const crePubKey = process.env.NEXT_PUBLIC_CRE_MARKETPLACE_PUBKEY;
    let encryptedTranscript: string;
    if (crePubKey) {
      encryptedTranscript = await encryptForTee(rawTranscript, crePubKey);
    } else {
      // Fallback: send plaintext if CRE public key not configured
      encryptedTranscript = btoa(rawTranscript);
    }

    const result = await triggerWorkflow("consultation-processing", {
      consultationId: booking.consultationId,
      patientAddress: booking.patientAddress,
      encryptedTranscript,
      patientRecords: selectedForCre.map((r) => ({
        type: r.recordType,
        label: r.label,
        data: r.formData,
      })),
    });

    if (!result.success) {
      setCreActive(false);
      setCreError(
        result.error ??
          "The CRE service is currently offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
      );
      setPhase("error");
      toast.error("CRE service is offline — consultation processing failed.");
      return;
    }

    const ipfsCid = result.data?.ipfsCid as string | undefined;
    if (!ipfsCid) {
      setCreActive(false);
      setCreError(
        "The CRE service returned no results. It may be offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
      );
      setPhase("error");
      toast.error("CRE service returned no results.");
      return;
    }

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
      setCreActive(false);
      setCreError(
        e instanceof Error
          ? e.message
          : "Failed to fetch results. The CRE service may be offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
      );
      setPhase("error");
      toast.error("Failed to fetch consultation results.");
      return;
    }

    await saveConsultationResult({
      consultationId: booking.consultationId,
      ...resultData,
      completedAt: Date.now(),
    });

    await updateBooking(booking.id, "completed");
    await addAccessLog({
      patientAddress: booking.patientAddress,
      accessorAddress:
        account?.address ?? "0x0000000000000000000000000000000000000000",
      accessorName: "Doctor",
      action: "Consultation completed — AI analysis generated",
      consultationId: booking.consultationId,
    });

    try {
      await fetch("/api/records/encrypt-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: resultData,
          patientAddress: booking.patientAddress,
          label: `Consultation — ${new Date().toLocaleDateString()}`,
          doctorAddress:
            account?.address ?? "0x0000000000000000000000000000000000000000",
          consultationId: booking.consultationId,
        }),
      });
      toast.success(
        "Consultation notes encrypted and saved to patient record.",
      );
    } catch {
      // non-fatal
    }

    setTimeout(() => {
      setCreResult(resultData);
      setPhase("results");
      setCreActive(false);
      setCompletedAt(Date.now());
      toast.success("AI analysis complete. Results available.");
    }, 6000);
  };

  const toggleRecordType = (t: string) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const patientName = booking?.patientName || "Patient";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultation #{consultationId}</h1>
          <p className="text-sm text-muted-foreground">
            Patient: {patientName}
            {booking ? ` — ${booking.specialty}` : ""}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            phase === "request-access"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : phase === "session"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : phase === "error"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }
        >
          {phase === "request-access"
            ? booking?.status === "access-requested"
              ? "Waiting for Patient"
              : "Request Access"
            : phase === "session"
              ? "In Session"
              : phase === "error"
                ? "Error"
                : "Review Results"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 1: Request Access */}
          {phase === "request-access" && (
            <div className="rounded-lg border border-border p-5 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Request Record Access
              </p>
              <p className="text-sm text-muted-foreground">
                Select the record types you need to review for this
                consultation. The patient will be prompted to approve access via
                passkey.
              </p>
              <div className="space-y-2">
                {RECORD_TYPES.map((rt) => (
                  <label
                    key={rt.value}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecordTypes.includes(rt.value)}
                      onChange={() => toggleRecordType(rt.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{rt.label}</span>
                  </label>
                ))}
              </div>
              {booking?.status === "access-requested" ? (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                  <p className="text-sm text-amber-400">
                    Waiting for patient to approve access...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The patient will see a passkey prompt on their dashboard.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleRequestAccess}
                  disabled={selectedRecordTypes.length === 0}
                  className="w-full"
                >
                  Request Access
                </Button>
              )}
            </div>
          )}

          {/* Phase 2: Session */}
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

              {/* Item 5: Record selection UI */}
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
                    {patientRecords.map((record) => (
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
                          <p className="text-sm">
                            {record.label || `Record #${record.id}`}
                          </p>
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
                    {patientRecords.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No unlocked records available. Proceeding without record
                        context.
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

          {/* Phase 3: Results */}
          {phase === "results" && (
            <>
              {/* Item 3d: Grace period indicator */}
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
                  {graceSecs === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRequestAccess}
                      className="text-xs h-7"
                    >
                      Request Extension
                    </Button>
                  )}
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
                      patientAddress={booking.patientAddress}
                      consultationId={booking.consultationId}
                      doctorName={booking.doctorName}
                      doctorAddress={
                        account?.address ??
                        "0x0000000000000000000000000000000000000000"
                      }
                    />
                  )}
                </TabsContent>
                {/* Item 4c-d: AiChat with patient record context */}
                <TabsContent value="chat" className="mt-4 min-h-[400px]">
                  <AiChat contextRecords={patientRecords} />
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

        <div className="space-y-4">
          {/* Patient records sidebar — Item 2: passkey-gated */}
          {phase === "session" && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Patient Records
              </p>

              {!recordsUnlocked ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                  <Fingerprint className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Records are encrypted. Verify your identity to access.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUnlockRecords}
                    disabled={passkeyLoading}
                    className="text-xs"
                  >
                    <Fingerprint className="h-3.5 w-3.5 mr-1.5" />
                    {passkeyLoading ? "Verifying..." : "Unlock Patient Records"}
                  </Button>
                </div>
              ) : (
                <>
                  {patientRecords.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No records available yet.
                    </p>
                  ) : (
                    patientRecords.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">
                            {r.label || `Record #${r.id}`}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${recordTypeColors[r.recordType] || ""}`}
                        >
                          {r.recordType}
                        </Badge>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Item 2: Access status badge */}
              <div className="flex items-center justify-between rounded-lg border border-border p-2 mt-2">
                <div className="flex items-center gap-2">
                  {recordsUnlocked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-xs">Access Status</span>
                </div>
                {recordsUnlocked ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Decrypted
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
            </div>
          )}

          <CreFeed workflow="consultation-processing" isActive={creActive} />
        </div>
      </div>
    </main>
  );
}
