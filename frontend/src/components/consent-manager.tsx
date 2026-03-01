"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, X } from "lucide-react";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { getConsents, revokeConsent, addAccessLog } from "@/lib/demo-api";
import { toast } from "sonner";

interface ConsentManagerProps {
  patientAddress: string;
}

export function ConsentManager({ patientAddress }: ConsentManagerProps) {
  const { data: consents, refresh } = useDemoPoll(
    () => getConsents(patientAddress),
    5000,
  );

  if (!consents || consents.length === 0) return null;

  const handleRevoke = async (
    id: string,
    doctorName: string,
    doctorAddress: string,
  ) => {
    await revokeConsent(id);
    await addAccessLog({
      patientAddress,
      accessorAddress: doctorAddress,
      accessorName: doctorName,
      action: "Consent revoked",
    });
    toast.success("Consent revoked");
    refresh();
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
        {consents.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{c.doctorName}</p>
              <div className="flex gap-1">
                {c.recordTypes.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-[10px] bg-primary/5"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
              onClick={() => handleRevoke(c.id, c.doctorName, c.doctorAddress)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Revoke
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
