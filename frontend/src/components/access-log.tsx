"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useAccessLogs } from "@/hooks/use-access-logs";
import { useReadContract } from "thirdweb/react";
import { getHIPAAComplianceRegistry } from "@/lib/contracts";

interface AccessLogProps {
  patientAddress?: string;
}

export function AccessLog({ patientAddress }: AccessLogProps) {
  const { logs } = useAccessLogs(patientAddress);

  // On-chain attestation count for compliance badge
  const { data: attestationIds } = useReadContract({
    contract: getHIPAAComplianceRegistry(),
    method: "getPatientAttestations",
    params: [patientAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!patientAddress },
  });

  const hasAttestations = (attestationIds?.length ?? 0) > 0;

  if (logs.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <h2 className="text-sm font-medium text-muted-foreground mb-2 shrink-0">
          Access History
        </h2>
        <div className="rounded-lg border border-border p-6 text-center flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No access logs yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <h2 className="text-sm font-medium text-muted-foreground mb-2 shrink-0">
        Access History
      </h2>
      <div className="rounded-lg border border-border overflow-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accessor</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={`${log.recordId}-${log.timestamp}`}
                className="hover:bg-muted/50"
              >
                <TableCell className="font-medium text-xs">
                  {log.providerName}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {format(new Date(log.timestamp * 1000), "MMM d, h:mm a")}
                </TableCell>
                <TableCell className="text-right">
                  {(log.granted || hasAttestations) && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 text-[10px]"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      CRE
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
