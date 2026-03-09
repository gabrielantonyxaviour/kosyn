"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";
import styles from "./architecture.module.css";

gsap.registerPlugin(ScrollTrigger);

const POLICIES = [
  {
    id: "PROVIDER_ALLOWLIST",
    reg: "§164.312(a)(1)",
    desc: "Provider registered in ProviderRegistry with active patient consent",
  },
  {
    id: "CONSENT_EXPIRY",
    reg: "§164.312(a)(1)",
    desc: "block.timestamp < expiresAt — expired grants auto-reject instantly",
  },
  {
    id: "MIN_NECESSARY",
    reg: "§164.514(d)",
    desc: "consented recordType must match requested — scope creep is impossible",
  },
  {
    id: "AUDIT_TRAIL",
    reg: "§164.312(b)",
    desc: "AccessAudited emitted for every attempt, approved or denied, forever",
  },
];

const BITMASK_BITS = [
  { bit: "0x01", flag: "ACCESS_CONTROL", reg: "§164.312(a)(1)" },
  { bit: "0x02", flag: "CONSENT_EXPIRY", reg: "§164.312(a)(1)" },
  { bit: "0x04", flag: "MIN_NECESSARY", reg: "§164.514(d)" },
  { bit: "0x08", flag: "AUDIT_TRAIL", reg: "§164.312(b)" },
];

const ATTEST_STEPS = [
  {
    n: "01",
    label: "CONSULTATION",
    sub: "Doctor transcript + patient consent",
  },
  { n: "02", label: "nilAI INFERENCE", sub: "AMD SEV-SNP + NVIDIA CC enclave" },
  {
    n: "03",
    label: "secp256k1 PROOF",
    sub: "Attestation signature returned with SOAP notes",
  },
  {
    n: "04",
    label: "keccak256(proof)",
    sub: "Hashed inside CRE workflow before exit",
  },
  {
    n: "05",
    label: "ON-CHAIN ATTEST",
    sub: "HIPAAComplianceRegistry.attest() — immutable",
  },
];

const ECDH_STEPS = [
  { label: "FACE ID (WebAuthn PRF)", sub: "Biometric derives AES-256 key" },
  { label: "CRE ECDH PUBKEY", sub: "Fetched from Nillion /v1/public_key" },
  { label: "SHARED SECRET", sub: "Patient ephemeral × CRE pubkey → ECDH" },
  { label: "WRAP(AES_KEY)", sub: "AES key encrypted with shared secret" },
  { label: "ON-CHAIN ESCROW", sub: "DataMarketplace.registerMarketplaceKey()" },
  { label: "TEE UNWRAP ONLY", sub: "CRE TEE holds matching ECDH private key" },
];

