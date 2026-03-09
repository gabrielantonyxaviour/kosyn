"use client";

import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
  ConnectButton,
} from "thirdweb/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { client, providerWallet, chain } from "@/lib/thirdweb";
import { ProviderRegister } from "@/components/provider-register";
import { useProviderIsRegistered } from "@/hooks/use-provider-profile";
import Image from "next/image";

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
            Provider Portal
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
            }}
          >
            Connect your wallet to access patient records
          </p>
        </div>

        <ConnectButton
          client={client}
          wallets={[providerWallet]}
          chain={chain}
          connectButton={{
            label: "Connect Wallet",
            style: { height: "44px" },
          }}
          theme="dark"
        />
      </div>
    </div>
  );
}

function RegistrationPanel() {
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
          width: "640px",
          height: "100%",
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          overflowY: "auto",
          padding: "2rem",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <ProviderRegister />
      </div>
    </div>
  );
}

export default function DoctorOnboardingPage() {
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const { data: isOnChainRegistered, isLoading: registryLoading } =
    useProviderIsRegistered(account?.address);

  useEffect(() => {
    if (status !== "connected" || !account) {
      setShowForm(false);
      return;
    }

    if (registryLoading) return;

    if (isOnChainRegistered) {
      router.replace("/doctors/dashboard");
    } else {
      setShowForm(true);
    }
  }, [status, account?.address, router, isOnChainRegistered, registryLoading]);

  // Auth state loading — show bare video only
  if (status === "unknown" || status === "connecting") {
    return <BareVideo />;
  }

  // Connected but checking registration
  if (status === "connected" && !showForm) {
    return <BareVideo />;
  }

  // Connected + not registered → show registration form
  if (status === "connected" && showForm) {
    return <RegistrationPanel />;
  }

  // Disconnected → show login
  return <LoginPanel />;
}
