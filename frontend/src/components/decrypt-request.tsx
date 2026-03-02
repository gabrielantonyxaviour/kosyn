"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Fingerprint, Check, X } from "lucide-react";
import { usePasskey } from "@/hooks/use-passkey";

interface DecryptRequestProps {
  doctorName: string;
  doctorAddress: string;
  recordTypes: string[];
  onApprove: () => void;
  onDeny: () => void;
}

export function DecryptRequest({
  doctorName,
  doctorAddress,
  recordTypes,
  onApprove,
  onDeny,
}: DecryptRequestProps) {
  const { isLoading, verify } = usePasskey();

  const handleApprove = async () => {
    const ok = await verify();
    if (ok) onApprove();
  };

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          Decrypt Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">{doctorName}</span> is requesting
            access to your health records.
          </p>
          <code className="text-xs text-muted-foreground font-mono block">
            {doctorAddress}
          </code>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Requested record types:
          </p>
          <div className="flex flex-wrap gap-1">
            {recordTypes.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p>Records will be decrypted inside a CRE TEE enclave.</p>
          <p>Access is ephemeral and auto-revokes after consultation.</p>
          <p>All access is logged on-chain with CRE attestation.</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1"
          >
            <Fingerprint className="h-4 w-4 mr-1" />
            {isLoading ? "Verifying..." : "Approve with Passkey"}
          </Button>
          <Button variant="outline" onClick={onDeny} className="flex-1">
            <X className="h-4 w-4 mr-1" />
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