export default function ArchitecturePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<Element>("[data-scroll]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 82%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className={styles.root}>
      <svg className={styles.grain} aria-hidden="true">
        <filter id="ag">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ag)" />
      </svg>
      <div className={styles.scanLine} aria-hidden="true" />

      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <Image src="/kosyn-logo.png" alt="Kosyn" width={16} height={16} />
          <span>KOSYN AI</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/pitch" className={styles.navLink}>
            ← PITCH DECK
          </Link>
          <Link href="/patients/dashboard" className={styles.navLink}>
            DEMO →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.inner}>
          <span className={styles.eyebrow} data-scroll>
            — technical architecture —
          </span>
          <h1 className={styles.heroTitle} data-scroll>
            THE INNOVATIONS
            <br />
            BEHIND THE PRIVACY.
          </h1>
          <p className={styles.heroSub} data-scroll>
            Six breakthroughs that make Kosyn AI genuinely novel — not just for
            healthcare,
            <br />
            but for any system requiring provable, cryptographically-verifiable
            privacy.
          </p>
          <div className={styles.trackBadges} data-scroll>
            <span className={styles.badge}>CRE &amp; AI</span>
            <span className={styles.badge}>PRIVACY</span>
            <span className={styles.badge}>RISK &amp; COMPLIANCE</span>
          </div>
        </div>
      </section>

      {/* 01: CONFIDENTIALHTTP */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            01
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            CONFIDENTIALHTTP
            <br />
            <span className={styles.dim}>API KEYS SEALED IN SILICON.</span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            The Nillion nilAI API key is stored in{" "}
            <strong>CRE Vault DON</strong>. Node operators see only sealed
            bytes. The key decrypts exclusively inside the AMD SEV-SNP hardware
            enclave — physically inaccessible from outside. This is the exact
            use case Chainlink designed ConfidentialHTTP for.
          </p>
          <div className={styles.flowDiagram} data-scroll>
            {[
              { label: "HTTP TRIGGER", sub: "workflow invoked", hi: false },
              {
                label: "CRE TEE\n[AMD SEV-SNP]",
                sub: "API_KEY unsealed\ninside enclave only",
                hi: true,
              },
              {
                label: "NILLION nilAI",
                sub: "ConfidentialHTTP\n0 bytes key exposed",
                hi: false,
              },
              {
                label: "SOAP NOTES\n+ PROOF",
                sub: "secp256k1 attestation\nreturned with output",
                hi: false,
              },
            ].map((n, i) => (
              <div key={i} className={styles.flowItem}>
                <div
                  className={`${styles.flowNode} ${n.hi ? styles.flowNodeHi : ""}`}
                >
                  {n.hi && <div className={styles.teeTag}>AMD SEV-SNP</div>}
                  <div className={styles.flowLabel}>{n.label}</div>
                  <div className={styles.flowSub}>{n.sub}</div>
                </div>
                {i < 3 && <div className={styles.flowArrow}>→</div>}
              </div>
            ))}
          </div>
          <div className={styles.codeBlock} data-scroll>
            <div className={styles.codeHeader}>
              workflows/consultation-processing/main.ts
            </div>
            <pre
              className={styles.code}
            >{`const confidentialHttp = new ConfidentialHTTPClient();
const result = confidentialHttp.sendRequest(runtime, {
  request: {
    url: \`\${nillionBaseUrl}/v1/chat/completions\`,
    method: "POST",
    multiHeaders: {
      // injected as CRE Vault secret — node operators never see this
      authorization: { values: [\`Bearer \${nillionApiKey}\`] },
    },
  },
}).result();
// returns: SOAP notes + secp256k1 attestation proof`}</pre>
          </div>
          <div className={styles.callout} data-scroll>
            CRE nodes run this workflow. <code>nillionApiKey</code> is sealed
            bytes in Vault DON. It decrypts only inside the enclave. No node
            operator, validator, or Kosyn employee can read it.
          </div>
        </div>
      </section>

      {/* 02: NILLION ATTESTATION */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            02
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            VERIFIABLE AI.
            <br />
            <span className={styles.dim}>
              EVERY SOAP NOTE CRYPTOGRAPHICALLY PROVEN.
            </span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            Nillion nilAI runs inside AMD SEV-SNP + NVIDIA Confidential
            Computing. Every inference returns a{" "}
            <strong>secp256k1 ECDSA signature</strong> proving the output was
            generated in that enclave. That proof is hashed and stored
            permanently on Avalanche Fuji. Any auditor can verify — without
            trusting Kosyn.
          </p>
          <div className={styles.attestChain} data-scroll>
            {ATTEST_STEPS.map((s, i) => (
              <div key={i} className={styles.attestStep}>
                <div className={styles.attestNum}>{s.n}</div>
                <div className={styles.attestContent}>
                  <div className={styles.attestLabel}>{s.label}</div>
                  <div className={styles.attestSub}>{s.sub}</div>
                </div>
                {i < ATTEST_STEPS.length - 1 && (
                  <div className={styles.attestArrow}>↓</div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.callout} data-scroll>
            Query blockchain for <code>reportHash</code> → request original
            proof from workflow → <code>keccak256(proof) != reportHash</code>{" "}
            means tampering. Match means provably generated in enclave.
          </div>
        </div>
      </section>

      {/* 03: ACE POLICY ENGINE */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            03
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            4 HIPAA POLICIES.
            <br />
            <span className={styles.dim}>1 COMPOSABLE ENGINE.</span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            The ACE PolicyEngine chains four independently-deployed smart
            contracts. Every provider access request must clear all four gates
            in sequence. Failure at any gate blocks access and writes a{" "}
            <strong>denied attestation on-chain</strong> — denials are as
            auditable as grants.
          </p>
          <div className={styles.policyChain} data-scroll>
            {POLICIES.map((p, i) => (
              <div key={i} className={styles.policyItem}>
                <div className={styles.policyGate}>
                  <div className={styles.policyReg}>{p.reg}</div>
                  <div className={styles.policyId}>{p.id}</div>
                  <div className={styles.policyDesc}>{p.desc}</div>
                </div>
                {i < POLICIES.length - 1 && (
                  <div className={styles.policyArrow}>→</div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.exampleBox} data-scroll>
            <div className={styles.exampleLabel}>
              MIN_NECESSARY — SCOPE CREEP BLOCKED
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exKey}>Patient consented to:</span>
              <span className={styles.exVal}>recordType = VITALS (0x01)</span>
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exKey}>Provider requested:</span>
              <span className={styles.exVal}>recordType = IMAGING (0x04)</span>
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exKey}>PolicyEngine result:</span>
              <span className={styles.exBlocked}>
                BLOCKED — §164.514(d) violation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 04: HIPAA BITMASK */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            04
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            EVERY ACCESS.
            <br />
            <span className={styles.dim}>ATTESTED. FOREVER.</span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            <code>HIPAAComplianceRegistry</code> stores a bitmask per access
            event. Each bit maps directly to a HIPAA §164.312 safeguard. Any
            compliance officer can audit years of access logs via a single
            blockchain query — no manual review, no trust required.
          </p>
          <div className={styles.bitmaskGrid} data-scroll>
            {BITMASK_BITS.map((b) => (
              <div key={b.bit} className={styles.bitmaskBit}>
                <div className={styles.bitmaskHex}>{b.bit}</div>
                <div className={styles.bitmaskFlag}>{b.flag}</div>
                <div className={styles.bitmaskReg}>{b.reg}</div>
              </div>
            ))}
          </div>
          <div className={styles.codeBlock} data-scroll>
            <div className={styles.codeHeader}>
              contracts/src/HIPAAComplianceRegistry.sol
            </div>
            <pre className={styles.code}>{`struct ComplianceAttestation {
    address accessor;
    address patient;
    uint8   recordType;
    uint8   safeguardsMet;  // bitmask: 0x01 | 0x02 | 0x04 | 0x08
    uint256 timestamp;
    bytes32 reportHash;     // keccak256(CRE report) — tamper-evident
    bool    passed;
}

// Every access — approved OR denied — writes one attestation.
// Stored forever. Deletions impossible.`}</pre>
          </div>
          <div className={styles.callout} data-scroll>
            Replace annual HIPAA audits with:{" "}
            <code>getAttestations(patient, startTime, endTime)</code>
          </div>
        </div>
      </section>

      {/* 05: CONSENSUS IPFS */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            05
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            CONSENSUS BEFORE
            <br />
            <span className={styles.dim}>STORAGE. ALWAYS.</span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            Every health record upload uses{" "}
            <code>consensusIdenticalAggregation</code>. Multiple independent CRE
            nodes call Pinata separately and verify they received the same IPFS
            CID. A single compromised node returning different ciphertext causes
            consensus to fail. No substitution is possible.
          </p>
          <div className={styles.consensusDiagram} data-scroll>
            <div className={styles.consensusNodes}>
              {["CRE NODE A", "CRE NODE B", "CRE NODE C"].map((n, i) => (
                <div key={i} className={styles.consensusNode}>
                  {n}
                </div>
              ))}
            </div>
            <div className={styles.consensusDownArrows}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.cArrow}>
                  ↓
                </div>
              ))}
            </div>
            <div className={styles.consensusPinata}>PINATA (IPFS)</div>
            <div className={styles.consensusCheck}>
              <div className={styles.cCheckLabel}>
                CONSENSUS CHECK — all nodes must agree
              </div>
              <div className={styles.cCheckRows}>
                {[
                  "NODE A: QmXyz...abc ✓",
                  "NODE B: QmXyz...abc ✓",
                  "NODE C: QmXyz...abc ✓",
                ].map((r, i) => (
                  <div key={i} className={styles.cCheckRow}>
                    {r}
                  </div>
                ))}
              </div>
              <div className={styles.cCheckResult}>
                CONSENSUS REACHED — CID WRITTEN ON-CHAIN
              </div>
            </div>
          </div>
          <div className={styles.callout} data-scroll>
            Zero trust in any single CRE node. The network itself enforces
            integrity.
          </div>
        </div>
      </section>

      {/* 06: ECDH KEY WRAPPING */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionNum} data-scroll>
            06
          </div>
          <h2 className={styles.sectionTitle} data-scroll>
            YOUR KEY.
            <br />
            <span className={styles.dim}>ONLY THE ENCLAVE UNLOCKS IT.</span>
          </h2>
          <p className={styles.sectionLead} data-scroll>
            For the data marketplace, patient AES keys are wrapped via{" "}
            <strong>ECDH with the CRE&apos;s public key</strong>. The wrapped
            key is stored on-chain. Only the CRE TEE — holding the matching ECDH
            private key — can unwrap it. Not Kosyn. Not validators. Not
            researchers.
          </p>
          <div className={styles.ecdhFlow} data-scroll>
            {ECDH_STEPS.map((s, i) => (
              <div key={i} className={styles.ecdhItem}>
                <div className={styles.ecdhNode}>
                  <div className={styles.ecdhLabel}>{s.label}</div>
                  <div className={styles.ecdhSub}>{s.sub}</div>
                </div>
                {i < ECDH_STEPS.length - 1 && (
                  <div className={styles.ecdhArrow}>→</div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.callout} data-scroll>
            Threshold encryption without Vault DON complexity. The AES key never
            exists in plaintext outside the patient&apos;s device and the CRE
            enclave.
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <section className={styles.footerSection}>
        <div className={styles.inner}>
          <div className={styles.footerTitle} data-scroll>
            SIX INNOVATIONS.
            <br />
            ONE PLATFORM.
          </div>
          <p className={styles.footerSub} data-scroll>
            Built for Chainlink Convergence — CRE &amp; AI, Privacy, Risk &amp;
            Compliance tracks.
          </p>
          <div className={styles.footerLinks} data-scroll>
            <Link href="/pitch" className={styles.footerBtn}>
              VIEW PITCH DECK
            </Link>
            <Link
              href="/patients/dashboard"
              className={styles.footerBtnOutline}
            >
              ENTER DEMO →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
