"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DecryptRequest } from "@/components/decrypt-request";
import { LiveTranscript } from "@/components/live-transcript";
import { AiResults } from "@/components/ai-results";
import { CreFeed } from "@/components/cre-feed";
import { Badge } from "@/components/ui/badge";
import {
  getBooking,
  grantConsent,
  updateBooking,
  addAccessLog,
  getConsultationResult,
} from "@/lib/demo-api";
import { useActiveAccount } from "thirdweb/react";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import type { DemoBooking } from "@/app/api/demo/store";

type ConsultationPhase = "decrypt" | "session" | "results";

export default function PatientConsultationPage() {
  const params = useParams();
  const consultationId = params.id as string;
  const account = useActiveAccount();
  const [phase, setPhase] = useState<ConsultationPhase>("decrypt");
  const [creActive, setCreActive] = useState(false);
  const [booking, setBooking] = useState<DemoBooking | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    null,
  );

  // Fetch booking on mount
  useEffect(() => {
    getBooking(consultationId).then((b) => {
      if (b) {
        setBooking(b);
        if (b.status === "access-granted" || b.status === "in-session") {
          setPhase("session");
        } else if (b.status === "completed") {
          setPhase("results");
          getConsultationResult(b.consultationId).then((r) => {
            if (r) setResultData(r as unknown as Record<string, unknown>);
          });
        }
      }
    });
  }, [consultationId]);

  // Poll booking for status changes (e.g. completed by doctor)
  const { data: polledBooking } = useDemoPoll(
    () => getBooking(consultationId),
    3000,
  );

  useEffect(() => {
    if (!polledBooking) return;
    if (phase === "session" && polledBooking.status === "completed") {
      getConsultationResult(polledBooking.consultationId).then((r) => {
        if (r) setResultData(r as unknown as Record<string, unknown>);
        setPhase("results");
      });
    }
  }, [polledBooking, phase]);

  const handleDecryptApprove = async () => {
    if (!booking) return;
    setCreActive(true);

    const patientAddr =
      account?.address ?? "0x0000000000000000000000000000000000000000";

    await grantConsent({
      patientAddress: patientAddr,
      doctorAddress: booking.doctorAddress,
      doctorName: booking.doctorName,
      recordTypes: booking.requestedRecordTypes || ["health", "prescription"],
      bookingId: booking.id,
    });
    await updateBooking(booking.id, "access-granted");
    await addAccessLog({
      patientAddress: patientAddr,
      accessorAddress: booking.doctorAddress,
      accessorName: booking.doctorName,
      action: "Consent granted — records decrypted in TEE",
      consultationId: booking.consultationId,
    });

    setTimeout(() => {
      setPhase("session");
      setCreActive(false);
    }, 4000);
  };

  const doctorName = booking?.doctorName || "Doctor";
  const specialty = booking?.specialty || "";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultation #{consultationId}</h1>
          <p className="text-sm text-muted-foreground">
            {doctorName}
            {specialty ? ` — ${specialty}` : ""}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            phase === "session"
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : phase === "results"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }
        >
          {phase === "decrypt"
            ? "Awaiting Approval"
            : phase === "session"
              ? "In Session"
              : "Completed"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {phase === "decrypt" && (
            <DecryptRequest
              doctorName={doctorName}
              doctorAddress={booking?.doctorAddress || "0x0000...0000"}
              recordTypes={
                booking?.requestedRecordTypes || ["health", "prescription"]
              }
              onApprove={handleDecryptApprove}
              onDeny={() => {}}
            />
          )}
          {phase === "session" && (
            <LiveTranscript onTranscriptComplete={() => setPhase("results")} />
          )}
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

        <div>
          <CreFeed workflow="provider-decryption" isActive={creActive} />
        </div>
      </div>
    </main>
  );
}
