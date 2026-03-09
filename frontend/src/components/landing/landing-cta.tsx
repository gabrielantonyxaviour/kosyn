import Link from "next/link";
import Image from "next/image";

export default function LandingCTA() {
  return (
    <section
      id="cta"
      className="py-32 px-8"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Headline */}
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
            Deploy
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(56px, 8vw, 120px)",
              color: "#fff",
              lineHeight: 0.9,
              marginTop: "12px",
            }}
          >
            CHOOSE
            <br />
            <span style={{ color: "#666" }}>YOUR ROLE.</span>
          </h2>
        </div>

        {/* Three role panels */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Patient */}
          <div
            className="group relative flex flex-col justify-between p-10 md:p-14 transition-all duration-500"
            style={{
              background: "#0a0a0a",
              minHeight: "420px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 20% 20%, rgba(255,255,255,0.03), transparent)",
              }}
            />

            <div className="relative z-10">
              <div
                className="w-10 h-10 mb-10 flex items-center justify-center"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle
                    cx="9"
                    cy="6.5"
                    r="3.5"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M2 16.5c0-3.866 3.134-7 7-7s7 3.134 7 7"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(44px, 5vw, 72px)",
                  color: "#fff",
                  lineHeight: 0.95,
                }}
              >
                PATIENT
              </div>
              <p
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: 1.7,
                  marginTop: "16px",
                  maxWidth: "360px",
                }}
              >
                Upload records. Grant and revoke access. Earn from anonymized
                data research. Your keys. Your rules. Always.
              </p>
            </div>

            <div className="relative z-10 mt-10">
              <Link
                href="/patients/onboarding"
                className="group/btn inline-flex items-center gap-4 transition-all duration-300"
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  color: "#fff",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <div
                  className="px-6 py-3 transition-all duration-300 group-hover/btn:bg-white group-hover/btn:text-black"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "7px",
                  }}
                >
                  Open Patient Portal →
                </div>
              </Link>
            </div>
          </div>

          {/* Provider */}
          <div
            className="group relative flex flex-col justify-between p-10 md:p-14 transition-all duration-500"
            style={{
              background: "#0a0a0a",
              minHeight: "420px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(255,255,255,0.04), transparent)",
              }}
            />

            <div className="relative z-10">
              <div
                className="w-10 h-10 mb-10 flex items-center justify-center"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "8px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 2v5M6.5 4.5h5"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <rect
                    x="3"
                    y="8"
                    width="12"
                    height="8"
                    rx="2"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="9"
                    cy="12"
                    r="1.5"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(44px, 5vw, 72px)",
                  color: "#ffffff",
                  lineHeight: 0.95,
                }}
              >
                DOCTOR
              </div>
              <p
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: 1.7,
                  marginTop: "16px",
                  maxWidth: "360px",
                }}
              >
                Request record access. Receive AI-generated SOAP notes and
                ICD-10 codes. No raw PHI, ever. Enclave-guaranteed.
              </p>
            </div>

            <div className="relative z-10 mt-10">
              <Link
                href="/doctors/onboarding"
                className="group/btn inline-flex items-center gap-4 transition-all duration-300"
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  color: "#ffffff",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <div
                  className="px-6 py-3 transition-all duration-300 group-hover/btn:bg-white group-hover/btn:text-black"
                  style={{
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "7px",
                  }}
                >
                  Register as Doctor →
                </div>
              </Link>
            </div>
          </div>

          {/* Data */}
          <div
            className="group relative flex flex-col justify-between p-10 md:p-14 transition-all duration-500"
            style={{
              background: "#0a0a0a",
              minHeight: "420px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(255,255,255,0.03), transparent)",
              }}
            />

            <div className="relative z-10">
              <div
                className="w-10 h-10 mb-10 flex items-center justify-center"
                style={{
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <ellipse
                    cx="9"
                    cy="5"
                    rx="6"
                    ry="2.5"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M3 5v4c0 1.38 2.686 2.5 6 2.5S15 10.38 15 9V5"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M3 9v4c0 1.38 2.686 2.5 6 2.5S15 14.38 15 13V9"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(44px, 5vw, 72px)",
                  color: "#fff",
                  lineHeight: 0.95,
                }}
              >
                DATA
              </div>
              <p
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: 1.7,
                  marginTop: "16px",
                  maxWidth: "360px",
                }}
              >
                Query anonymized health datasets via REST API. Build research
                tools, train models, power clinical studies — all
                privacy-preserving, all on-chain audited.
              </p>
            </div>

            <div className="relative z-10 mt-10">
              <Link
                href="/data"
                className="group/btn inline-flex items-center gap-4 transition-all duration-300"
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  color: "#fff",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <div
                  className="px-6 py-3 transition-all duration-300 group-hover/btn:bg-white group-hover/btn:text-black"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "7px",
                  }}
                >
                  Explore Data API →
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="max-w-[1400px] mx-auto mt-24 pt-8 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/kosyn-logo.png"
            alt="Kosyn"
            width={16}
            height={16}
            className="opacity-30"
          />
          <span
            style={{
              fontFamily: "var(--font-mono-custom)",
              fontSize: "11px",
              color: "#333",
              letterSpacing: "0.08em",
            }}
          >
            KOSYN AI — Chainlink Convergence 2025
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono-custom)",
            fontSize: "11px",
            color: "#2a2a2a",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          className="flex gap-6"
        >
          <span>Privacy</span>
          <span>AI</span>
          <span>Avalanche Build Games</span>
        </div>
      </div>
    </section>
  );
}
