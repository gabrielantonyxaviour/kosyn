"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, X } from "lucide-react";
import { usePatientConsents } from "@/hooks/use-onchain-consents";
import { useDoctorsList } from "@/hooks/use-doctors-list";
import { prepareContractCall } from "thirdweb";
import { getPatientConsent } from "@/lib/contracts";
import { useSendTransaction } from "thirdweb/react";
import { toast } from "sonner";

const RECORD_TYPE_LABELS: Record<number, string> = {
  0: "health",
  1: "prescription",
  2: "certificate",
  3: "consultation",
};

interface ConsentManagerProps {
  patientAddress: string;
}

export function ConsentManager({ patientAddress }: ConsentManagerProps) {
  const { consents } = usePatientConsents(patientAddress);
  const { doctors } = useDoctorsList();
  const { mutateAsync: sendTx } = useSendTransaction();

  if (!consents || consents.length === 0) return null;

  const doctorNameMap = new Map(
    doctors.map((d) => [d.address.toLowerCase(), d.name]),
  );

  const handleRevoke = async (providerAddress: string) => {
    const doctorName =
      doctorNameMap.get(providerAddress.toLowerCase()) ||
      `${providerAddress.slice(0, 6)}...${providerAddress.slice(-4)}`;

    try {
      const tx = prepareContractCall({
        contract: getPatientConsent(),
        method: "revokeAccess",
        params: [providerAddress as `0x${string}`],
      });
      await sendTx(tx);
      toast.success(`Consent revoked for ${doctorName}`);
    } catch {
      toast.error("Failed to revoke consent on-chain");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Active Consents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {consents.map((c, idx) => {
          const name =
            doctorNameMap.get(c.providerAddress.toLowerCase()) ||
            `${c.providerAddress.slice(0, 6)}...${c.providerAddress.slice(-4)}`;
          return (
            <div
              key={`${c.providerAddress}-${c.recordType}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{name}</p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px] bg-primary/5">
                    {RECORD_TYPE_LABELS[c.recordType] ?? `type-${c.recordType}`}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => handleRevoke(c.providerAddress)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Revoke
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
