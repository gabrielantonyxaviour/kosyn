"use client";

import { Suspense, useEffect } from "react";
import { NavHeader } from "@/components/nav-header";
import { usePathname, useRouter } from "next/navigation";
import { useActiveWalletConnectionStatus } from "thirdweb/react";

function DoctorsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const status = useActiveWalletConnectionStatus();
  const router = useRouter();
  const isOnboarding = pathname === "/doctors/onboarding";

  useEffect(() => {
    if (isOnboarding) return;
    if (status === "disconnected") {
      router.replace("/doctors/onboarding");
    }
  }, [status, isOnboarding, router]);

  if (isOnboarding) return <>{children}</>;

  // Blank screen while resolving auth state for protected routes
  if (status === "unknown" || status === "connecting") {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      {children}
    </div>
  );
}

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <DoctorsLayoutInner>{children}</DoctorsLayoutInner>
    </Suspense>
  );
}
