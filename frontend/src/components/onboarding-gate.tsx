"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboarded } from "@/lib/patient-profile";
import { getPatientRegistry, ADDRESSES } from "@/lib/contracts";
import { NavHeader } from "@/components/nav-header";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const contractDeployed = ADDRESSES.patientRegistry !== ZERO_ADDR;

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isOnboardingRoute = pathname === "/patients/onboarding";

  // Always call the hook — skip if contract not deployed or no account
  const { data: isRegisteredOnChain, isLoading: contractChecking } =
    useReadContract({
      contract: getPatientRegistry(),
      method: "isRegistered",
      params: [(account?.address ?? ZERO_ADDR) as `0x${string}`],
      queryOptions: { enabled: contractDeployed && !!account },
    });

  useEffect(() => {
    if (!account) {
      setChecked(false);
      return;
    }
    if (isOnboardingRoute) {
      setChecked(true);
      return;
    }

    if (contractDeployed) {
      // Wait for the RPC result before deciding
      if (contractChecking) return;
      if (isRegisteredOnChain || isOnboarded(account.address)) {
        setChecked(true);
      } else {
        router.replace("/patients/onboarding");
      }
    } else {
      // No contract deployed yet — fall back to localStorage cache
      if (isOnboarded(account.address)) {
        setChecked(true);
      } else {
        router.replace("/patients/onboarding");
      }
    }
  }, [
    account?.address,
    isOnboardingRoute,
    isRegisteredOnChain,
    contractChecking,
    router,
  ]);

  if (!account || !checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isOnboardingRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      {children}
    </div>
  );
}
