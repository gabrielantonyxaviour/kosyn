"use client";

import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client, patientWallet, providerWallet, chain } from "@/lib/thirdweb";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const account = useActiveAccount();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const isProvider = pathname.startsWith("/doctors");
  const isDevPreview = searchParams.get("dev-preview") === "1";

  useEffect(() => setMounted(true), []);

  if (!account && !isDevPreview) {
    if (!mounted) return null;

    return createPortal(
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          display: "flex",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        {/* Video background — covers entire screen */}
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

        {/* Dark overlay */}
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

        {/* Center panel */}
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
            <span
              style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff" }}
            >
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
              {isProvider ? "Provider Portal" : "Patient Portal"}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.55)",
                margin: 0,
              }}
            >
              {isProvider
                ? "Connect your wallet to access patient records"
                : "Sign in to manage your health records"}
            </p>
          </div>

          <div>
            <ConnectButton
              client={client}
              wallets={isProvider ? [providerWallet] : [patientWallet]}
              chain={chain}
              connectButton={{
                label: isProvider ? "Connect Wallet" : "Sign In",
                style: { height: "44px" },
              }}
              theme="dark"
            />
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return <>{children}</>;
}
