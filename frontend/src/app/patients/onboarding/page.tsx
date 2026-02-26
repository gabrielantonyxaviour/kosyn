"use client";

import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useReadContract,
  ConnectButton,
} from "thirdweb/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isOnboarded } from "@/lib/patient-profile";
import { getPatientRegistry, ADDRESSES } from "@/lib/contracts";
import { client, patientWallet, chain } from "@/lib/thirdweb";
import { PatientOnboarding } from "@/components/patient-onboarding";
import Image from "next/image";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const contractDeployed = ADDRESSES.patientRegistry !== ZERO_ADDR;

function BareVideo() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src="/assets/login-video.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function LoginPanel() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
        display: "flex",
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src="/assets/login-video.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.45)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "580px",
          height: "100%",
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          gap: "1.5rem",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image src="/kosyn-logo.png" alt="Kosyn" width={32} height={32} />
          <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff" }}>
            Kosyn
          </span>
        </div>

        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 8px",
            }}
          >
            Patient Portal
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
            }}
          >
            Sign in to manage your health records
          </p>
        </div>

        <ConnectButton
          client={client}
          wallets={[patientWallet]}
          chain={chain}
          connectButton={{ label: "Sign In", style: { height: "44px" } }}
          theme="dark"
        />
      </div>
    </div>
  );
}

export default function PatientOnboardingPage() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const { data: isRegisteredOnChain, isLoading: contractChecking } =
    useReadContract({
      contract: getPatientRegistry(),
      method: "isRegistered",
      params: [(account?.address ?? ZERO_ADDR) as `0x${string}`],
      queryOptions: { enabled: contractDeployed && !!account },
    });

  useEffect(() => {
    if (status !== "connected" || !account) {
      setShowForm(false);
      return;
    }

    if (contractDeployed) {
      if (contractChecking) return;
      if (isRegisteredOnChain || isOnboarded(account.address)) {
        router.replace("/patients/dashboard");
      } else {
        setShowForm(true);
      }
    } else {
      if (isOnboarded(account.address)) {
        router.replace("/patients/dashboard");
      } else {
        setShowForm(true);
      }
    }
  }, [status, account?.address, isRegisteredOnChain, contractChecking, router]);

  // Auth state loading — show bare video only
  if (status === "unknown" || status === "connecting") {
    return <BareVideo />;
  }

  // Connected but still checking onboarding status
  if (status === "connected" && !showForm) {
    return <BareVideo />;
  }

  // Connected + not onboarded → show onboarding form
  if (status === "connected" && showForm) {
    return <PatientOnboarding />;
  }

  // Disconnected → show login
  return <LoginPanel />;
}
