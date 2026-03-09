"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DecryptRequest } from "@/components/decrypt-request";
import { LiveTranscript } from "@/components/live-transcript";
import { AiResults } from "@/components/ai-results";
import { CreFeed } from "@/components/cre-feed";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { triggerWorkflow } from "@/lib/cre";
import { useCreLogs, FUJI_EXPLORER } from "@/hooks/use-cre-logs";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { useBooking } from "@/hooks/use-bookings";
import { useConsultationResult } from "@/hooks/use-consultation-result";
import { useOnChainRecords } from "@/hooks/use-onchain-records";
import {
  getBookingRegistry,
  getPatientConsent,
  prepareContractCall,
} from "@/lib/contracts";
import { toast } from "sonner";

type ConsultationPhase = "access" | "session" | "results";

const RECORD_TYPE_LABELS: Record<number, string> = {
  0: "health",
  1: "prescription",
  2: "certificate",
  3: "consultation",
};

export default function PatientConsultationPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const bookingId = Number(consultationId);
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();
  const { booking, isLoading: bookingLoading } = useBooking(bookingId);
  const { result: consultationResult, isLoading: resultLoading } =
    useConsultationResult(bookingId);
  const { records: myRecords } = useOnChainRecords(account?.address);
  const [phase, setPhase] = useState<ConsultationPhase>("access");
  const [creActive, setCreActive] = useState(false);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    null,
  );
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();

  // Derive phase from booking status
  useEffect(() => {
    if (!booking) return;
    if (booking.status === 4) {
      setPhase("results");
    } else if (booking.status === 3) {
      setPhase("session");
    } else {
      setPhase("access");
    }
  }, [booking]);

  // When booking is completed, use consultation result from hook
  useEffect(() => {
    if (booking?.status === 4 && consultationResult) {
      setResultData(consultationResult as unknown as Record<string, unknown>);
      setPhase("results");
    }
  }, [booking, consultationResult]);

  // Grant initial consent (patient skipped during booking)
  const handleGrantInitialConsent = async () => {
    if (!booking || !account?.address) return;
    setCreActive(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");

    try {
      pushLog("INFO", "Granting consent on PatientConsent contract...");
      const grantTx = prepareContractCall({
        contract: getPatientConsent(),
        method: "grantAccess",
        params: [booking.doctor as `0x${string}`, 0, BigInt(86400)],
      });
      await sendTx(grantTx);
      pushLog("OK", "Access granted on-chain");

      // Update booking status to AccessGranted (2)
      await sendTx(
        prepareContractCall({
          contract: getBookingRegistry(),
          method: "updateStatus",
          params: [BigInt(booking.id), 2],
        }),
      );
      pushLog("OK", "Booking status updated");

      // Trigger provider-decryption workflow
      const recordTypes = [...new Set(myRecords.map((r) => r.recordType))];
      pushLog("INFO", "Triggering provider-decryption workflow...");
      const result = await triggerWorkflow("provider-decryption", {
        patientAddress: account.address,
        doctorAddress: booking.doctor,
        consultationId: String(booking.id),
        recordTypes,
      });

      if (result.success) {
        if (result.txHash) {
          pushLog(
            "OK",
            "Tx confirmed on Avalanche Fuji",
            `${FUJI_EXPLORER}/${result.txHash}`,
          );
        }
        pushLog("OK", "Workflow complete");
      } else {
        pushLog("ERR", result.error ?? "Provider decryption workflow failed");
      }

      toast.success("Access granted successfully");
      setCreActive(false);
    } catch (err) {
      pushLog("ERR", err instanceof Error ? err.message : "Consent failed");
      setCreActive(false);
      toast.error("Failed to grant access");
    }
  };

  // Grant additional access (doctor requested extra types)
  const handleGrantAdditionalAccess = async () => {
    if (!booking || !account?.address) return;
    setCreActive(true);
    clearLogs();
    pushLog("INFO", "Granting additional access...");

    try {
      // Update booking status back to AccessGranted (2)
      await sendTx(
        prepareContractCall({
          contract: getBookingRegistry(),
          method: "updateStatus",
          params: [BigInt(booking.id), 2],
        }),
      );
      pushLog("OK", "Additional access granted");

      // Trigger provider-decryption for the new types
      const newTypes = booking.requestedRecordTypes.map(
        (n) => RECORD_TYPE_LABELS[n] ?? "health",
      );
      pushLog("INFO", "Triggering provider-decryption workflow...");
      const result = await triggerWorkflow("provider-decryption", {
        patientAddress: account.address,
        doctorAddress: booking.doctor,
        consultationId: String(booking.id),
        recordTypes: newTypes,
      });

      if (result.success) {
        if (result.txHash) {
          pushLog(
            "OK",
            "Tx confirmed on Avalanche Fuji",
            `${FUJI_EXPLORER}/${result.txHash}`,
          );
        }
        pushLog("OK", "Workflow complete");
      } else {
        pushLog("ERR", result.error ?? "Provider decryption failed");
      }

      toast.success("Additional access granted");
      setCreActive(false);
    } catch (err) {
      pushLog("ERR", err instanceof Error ? err.message : "Failed");
      setCreActive(false);
      toast.error("Failed to grant additional access");
    }
  };

  const handleDenyAdditionalAccess = () => {
    toast.info("Additional access denied. Doctor will be notified.");
  };

  const doctorName = booking?.doctorName || "Doctor";
  const specialty = booking?.specialty || "";
  const sharedTypes = [...new Set(myRecords.map((r) => r.recordType))];

  const phaseBadge = () => {
    switch (phase) {
      case "access":
        if (booking?.status === 0)
          return {
            label: "Awaiting Consent",
            className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          };
        if (booking?.status === 1)
          return {
            label: "Additional Request Pending",
            className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          };
        return {
          label: "Access Granted",
          className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "session":
        return {
          label: "In Session",
          className: "bg-green-500/10 text-green-400 border-green-500/20",
        };
      case "results":
        return {
          label: "Completed",
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
            {doctorName}
            {specialty ? ` — ${specialty}` : ""}
          </p>
        </div>
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Phase: Access Dashboard */}
          {phase === "access" && (
            <div className="space-y-4">
              {/* Current Access Status */}
              <div className="rounded-lg border border-border p-5 space-y-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Record Access Status
                </p>

                {booking?.status === 0 ? (
                  /* Patient hasn't granted initial consent */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You haven&apos;t shared your records with {doctorName}{" "}
                      yet. Grant access so they can prepare for your
                      consultation.
                    </p>

                    {myRecords.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {sharedTypes.map((type) => (
                            <div
                              key={type}
                              className="flex items-center justify-between rounded-lg border border-border p-3"
                            >
                              <span className="text-sm capitalize flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {type}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {
                                  myRecords.filter((r) => r.recordType === type)
                                    .length
                                }{" "}
                                records
                              </Badge>
                            </div>
                          ))}
                        </div>

                        <DecryptRequest
                          doctorName={doctorName}
                          doctorAddress={booking?.doctor || ""}
                          recordTypes={sharedTypes}
                          onApprove={handleGrantInitialConsent}
                          onDeny={() => {}}
                        />
                      </>
                    ) : (
                      <div className="text-center py-6 space-y-2">
                        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          You have no records uploaded yet.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload records from your dashboard so your doctor can
                          review them.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Status >= 1 — consent was granted during booking */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Access granted to {doctorName}
                    </div>

                    {sharedTypes.length > 0 ? (
                      <div className="space-y-2">
                        {sharedTypes.map((type) => (
                          <div
                            key={type}
                            className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                          >
                            <span className="text-sm capitalize flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              {type}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            >
                              {
                                myRecords.filter((r) => r.recordType === type)
                                  .length
                              }{" "}
                              shared
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No records uploaded yet. The consultation can still
                        proceed.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pending Additional Requests from Doctor */}
              {booking?.status === 1 &&
                booking.requestedRecordTypes.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
                    <p className="text-sm font-medium flex items-center gap-2 text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      Additional Access Requested
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {doctorName} is requesting access to additional record
                      types for this consultation.
                    </p>
                    <div className="space-y-2">
                      {booking.requestedRecordTypes.map((typeNum) => {
                        const label = RECORD_TYPE_LABELS[typeNum] ?? "unknown";
                        return (
                          <div
                            key={typeNum}
                            className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-3"
                          >
                            <span className="text-sm capitalize flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-400" />
                              {label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20"
                            >
                              Requested
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <DecryptRequest
                      doctorName={doctorName}
                      doctorAddress={booking.doctor}
                      recordTypes={booking.requestedRecordTypes.map(
                        (n) => RECORD_TYPE_LABELS[n] ?? "health",
                      )}
                      onApprove={handleGrantAdditionalAccess}
                      onDeny={handleDenyAdditionalAccess}
                    />
                  </div>
                )}

              {/* Waiting for doctor */}
              {booking && booking.status >= 2 && booking.status < 3 && (
                <div className="rounded-lg border border-border p-6 space-y-3">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">
                        Waiting for {doctorName} to Start
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Your records are shared and ready. The doctor will start
                        the consultation when they&apos;re ready. This page
                        auto-refreshes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {creActive && (
                <CreFeed workflow="provider-decryption" logs={creLogs} />
              )}
            </div>
          )}

          {/* Phase: Session */}
          {phase === "session" && (
            <LiveTranscript onTranscriptComplete={() => setPhase("results")} />
          )}

          {/* Phase: Results */}
          {phase === "results" && (
            <AiResults
              results={resultData as Parameters<typeof AiResults>[0]["results"]}
              proof={
                (resultData?.proof as {
                  signature: string;
                  model: string;
                  timestamp: number;
                }) ?? undefined
              }
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Access summary sidebar */}
          {phase === "access" && booking && booking.status >= 1 && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Consultation Details
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor</span>
                  <span className="font-medium">{doctorName}</span>
                </div>
                {specialty && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Specialty</span>
                    <span>{specialty}</span>
                  </div>
                )}
                {booking.date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{booking.date}</span>
                  </div>
                )}
                {booking.time && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{booking.time}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span>${(booking.fee / 1_000_000).toFixed(2)} KUSD</span>
                </div>
              </div>
            </div>
          )}

          {!creActive && (
            <CreFeed workflow="provider-decryption" logs={creLogs} />
          )}
        </div>
      </div>
    </main>
  );
}
