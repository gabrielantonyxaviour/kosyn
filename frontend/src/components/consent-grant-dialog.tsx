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
import { grantConsent, updateBooking, addAccessLog } from "@/lib/demo-api";
import type { DemoBooking } from "@/app/api/demo/store";
import { toast } from "sonner";

interface ConsentGrantDialogProps {
  booking: DemoBooking;
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
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    booking.requestedRecordTypes || ["health", "prescription"],
  );
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
      await grantConsent({
        patientAddress,
        doctorAddress: booking.doctorAddress,
        doctorName: booking.doctorName,
        recordTypes: selectedTypes,
        bookingId: booking.id,
      });
      await updateBooking(booking.id, "access-granted");
      await addAccessLog({
        patientAddress,
        accessorAddress: booking.doctorAddress,
        accessorName: booking.doctorName,
        action: `Consent granted for ${selectedTypes.join(", ")} records`,
        consultationId: booking.consultationId,
      });
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
