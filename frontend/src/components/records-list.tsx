"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Stethoscope,
  Award,
  Pill,
  Lock,
  Plus,
  Wifi,
} from "lucide-react";
import { format } from "date-fns";
import {
  useOnChainRecords,
  type RecordType,
} from "@/hooks/use-onchain-records";
import { PasskeyDecrypt } from "./passkey-decrypt";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";

const typeConfig: Record<
  RecordType,
  { icon: typeof FileText; label: string; color: string }
> = {
  health: {
    icon: FileText,
    label: "Health",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  consultation: {
    icon: Stethoscope,
    label: "Consultation",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  certificate: {
    icon: Award,
    label: "Certificate",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  prescription: {
    icon: Pill,
    label: "Prescription",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
  },
};

const filters: RecordType[] = [
  "health",
  "consultation",
  "certificate",
  "prescription",
];

export function RecordsList() {
  const account = useActiveAccount();
  const { records, isLoading } = useOnChainRecords(account?.address);
  const [activeFilter, setActiveFilter] = useState<RecordType | "all">("all");
  const router = useRouter();

  const filtered =
    activeFilter === "all"
      ? records
      : records.filter((r) => r.recordType === activeFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
          >
            All
          </Button>
          {filters.map((f) => {
            const cfg = typeConfig[f];
            return (
              <Button
                key={f}
                variant={activeFilter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(f)}
              >
                {cfg.label}
              </Button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patients/records/share")}
          >
            <Wifi className="h-4 w-4 mr-1" />
            Share Data
          </Button>
          <Link href="/patients/records/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Record
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {activeFilter === "all"
              ? "No records yet. Create your first health record to get started."
              : `No ${activeFilter} records found.`}
          </p>
          {activeFilter === "all" && (
            <Link href="/patients/records/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create Your First Record
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Encryption</TableHead>
                <TableHead className="text-right">Decrypt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => {
                const cfg = typeConfig[record.recordType];
                const Icon = cfg.icon;
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {`${cfg.label} Record #${record.id}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.color}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(
                        new Date(record.uploadTimestamp * 1000),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        AES-256-GCM
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <PasskeyDecrypt size="sm" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
