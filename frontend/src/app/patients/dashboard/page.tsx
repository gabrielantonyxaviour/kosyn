"use client";

import { AccessLog } from "@/components/access-log";
import { ConsentGrantDialog } from "@/components/consent-grant-dialog";
import { ConsentManager } from "@/components/consent-manager";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import {
  usePatientBookings,
  BOOKING_STATUS_LABELS,
} from "@/hooks/use-bookings";
import { getBookingRegistry, getPatientRegistry } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PatientAiChat } from "@/components/patient-ai-chat";

const statusColors: Record<number, string> = {
  0: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  1: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  2: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  3: "bg-green-500/10 text-green-400 border-green-500/20",
  4: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const account = useActiveAccount();
  const router = useRouter();
  const address = account?.address ?? "";
  const { mutateAsync: sendTx } = useSendTransaction();

  const { data: isRegistered, isLoading: registryLoading } = useReadContract({
    contract: getPatientRegistry(),
    method: "isRegistered",
    params: [
      (address ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
    ],
    queryOptions: { enabled: !!address },
  });

  useEffect(() => {
    if (!address || registryLoading) return;
    if (!isRegistered) {
      router.replace("/patients/onboarding");
    }
  }, [address, isRegistered, registryLoading, router]);

  const { bookings, refetch: refreshBookings } = usePatientBookings(address);

  const accessRequests = bookings.filter((b) => b.status === 1);

  if (!address || registryLoading || !isRegistered) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Access request dialogs */}
      {accessRequests.map((b) => (
        <ConsentGrantDialog
          key={b.id}
          booking={b}
          patientAddress={address}
          onGranted={refreshBookings}
          onDeny={async () => {
            const tx = prepareContractCall({
              contract: getBookingRegistry(),
              method: "updateStatus",
              params: [BigInt(b.id), 0],
            });
            await sendTx(tx);
            refreshBookings();
          }}
        />
      ))}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your consents, consultations, and record access.
        </p>
      </div>

      {/* Consent manager */}
      {address && <ConsentManager patientAddress={address} />}

      {/* Chat + Consultations/Access grid */}
      <div className="grid grid-cols-[65%_1fr] gap-4 h-[680px]">
        {/* Kosyn AI chat — left */}
        {address && <PatientAiChat patientAddress={address} />}

        {/* Consultations + Access History — right, stacked */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Consultations */}
          <div className="flex flex-col min-h-0 flex-1">
            <h2 className="text-sm font-medium text-muted-foreground mb-2 shrink-0">
              Consultations
            </h2>
            {bookings.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No consultations yet.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow
                        key={b.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          router.push(`/patients/consultation/${b.id}`)
                        }
                      >
                        <TableCell className="font-medium text-xs">
                          {b.doctorName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {b.date}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${statusColors[b.status] || ""}`}
                          >
                            {BOOKING_STATUS_LABELS[b.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Access History */}
          <div className="flex flex-col min-h-0 flex-1">
            {address && <AccessLog patientAddress={address} />}
          </div>
        </div>
      </div>
    </main>
  );
}
