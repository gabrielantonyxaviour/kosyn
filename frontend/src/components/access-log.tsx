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
import { useRouter } from "next/navigation";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { getAccessLogs } from "@/lib/demo-api";
import type { DemoAccessLog } from "@/app/api/demo/store";

interface AccessLogProps {
  patientAddress?: string;
}

export function AccessLog({ patientAddress }: AccessLogProps) {
  const router = useRouter();
  const { data: liveLogs } = useDemoPoll(
    () =>
      patientAddress
        ? getAccessLogs(patientAddress)
        : Promise.resolve([] as DemoAccessLog[]),
    5000,
  );

  const logs = liveLogs || [];

  if (logs.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Access History
        </h2>
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No access logs yet. Logs will appear when doctors access your
            records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">
        Access History
      </h2>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accessor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  if (log.consultationId) {
                    router.push(`/patients/consultation/${log.consultationId}`);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {log.accessorName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.action}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(log.timestamp), "MMM d, h:mm a")}
                </TableCell>
                <TableCell>
                  <code className="text-xs text-muted-foreground font-mono">
                    {log.accessorAddress.slice(0, 6)}...
                    {log.accessorAddress.slice(-4)}
                  </code>
                </TableCell>
                <TableCell className="text-right">
                  {log.hasAttestation && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1"
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
