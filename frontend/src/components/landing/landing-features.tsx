"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const features = [
  {
    num: "01",
    verb: "ENCRYPT.",
    sub: "Every byte sealed in a TEE.",
    desc: "Your passkey encrypts every record before it leaves your device. Chainlink Vault DON splits the AES key into threshold shares across the decentralized network. No single node sees it. No hospital can subpoena it.",
    image: "/assets/encrypt-visual.jpg",
    detail: [
      "AES-256 encryption",
      "Vault DON threshold shares",
      "IPFS — encrypted blobs only",
      "Passkey-controlled",
    ],
  },
  {
    num: "02",
    verb: "CONSENT.",
    sub: "Your rules. On-chain.",
    desc: "Doctors request access via smart contract. You approve with a passkey tap — instantly. ACE PolicyEngine validates every request. Revoke anytime and the access is cryptographically invalidated, immediately, forever.",
    image: "/assets/server-room.jpg",
    detail: [
      "Smart contract enforcement",
      "ACE PolicyEngine",
      "Instant revocation",
      "Audit log immutable",
    ],
  },
  {
    num: "03",
    verb: "ANALYZE.",
    sub: "AI that never sees raw PHI.",
    desc: "Nillion nilAI runs inside the CRE enclave — a hardware-level trusted execution environment with AMD SEV-SNP + NVIDIA CC attestation. SOAP notes, ICD-10 codes, risk scores. Complete clinical intelligence without a single field of PHI ever leaving the enclave.",
    image: "/assets/doctor-tablet.jpg",
    detail: [
      "Nillion nilAI in TEE",
      "SOAP note generation",
      "ICD-10 coding",
      "Risk stratification",
    ],
  },
  {
    num: "04",
    verb: "EARN.",
    sub: "The data economy, yours.",
    desc: "For decades hospitals monetized your health data without your knowledge or consent. Kosyn flips the model. Contribute anonymized records to clinical research marketplaces. Get paid in KUSD stablecoins.",
    image: "/assets/hipaa-stamp.jpg",
    detail: [
      "KUSD stablecoin payouts",
      "Anonymized queries only",
      "Research marketplace",
      "Patient-controlled sharing",
    ],
  },
];

const N = features.length;

// Clip-path constants
const CLIP_FULL = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
const CLIP_POINT_TL = "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)"; // collapsed to top-left
const CLIP_POINT_BR = "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)"; // collapsed to bottom-right

