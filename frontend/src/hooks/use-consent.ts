"use client";

import { useReadContract } from "thirdweb/react";
import { getPatientConsent } from "@/lib/contracts";

export function useConsent(
  patient: string | undefined,
  provider: string | undefined,
) {
  return useReadContract({
    contract: getPatientConsent(),
    method: "isProviderAllowed",
    params: [
      patient || "0x0000000000000000000000000000000000000000",
      provider || "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: { enabled: !!patient && !!provider },
  });
}
