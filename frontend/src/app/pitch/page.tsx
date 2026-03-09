"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import styles from "./pitch.module.css";

const TOTAL = 6;

function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          data-char
          className={styles.heroChar}
          style={{ display: ch === " " ? "inline" : "inline-block" }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  );
}

const SAFEGUARDS = [
  {
    id: "ACCESS_CONTROL",
    desc: "Provider must be verified in ProviderRegistry with active patient consent",
  },
  {
    id: "CONSENT_EXPIRY",
    desc: "Consent timestamp validated at access time — expired grants are rejected",
  },
  {
    id: "MIN_NECESSARY",
    desc: "Requested record type must exactly match what was consented — no over-fetching",
  },
  {
    id: "AUDIT_TRAIL",
    desc: "Both granted AND denied attempts permanently logged — deletions impossible",
  },
];

const MARKET_STEPS = [
  {
    n: "01",
    label: "PATIENT CONSENTS",
    desc: "DataMarketplace.listData() on-chain, revocable anytime",
  },
  {
    n: "02",
    label: "KEY ESCROW",
    desc: "Face ID → ECDH-wrap AES key → registered on-chain for CRE",
  },
  {
    n: "03",
    label: "KUSD PAYMENT",
    desc: "researcher pays via x402 → CRE distributes revenue to patients",
  },
  {
    n: "04",
    label: "TEE AGGREGATION",
    desc: "CRE unwraps key, decrypts IPFS blobs, aggregates inside enclave — PHI never exits",
  },
];

const ARCH_NODES = [
  {
    name: "PATIENT DEVICE",
    desc: "WebAuthn PRF → AES-256-GCM.\nECDH-wrap key for CRE escrow.",
  },
  {
    name: "IPFS (Pinata)",
    desc: "Encrypted blobs only.\n0 bytes plaintext PHI stored.",
  },
  {
    name: "CHAINLINK CRE TEE",
    desc: "Nillion nilAI: SOAP notes.\nKey unwrap + IPFS decrypt + aggregate.",
  },
  {
    name: "AVALANCHE FUJI",
    desc: "ComplianceAttested + ACE policies.\nMarketplace keys + KUSD payouts.",
  },
];

