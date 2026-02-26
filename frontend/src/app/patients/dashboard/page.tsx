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
import { useActiveAccount } from "thirdweb/react";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { getBookings, getConsents, updateBooking } from "@/lib/demo-api";
import { useRouter } from "next/navigation";
import { PatientAiChat } from "@/components/patient-ai-chat";

const statusColors: Record<string, string> = {
  booked: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "access-requested": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "access-granted": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "in-session": "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const account = useActiveAccount();
  const router = useRouter();
  const address = account?.address ?? "";

  const { data: bookings, refresh: refreshBookings } = useDemoPoll(
    () => (address ? getBookings(address, "patient") : Promise.resolve([])),
    3000,
  );

  const { data: consents } = useDemoPoll(
    () => (address ? getConsents(address) : Promise.resolve([])),
    5000,
  );

  const accessRequests = (bookings || []).filter(
    (b) => b.status === "access-requested",
  );

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
            await updateBooking(b.id, "booked");
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

      {/* Kosyn AI */}
      {address && <PatientAiChat patientAddress={address} />}

      {/* Consent manager */}
      {address && <ConsentManager patientAddress={address} />}

      {/* Consultations table */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Consultations
        </h2>
        {!bookings || bookings.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No consultations yet. Book a doctor to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/patients/consultation/${b.consultationId}`)
                    }
                  >
                    <TableCell className="font-medium">
                      {b.doctorName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.specialty}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.time}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={statusColors[b.status] || ""}
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Access log */}
      {address && <AccessLog patientAddress={address} />}
    </main>
  );
}
