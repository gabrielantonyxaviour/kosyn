"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const steps = [
  {
    num: "01",
    actor: "PATIENT",
    action: "Uploads record",
    sub: "Encrypted inside TEE via Chainlink Confidential HTTP. AES key sharded across Vault DON.",
  },
  {
    num: "02",
    actor: "PROTOCOL",
    action: "Stores hash on-chain",
    sub: "HealthRecordRegistry logs the IPFS hash. No PHI on-chain. Metadata only.",
  },
  {
    num: "03",
    actor: "DOCTOR",
    action: "Requests access",
    sub: "On-chain consent request. Patient approves with passkey. ACE PolicyEngine validates.",
  },
  {
    num: "04",
    actor: "ENCLAVE",
    action: "Decrypts + runs AI",
    sub: "Nillion nilAI generates SOAP notes and ICD-10 codes entirely inside the TEE. Response cryptographically signed.",
  },
  {
    num: "05",
    actor: "DOCTOR",
    action: "Receives report",
    sub: "Re-encrypted output. Accessible only to the approved provider. Audit log immutable.",
  },
];

export default function LandingFlow() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>(
        ".flow-row",
        sectionRef.current,
      );
      rows.forEach((row, i) => {
        gsap.fromTo(
          row,
          { opacity: 0, x: -40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: row,
              start: "top 82%",
              toggleActions: "play none none none",
            },
            delay: i * 0.05,
          },
        );
      });

      const line = sectionRef.current?.querySelector(
        ".flow-line-fill",
      ) as HTMLElement;
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          },
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="protocol"
      className="relative py-32 px-8 overflow-hidden"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Server room background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/assets/server-room.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.07,
          filter: "grayscale(100%)",
        }}
      />
      <div className="relative z-10 max-w-[1400px] mx-auto">
        <div className="mb-20">
          <span
            style={{
              fontFamily: "var(--font-mono-custom)",
              fontSize: "11px",
              color: "#444",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            The Journey
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 6vw, 90px)",
              color: "#fff",
              lineHeight: 0.95,
              marginTop: "12px",
            }}
          >
            FROM UPLOAD
            <br />
            <span style={{ color: "#333" }}>TO INSIGHT.</span>
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[39px] top-5 bottom-5 w-px"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="flow-line-fill w-full"
              style={{
                background:
                  "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.2))",
                height: "100%",
              }}
            />
          </div>

          <div className="space-y-0">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="flow-row flex gap-10 items-start py-8"
                style={{
                  borderBottom:
                    i < steps.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                {/* Node */}
                <div className="flex-shrink-0 w-20 flex flex-col items-center pt-1">
                  <div
                    className="w-5 h-5 rounded-full z-10 flex items-center justify-center"
                    style={{
                      background:
                        i === 0 || i === steps.length - 1 ? "#ffffff" : "#111",
                      border: `1px solid ${i === 0 || i === steps.length - 1 ? "#ffffff" : "rgba(255,255,255,0.15)"}`,
                    }}
                  >
                    {(i === 0 || i === steps.length - 1) && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#000" }}
                      />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <span
                      style={{
                        fontFamily: "var(--font-mono-custom)",
                        fontSize: "10px",
                        color: "#444",
                        letterSpacing: "0.15em",
                      }}
                    >
                      {step.num}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono-custom)",
                        fontSize: "10px",
                        color: step.actor === "ENCLAVE" ? "#ffffff" : "#555",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {step.actor}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(28px, 3vw, 42px)",
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    {step.action}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-mono-custom)",
                      fontSize: "13px",
                      color: "#555",
                      lineHeight: 1.7,
                      marginTop: "8px",
                      maxWidth: "480px",
                    }}
                  >
                    {step.sub}
                  </p>
                </div>

                {/* Number */}
                <div
                  className="hidden md:block flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "80px",
                    color: "rgba(255,255,255,0.03)",
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
