"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";

function scrollTo(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const LINES = ["CONFIDENTIAL", "HEALTH", "PROTOCOL."];

export default function LandingHero() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Kinetic char reveal
      gsap.from(".hero-char", {
        yPercent: 120,
        opacity: 0,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.028,
        delay: 0.2,
      });

      // Subline + CTAs
      gsap.from(".hero-sub", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.9,
        stagger: 0.12,
      });

      // Bottom bar
      gsap.from(".hero-stat", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: "power2.out",
        delay: 1.3,
        stagger: 0.08,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 20% 50%, transparent 0%, #000 65%)",
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full z-10 opacity-[0.035]"
        style={{ mixBlendMode: "screen" }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />

      {/* Two-column layout */}
      <div className="relative z-20 flex flex-1 min-h-0">
        {/* Left column — text */}
        <div className="flex flex-col justify-center px-8 pt-28 pb-0 w-full md:w-[52%] lg:w-[48%]">
          <div className="overflow-hidden">
            {LINES.map((line, li) => (
              <div key={li} className="overflow-hidden leading-none">
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(48px, 6.5vw, 110px)",
                    color: li === 2 ? "#888" : "#fff",
                    lineHeight: 0.92,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {line.split("").map((char, ci) => (
                    <span
                      key={ci}
                      className="hero-char inline-block"
                      style={{
                        display: char === " " ? "inline" : "inline-block",
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-sm">
            <p
              className="hero-sub"
              style={{
                fontFamily: "var(--font-mono-custom)",
                fontSize: "13px",
                color: "#666",
                lineHeight: 1.7,
              }}
            >
              AI analyzes inside TEE enclaves — no raw PHI ever leaves the
              enclave. Patients hold the only key. Chainlink Vault DON enforces
              it.
            </p>
            <div className="hero-sub flex gap-4 mt-8">
              <button
                onClick={() => scrollTo("cta")}
                className="group flex items-center gap-3 px-6 py-3.5 transition-all duration-300 hover:bg-white hover:text-black"
                style={{
                  background: "#fff",
                  color: "#000",
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try Now
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <button
                onClick={() => scrollTo("demo")}
                className="group flex items-center gap-3 px-6 py-3.5 transition-all duration-300 hover:bg-white hover:text-black"
                style={{
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#ccc",
                  background: "transparent",
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderRadius: "7px",
                  cursor: "pointer",
                }}
              >
                Watch Demo
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column — full-height video */}
        <div className="hidden md:block flex-1 relative">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="/assets/cinematic-ad.mp4"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "contrast(1.05) brightness(0.85)" }}
          />
          {/* Left-edge fade to blend with text column */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #000 0%, transparent 30%)",
            }}
          />
          {/* Bottom-edge fade for stat bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, #000)",
            }}
          />
        </div>
      </div>

      {/* Bottom stat bar */}
      <div
        className="relative z-20 w-full"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex flex-wrap gap-8 items-center">
          {[
            { label: "PHI on-chain", val: "0 bytes" },
            { label: "Patient key control", val: "100%" },
            { label: "AI runtime", val: "TEE enclave" },
            { label: "Compliance", val: "HIPAA-equiv" },
            { label: "Network", val: "Avalanche Fuji" },
          ].map((s) => (
            <div key={s.label} className="hero-stat flex items-center gap-3">
              <span
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "18px",
                  fontWeight: 500,
                  color: "#fff",
                }}
              >
                {s.val}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "10px",
                  color: "#444",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