export default function LandingFeatures() {
  const outerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const activeIndex = Math.min(N - 1, Math.floor(scrollProgress * N));

  useGSAP(
    () => {
      const slides = gsap.utils.toArray<HTMLElement>(
        ".feat-slide",
        stickyRef.current,
      );
      if (slides.length === 0) return;

      // Set initial states — slide 1 visible, rest hidden via element-level animation
      slides.forEach((slide, i) => {
        const text = slide.querySelector<HTMLElement>(".feat-text");
        const img = slide.querySelector<HTMLElement>(".feat-image");
        const specs = slide.querySelector<HTMLElement>(".feat-specs");
        if (i === 0) {
          gsap.set(img, { clipPath: CLIP_FULL });
        } else {
          gsap.set(text, { x: 60, opacity: 0 });
          gsap.set(img, { clipPath: CLIP_POINT_TL });
          gsap.set(specs, { opacity: 0 });
        }
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: outerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });

      slides.forEach((slide, i) => {
        if (i < slides.length - 1) {
          const textOut = slide.querySelector<HTMLElement>(".feat-text");
          const imgOut = slide.querySelector<HTMLElement>(".feat-image");
          const specsOut = slide.querySelector<HTMLElement>(".feat-specs");
          const nextSlide = slides[i + 1];
          const textIn = nextSlide.querySelector<HTMLElement>(".feat-text");
          const imgIn = nextSlide.querySelector<HTMLElement>(".feat-image");
          const specsIn = nextSlide.querySelector<HTMLElement>(".feat-specs");

          // All transitions are simultaneous ("<"):
          // — Text exits left, next text enters from right
          // — Image collapses to bottom-right corner, next image expands from top-left
          // — Specs fade out/in
          tl.to(textOut, { x: -60, opacity: 0, duration: 1, ease: "power2.in" })
            .to(
              imgOut,
              { clipPath: CLIP_POINT_BR, duration: 1, ease: "power2.in" },
              "<",
            )
            .to(specsOut, { opacity: 0, duration: 0.5, ease: "power2.in" }, "<")
            .to(
              textIn,
              { x: 0, opacity: 1, duration: 1, ease: "power2.out" },
              "<",
            )
            .to(
              imgIn,
              { clipPath: CLIP_FULL, duration: 1, ease: "power2.out" },
              "<",
            )
            .to(
              specsIn,
              { opacity: 1, duration: 0.7, ease: "power2.out", delay: 0.3 },
              "<",
            )
            // Hold the slide before next transition
            .to({}, { duration: 1.5 });
        }
      });

      // Track scroll progress for loaders + per-step indicator
      ScrollTrigger.create({
        trigger: outerRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setScrollProgress(self.progress),
      });
    },
    { scope: outerRef },
  );

  return (
    <section
      id="features"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        ref={outerRef}
        style={{ height: `${N * 100}vh`, background: "#000" }}
      >
        <div
          ref={stickyRef}
          className="sticky top-0 overflow-hidden"
          style={{ height: "100vh" }}
        >
          {/* Fixed top bar — "HOW IT WORKS" + global progress + step counter */}
          <div
            className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 py-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono-custom)",
                fontSize: "11px",
                color: "#444",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              How it works
            </span>
            <div className="flex items-center gap-5">
              <div className="flex gap-2" style={{ width: "120px" }}>
                {features.map((_, di) => {
                  const sStart = di / N;
                  const sEnd = (di + 1) / N;
                  const fill = Math.max(
                    0,
                    Math.min(1, (scrollProgress - sStart) / (sEnd - sStart)),
                  );
                  return (
                    <div
                      key={di}
                      style={{
                        height: "2px",
                        flex: 1,
                        background: "rgba(255,255,255,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "#fff",
                          transform: `scaleX(${fill})`,
                          transformOrigin: "left",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "11px",
                  color: "#444",
                  letterSpacing: "0.12em",
                }}
              >
                {String(activeIndex + 1).padStart(2, "0")} / 04
              </span>
            </div>
          </div>

          {/* Scan line */}
          <div
            className="feat-scan pointer-events-none absolute left-0 right-0 z-20"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.3) 70%, transparent 100%)",
            }}
          />
          <style>{`
            @keyframes feat-scan {
              from { top: 0; }
              to   { top: 100vh; }
            }
            .feat-scan { animation: feat-scan 4s linear infinite; }
          `}</style>

          {/* All slides — stacked absolutely, content animated individually */}
          {features.map((f, i) => {
            // Per-step fill for this slide's scroll indicator
            const iSegStart = i / N;
            const iSegEnd = (i + 1) / N;
            const iFill = Math.max(
              0,
              Math.min(1, (scrollProgress - iSegStart) / (iSegEnd - iSegStart)),
            );

            return (
              <div key={f.num} className="feat-slide absolute inset-0">
                <div
                  className="h-full max-w-[1400px] mx-auto px-8 grid gap-16"
                  style={{
                    gridTemplateColumns: "1fr 44%",
                    paddingTop: "80px",
                    paddingBottom: "48px",
                  }}
                >
                  {/* Left — text (animated: exits left, enters from right) */}
                  <div className="feat-text flex flex-col justify-center">
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(72px, 10vw, 148px)",
                        color: "#fff",
                        lineHeight: 0.88,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {f.verb}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(28px, 3.5vw, 48px)",
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.1,
                        marginTop: "12px",
                      }}
                    >
                      {f.sub}
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--font-mono-custom)",
                        fontSize: "14px",
                        color: "#555",
                        lineHeight: 1.85,
                        marginTop: "28px",
                        maxWidth: "480px",
                      }}
                    >
                      {f.desc}
                    </p>

                    {/* Scroll progress indicator — below description */}
                    <div className="flex items-center gap-3 mt-10">
                      <div
                        style={{
                          width: "160px",
                          height: "1px",
                          background: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "rgba(255,255,255,0.45)",
                            width: `${iFill * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono-custom)",
                          fontSize: "10px",
                          color: "#2e2e2e",
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        Scroll
                      </span>
                    </div>
                  </div>

                  {/* Right — square image + specs below */}
                  <div className="flex flex-col gap-5">
                    {/* Square image — clip-path animated by GSAP */}
                    <div
                      className="feat-image relative"
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.07)",
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={f.image}
                        alt={f.verb}
                        fill
                        className="object-cover"
                        style={{
                          filter: "grayscale(45%) brightness(0.78)",
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.45) 100%)",
                        }}
                      />
                    </div>

                    {/* Specs below image — opacity animated by GSAP */}
                    <div className="feat-specs flex flex-wrap gap-x-6 gap-y-2">
                      {f.detail.map((d) => (
                        <div key={d} className="flex items-center gap-2">
                          <span
                            style={{
                              color: "rgba(255,255,255,0.2)",
                              fontSize: "9px",
                            }}
                          >
                            ▸
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono-custom)",
                              fontSize: "11px",
                              color: "#3a3a3a",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {d}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
