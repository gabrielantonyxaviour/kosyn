"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function LandingCinematic() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".cin-label",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.fromTo(
        ".cin-title",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          delay: 0.15,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.fromTo(
        ".cin-video-wrap",
        { scale: 0.92, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cin-video-wrap",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative py-24 px-8 overflow-hidden"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-12">
        <span
          className="cin-label block"
          style={{
            fontFamily: "var(--font-mono-custom)",
            fontSize: "11px",
            color: "#444",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Demo
        </span>
        <h2
          className="cin-title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 5vw, 72px)",
            color: "#fff",
            lineHeight: 0.95,
            marginTop: "10px",
          }}
        >
          APP DEMO /
          <br />
          <span style={{ color: "#333" }}>COMING SOON.</span>
        </h2>
      </div>

      {/* Video frame */}
      <div className="max-w-[1400px] mx-auto">
        <div
          className="cin-video-wrap relative"
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.07)",
            aspectRatio: "16/9",
            background: "#0a0a0a",
          }}
        >
          {/* macOS-style top bar */}
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-3"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "rgba(255,95,87,0.5)" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "rgba(255,189,46,0.5)" }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "rgba(40,202,65,0.5)" }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono-custom)",
                fontSize: "10px",
                color: "rgba(255,255,255,0.25)",
                marginLeft: 12,
                letterSpacing: "0.1em",
              }}
            >
              kosyn.ai — app demo
            </span>
          </div>

          {/* Demo placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              style={{ opacity: 0.2 }}
            >
              <circle cx="28" cy="28" r="27" stroke="white" strokeWidth="1.5" />
              <path d="M22 19l16 9-16 9V19z" fill="white" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-mono-custom)",
                fontSize: "12px",
                color: "rgba(255,255,255,0.2)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              App demo video coming soon
            </span>
          </div>
        </div>

        {/* Caption row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5 px-1">
          <span
            style={{
              fontFamily: "var(--font-mono-custom)",
              fontSize: "11px",
              color: "#2a2a2a",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Full walkthrough · Patient · Doctor · Enclave AI
          </span>
        </div>
      </div>
    </section>
  );
}