export default function PitchPage() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimating = useRef(false);

  const goTo = useCallback(
    (next: number) => {
      if (isAnimating.current) return;
      const clamped = Math.max(0, Math.min(next, TOTAL - 1));
      if (clamped === current) return;
      isAnimating.current = true;
      gsap.to(containerRef.current, {
        y: -clamped * window.innerHeight,
        duration: 0.85,
        ease: "power3.inOut",
        onComplete: () => {
          isAnimating.current = false;
        },
      });
      setCurrent(clamped);
    },
    [current],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(current - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  useEffect(() => {
    const slide = slideRefs.current[current];
    if (!slide) return;
    const chars = slide.querySelectorAll("[data-char]");
    if (chars.length > 0) {
      gsap.set(chars, { yPercent: 115, opacity: 0 });
      gsap.to(chars, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.026,
        delay: 0.1,
      });
    }
    const anims = slide.querySelectorAll("[data-anim]");
    gsap.set(anims, { opacity: 0, y: 28 });
    gsap.to(anims, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.13,
      delay: chars.length > 0 ? 0.55 : 0.25,
    });
  }, [current]);

  return (
    <div className={styles.root}>
      <svg className={styles.grain} aria-hidden="true">
        <filter id="pg">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#pg)" />
      </svg>
      <div className={styles.scanLine} aria-hidden="true" />

      <div className={styles.logo}>
        <Image src="/kosyn-logo.png" alt="Kosyn" width={18} height={18} />
        <span className={styles.logoText}>KOSYN AI</span>
      </div>

      <div className={styles.counter}>
        <span className={styles.counterCurrent}>
          {String(current + 1).padStart(2, "0")}
        </span>
        <span className={styles.counterSlash}>/</span>
        <span className={styles.counterTotal}>
          {String(TOTAL).padStart(2, "0")}
        </span>
      </div>

      <div className={styles.dots}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      <div className={styles.keyHint}>
        <kbd>←</kbd>
        <kbd>→</kbd>
        <span>navigate</span>
      </div>

      <div
        ref={containerRef}
        className={styles.slides}
        style={{ height: `${TOTAL * 100}vh` }}
      >
        {/* ─── SLIDE 1: HOOK ─────────────────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[0] = el;
          }}
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <span className={styles.hookPre}>— healthcare data —</span>
            <div className={styles.heroTitle}>
              <Chars text="WHO OWNS YOUR" />
            </div>
            <div className={styles.heroTitle}>
              <Chars text="HEALTH DATA?" />
            </div>
            <p className={styles.hookSub} data-anim>
              Not you. Not your doctor. Nobody —<br />
              it&apos;s trapped in broken silos.
            </p>
            <div className={styles.hookUntil} data-anim>
              <span className={styles.hookUntilLine} />
              <span className={styles.hookUntilText}>Until now.</span>
            </div>
          </div>
        </div>

        {/* ─── SLIDE 2: PROBLEM ──────────────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[1] = el;
          }}
          className={styles.slide}
        >
          <Image
            src="/assets/encrypt-visual.jpg"
            alt=""
            fill
            className={styles.imgBg}
            priority={false}
          />
          <div className={styles.overlay} />
          <div className={styles.slideInner}>
            <div className={styles.slideLabel} data-anim>
              The Problem
            </div>
            <div className={styles.statsGrid}>
              {[
                {
                  stat: "$10.9B",
                  label: "in healthcare data breach costs",
                  sub: "2023 record high (IBM)",
                },
                {
                  stat: "0%",
                  label: "patient ownership of their own records",
                  sub: "worldwide",
                },
                {
                  stat: "100%",
                  label: "PHI exposed every time AI sees your data",
                  sub: "no enclave = no privacy",
                },
              ].map((s, i) => (
                <div key={i} className={styles.statBlock} data-anim>
                  <div className={styles.statValue}>{s.stat}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statSub}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div className={styles.problemBottom} data-anim>
              Every AI diagnostic tool today is a privacy violation waiting to
              happen.
            </div>
          </div>
        </div>

        {/* ─── SLIDE 3: HIPAA ON-CHAIN ───────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[2] = el;
          }}
          className={styles.slide}
        >
          <div className={styles.slideInner}>
            <div className={styles.slideLabel} data-anim>
              The Innovation
            </div>
            <div className={styles.hipaaTitle}>
              <div style={{ overflow: "hidden" }}>
                <Chars text="HIPAA." />
              </div>
              <div style={{ overflow: "hidden" }}>
                <Chars text="VERIFIABLE." />
              </div>
              <div style={{ overflow: "hidden" }}>
                <Chars text="ON-CHAIN." />
              </div>
            </div>
            <div className={styles.safeguardGrid}>
              {SAFEGUARDS.map((s, i) => (
                <div key={i} className={styles.safeguardBox} data-anim>
                  <div className={styles.safeguardId}>{s.id}</div>
                  <div className={styles.safeguardDesc}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div className={styles.hipaaBottom} data-anim>
              Every access triggers a <strong>ComplianceAttested</strong> event
              on Avalanche Fuji — 4-safeguard bitmask +{" "}
              <strong>keccak256(Nillion TEE report)</strong> on-chain. Any
              auditor can verify without trusting the platform. No PHI ever
              leaves the enclave.
            </div>
          </div>
        </div>

        {/* ─── SLIDE 4: DATA MARKETPLACE ─────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[3] = el;
          }}
          className={styles.slide}
        >
          <Image
            src="/assets/hipaa-stamp.jpg"
            alt=""
            fill
            className={styles.imgBg}
            priority={false}
          />
          <div className={styles.overlay} />
          <div className={styles.slideInner}>
            <div className={styles.slideLabel} data-anim>
              Data Ownership
            </div>
            <div className={styles.marketTitle}>
              <div style={{ overflow: "hidden" }}>
                <Chars text="YOUR DATA." />
              </div>
              <div style={{ overflow: "hidden" }}>
                <Chars text="YOUR EARNINGS." />
              </div>
            </div>
            <div className={styles.marketSteps}>
              {MARKET_STEPS.map((s, i) => (
                <div key={i} className={styles.marketStep} data-anim>
                  <span className={styles.marketStepNum}>{s.n}</span>
                  <div>
                    <div className={styles.marketStepLabel}>{s.label}</div>
                    <div className={styles.marketStepDesc}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.marketBottom} data-anim>
              TEE de-identifies inside the enclave — raw PHI never leaves. Every
              consent, every payment, every query: verifiable on Avalanche Fuji.
            </div>
          </div>
        </div>

        {/* ─── SLIDE 5: ARCHITECTURE ─────────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[4] = el;
          }}
          className={styles.slide}
        >
          <Image
            src="/assets/server-room.jpg"
            alt=""
            fill
            className={styles.imgBg}
            priority={false}
          />
          <div className={styles.overlayFull} />
          <div className={styles.slideInner}>
            <div className={styles.slideLabel} data-anim>
              Architecture
            </div>
            <div className={styles.archTitle} data-anim>
              TRUST NO ONE.
              <br />
              <span style={{ color: "#2a2a2a" }}>VERIFY EVERYTHING.</span>
            </div>
            <div className={styles.archFlow}>
              {ARCH_NODES.map((n, i) => (
                <div key={i} className={styles.archNode} data-anim>
                  <div className={styles.archNodeBox}>
                    <div className={styles.archNodeName}>{n.name}</div>
                    <div className={styles.archNodeDesc}>{n.desc}</div>
                  </div>
                  {i < 3 && <div className={styles.archConnector}>→</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SLIDE 6: DEMO ─────────────────────────── */}
        <div
          ref={(el) => {
            slideRefs.current[5] = el;
          }}
          className={styles.slide}
        >
          <Image
            src="/assets/doctor-tablet.jpg"
            alt=""
            fill
            className={styles.imgBg}
            priority={false}
          />
          <div className={styles.overlayFull} />
          <div className={`${styles.slideInner} ${styles.demoInner}`}>
            <div className={styles.demoTitle}>
              <Chars text="LIVE" />
              <Chars text=" DEMO." />
            </div>
            <div className={styles.demoFlow} data-anim>
              <span>patient onboards (Face ID)</span>
              <span className={styles.demoSep}>→</span>
              <span>upload + encrypt record</span>
              <span className={styles.demoSep}>→</span>
              <span>book doctor → live AI consult (Nillion TEE)</span>
              <span className={styles.demoSep}>→</span>
              <span>HIPAA attested on-chain</span>
              <span className={styles.demoSep}>→</span>
              <span>
                opt-in data sharing → researcher pays KUSD → patient earns
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/patients/dashboard"
                className={styles.demoBtn}
                data-anim
              >
                Enter Demo <span>→</span>
              </Link>
              <Link
                href="/architecture"
                className={styles.demoBtn}
                data-anim
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#555",
                }}
              >
                Technical Architecture <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
