"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Fingerprint } from "lucide-react";
import { usePasskey } from "@/hooks/use-passkey";
import { prepareContractCall } from "thirdweb";
import { getPatientConsent, getBookingRegistry } from "@/lib/contracts";
import { useSendTransaction } from "thirdweb/react";
import type { OnChainBooking } from "@/hooks/use-bookings";
import { toast } from "sonner";

const RECORD_TYPE_UINT: Record<string, number> = {
  health: 0,
  prescription: 1,
  certificate: 2,
  consultation: 3,
};

const RECORD_TYPE_LABELS: Record<number, string> = {
  0: "health",
  1: "prescription",
  2: "certificate",
  3: "consultation",
};

interface ConsentGrantDialogProps {
  booking: OnChainBooking;
  patientAddress: string;
  onGranted: () => void;
  onDeny: () => void;
}

export function ConsentGrantDialog({
  booking,
  patientAddress,
  onGranted,
  onDeny,
}: ConsentGrantDialogProps) {
  const { verify } = usePasskey();
  const { mutateAsync: sendTx } = useSendTransaction();

  // Map numeric requestedRecordTypes to string labels for UI
  const initialTypes =
    booking.requestedRecordTypes.length > 0
      ? booking.requestedRecordTypes.map(
          (n) => RECORD_TYPE_LABELS[n] ?? "health",
        )
      : ["health", "prescription"];

  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [isGranting, setIsGranting] = useState(false);

  const allTypes = ["health", "consultation", "prescription", "certificate"];

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleGrant = async () => {
    setIsGranting(true);
    try {
      await verify();

      // Grant on-chain for each selected record type
      for (const t of selectedTypes) {
        const typeUint = RECORD_TYPE_UINT[t] ?? 0;
        try {
          const tx = prepareContractCall({
            contract: getPatientConsent(),
            method: "grantAccess",
            params: [
              booking.doctor as `0x${string}`,
              typeUint,
              BigInt(24 * 60 * 60), // 24 hours
            ],
          });
          await sendTx(tx);
        } catch {
          // On-chain grant failed for this type — continue with others
        }
      }

      // Update booking status to access-granted on-chain
      try {
        await sendTx(
          prepareContractCall({
            contract: getBookingRegistry(),
            method: "updateStatus",
            params: [BigInt(booking.id), 2],
          }),
        );
      } catch {
        // non-fatal: status update failed
      }

      toast.success("Access granted to " + booking.doctorName);
      onGranted();
    } catch {
      toast.error("Passkey verification failed");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDeny()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            Access Request from {booking.doctorName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {booking.doctorName} ({booking.specialty}) is requesting access to
            your health records for consultation.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-medium">Record types to share:</p>
            <div className="flex flex-wrap gap-2">
              {allTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    selectedTypes.includes(t)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted/50 text-muted-foreground border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Your records will be decrypted inside a CRE TEE enclave. The doctor
            can only view them during the consultation session.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onDeny}>
              Deny
            </Button>
            <Button
              className="flex-1"
              onClick={handleGrant}
              disabled={isGranting || selectedTypes.length === 0}
            >
              <Fingerprint className="h-4 w-4 mr-1" />
              {isGranting ? "Verifying..." : "Grant with Passkey"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
