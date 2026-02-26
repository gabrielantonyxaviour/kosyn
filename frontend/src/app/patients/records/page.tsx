"use client";

import { RecordsList } from "@/components/records-list";

export default function RecordsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Health Records
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your encrypted records stored on IPFS — only you control access.
        </p>
      </div>
      <RecordsList />
    </main>
  );
}
