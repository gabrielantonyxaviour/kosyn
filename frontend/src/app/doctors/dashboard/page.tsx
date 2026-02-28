"use client";

import { useState, useEffect } from "react";
import { AiChat } from "@/components/ai-chat";
import { RecordPicker } from "@/components/record-picker";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { useDemoPoll } from "@/hooks/use-demo-poll";
import { getBookings } from "@/lib/demo-api";
import type { DemoRecord } from "@/app/api/demo/store";

const PROVIDER_KEY = (address: string) =>
  `kosyn-provider:${address.toLowerCase()}`;

const statusColors: Record<string, string> = {
  booked: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "access-requested": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "access-granted": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "in-session": "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-muted text-muted-foreground",
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function ProviderPage() {
  const account = useActiveAccount();
  const router = useRouter();
  const address = account?.address ?? "";
  const [verified, setVerified] = useState<boolean | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<DemoRecord[]>([]);

  useEffect(() => {
    if (!address) return;
    const registered = !!localStorage.getItem(PROVIDER_KEY(address));
    if (!registered) {
      router.replace("/doctors/onboarding");
    } else {
      setVerified(true);
    }
  }, [address, router]);

  const { data: bookings } = useDemoPoll(
    () => (address ? getBookings(address, "doctor") : Promise.resolve([])),
    3000,
  );

  if (!account || verified === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const all = bookings || [];
  const today = todayString();
  const todaysConsultations = all.filter((b) => b.date === today);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* KosynGPT — main interface with record picker */}
        <div className="lg:col-span-2 space-y-3 min-h-[500px]">
          <RecordPicker
            doctorAddress={address}
            selectedRecords={selectedRecords}
            onRecordsChange={setSelectedRecords}
          />
          <div className="h-[460px]">
            <AiChat contextRecords={selectedRecords} />
          </div>
        </div>

        {/* Today's schedule */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Today&apos;s Schedule
          </h2>
          {todaysConsultations.length === 0 ? (
            <div className="rounded-lg border border-border p-5 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No consultations scheduled today.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysConsultations.map((b) => (
                <Link
                  key={b.id}
                  href={`/doctors/consultation/${b.consultationId}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{b.patientName}</p>
                    <p className="text-xs text-muted-foreground">{b.time}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusColors[b.status] || ""}
                  >
                    {b.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* All bookings below if any outside today */}
          {all.length > todaysConsultations.length && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground pt-2">
                All Consultations
              </h2>
              <div className="space-y-2">
                {all
                  .filter((b) => b.date !== today)
                  .map((b) => (
                    <Link
                      key={b.id}
                      href={`/doctors/consultation/${b.consultationId}`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{b.patientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.date} · {b.time}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[b.status] || ""}
                      >
                        {b.status}
                      </Badge>
                    </Link>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
