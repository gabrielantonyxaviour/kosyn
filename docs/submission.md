# Kosyn AI — Hackathon Submission

**Hackathons:** Chainlink Convergence + Avalanche Build Games
**Submission date:** 2026-03-09

---

## Airtable Form Fields

### Project Name
`Kosyn AI`

### Tagline (one sentence)
Private health records patients actually own — with AI-powered clinical intelligence running inside Chainlink CRE TEEs, and a decentralized data marketplace where patients earn KUSD for every research query.

### Team Name
Kosyn AI

### GitHub Repository
`https://github.com/gabrielantonyxaviour/kosyn-ai`

### Live Demo URL
`https://kosyn.app` (or `http://localhost:3000` for local demo)

### Pitch Page
`https://kosyn.app/pitch`

### Demo Video URL
_(record walkthrough of the full demo flow below)_

---

## Project Description

### Elevator Pitch (≤ 280 chars)
Patients own their health data via WebAuthn PRF + AES-256-GCM. AI runs inside CRE TEEs (Nillion nilAI) — PHI never leaves the enclave. HIPAA compliance is verified on-chain. Researchers pay KUSD, patients earn.

### Problem Statement
Healthcare data is broken:
- **$10.9B** in breach costs in 2023 alone (IBM) — PHI is constantly exposed
- **0%** patient ownership of records globally — data is siloed in hospital systems
- **Every AI diagnostic tool** today is a privacy violation: the model sees your raw health data
- Hospitals can sell your data without compensation. Patients have no recourse.

### Solution
Kosyn AI is a HIPAA-compliant Electronic Health Record system where patients genuinely own their data:

1. **Client-side encryption** — WebAuthn PRF (Face ID / Touch ID) derives a deterministic AES-256-GCM key. Records are encrypted in the browser before leaving the device. Not even Kosyn can read them.

2. **Clinical AI in a TEE** — Doctors book consultations. AssemblyAI transcribes in real-time. The transcript is analyzed by Nillion nilAI inside a Chainlink CRE TEE — the AI generates SOAP notes without ever seeing unencrypted PHI outside the enclave. The TEE proof hash is stored on-chain.

3. **HIPAA on-chain** — Every data access attempt triggers a `ComplianceAttested` event on Avalanche Fuji via the ACE PolicyEngine. Four safeguards enforced on-chain: access control, consent expiry, minimum necessary, and audit trail.

4. **ECDH marketplace key escrow** — When patients opt into the data marketplace, they derive their key one more time (Face ID), wrap it with the CRE's ECDH public key, and register it on-chain. The CRE TEE uses its private key to unwrap, decrypt IPFS blobs, de-identify with 18 HIPAA Safe Harbor identifiers removed, apply k-anonymity (k≥3) + Laplace noise, and return aggregated statistics — never raw PHI.

5. **x402 data marketplace** — Researchers pay KUSD (6-decimal stablecoin on Fuji) to query population health statistics. Every payment triggers a CRE workflow that distributes KUSD proportionally to all consenting patients. No middlemen.

---

## How We Used Chainlink

### CRE (Chainlink Runtime Environment) — Primary Integration

We built **8 CRE workflows** deployed on Chainlink CRE staging:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `record-upload` | HTTP Trigger | Validates upload request, registers CID on HealthRecordRegistry |
| `consultation-processing` | HTTP Trigger | Sends transcript to Nillion nilAI TEE, stores SOAP note on IPFS, writes result to HealthRecordRegistry |
| `patient-ai-attest` | HTTP Trigger | Claude Service TEE inference for patient AI insights, attests via HIPAAComplianceRegistry |
| `payment-mint` | HTTP Trigger | Verifies Stripe payment → mints KUSD to patient wallet via `KosynUSD.onReport()` |
| `provider-registration` | HTTP Trigger | Registers verified healthcare provider in ProviderRegistry |
| `provider-decryption` | HTTP Trigger | Provider access with ACE policy check → logs to HIPAAComplianceRegistry |
| `data-marketplace` | HTTP Trigger | After KUSD payment, distributes revenue shares to consenting patients |
| `data-aggregation` | HTTP Trigger | ECDH key unwrap + IPFS fetch + AES decrypt + HIPAA de-identify + aggregate — all inside TEE |

**CRE features used:**
- `HTTPCapability` — HTTP Trigger for all workflows
- `EVMClient` — Read/write on Avalanche Fuji (43113)
- `HTTPClient` — External API calls (Nillion nilAI, Stripe, IPFS)
- `runtime.getSecret()` — API keys in CRE Vault DON
- `runtime.report()` + `prepareReportRequest()` — On-chain writes via forwarder
- `ReceiverTemplate` — All contracts inherit for CRE report processing

### Smart Contracts (Avalanche Fuji)

| Contract | Address | Purpose |
|----------|---------|---------|
| `HealthRecordRegistry` | `0x8F85839666aeb022b921AF01B560b9BE56569a2c` | Central EHR registry, ReceiverTemplate, ACE PolicyEngine |
| `PatientConsent` | `0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb` | Consent management, grant/revoke |
| `ProviderRegistry` | `0x12D2162F47AAAe1B0591e898648605daA186D644` | Verified provider registry |
| `KosynUSD` | `0xab11cda079c613eFA68C35dC46e4C05E0b1e1645` | KUSD stablecoin, 6 decimals, CRE-minted |
| `DataMarketplace` | `0xCAe1c804932AB07d3428774058eC14Fb4dfb2baB` | x402 marketplace, key escrow, KUSD distribution |
| `PatientRegistry` | `0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93` | Patient profile registry |
| `HIPAAComplianceRegistry` | `0x52645e013991918b734a3Bc08205b38c25f4FA25` | ComplianceAttested event store |

---

## Technical Architecture

```
PATIENT FLOW:
  Browser
  └── WebAuthn PRF (Face ID/Touch ID)
      └── AES-256-GCM encrypt record
          └── Pinata IPFS upload → CID
              └── CRE record-upload workflow → HealthRecordRegistry.registerRecord()

CLINICAL AI FLOW:
  AssemblyAI real-time transcript
  └── CRE consultation-processing workflow
      └── Nillion nilAI (TEE inference)
          └── SOAP note → IPFS CID
              └── HealthRecordRegistry.update() + HIPAAComplianceRegistry.attest()

DATA MARKETPLACE FLOW:
  Patient: DataMarketplace.listData() + Face ID → ECDH-wrap key → registerMarketplaceKey()
  Researcher: KUSD approve + DataMarketplace.submitQuery() → x-payment header
  CRE data-aggregation workflow (TEE):
    └── ECDH unwrap key → fetch IPFS CIDs → AES decrypt → HIPAA deidentify → k-anonymity → aggregate
  CRE data-marketplace workflow:
    └── Distribute KUSD to all contributing patients
```

---

## Tracks Applied For

### Chainlink Convergence — CRE Track
**Main track.** 8 CRE workflows. Full TEE integration. On-chain ACE HIPAA compliance.

### Chainlink Convergence — AI Track
Nillion nilAI inside CRE TEE for clinical SOAP note generation with cryptographic proof of computation.

### Avalanche Build Games — AI Agent Track (Kite AI)
Patient AI assistant with session memory. AI runs inside CRE TEE (Nillion nilAI). Records decrypted client-side before analysis.

### Avalanche Build Games — DeFi Track
KUSD stablecoin + DataMarketplace + x402 micropayments. End-to-end on Avalanche Fuji.

---

## External Integrations

| Service | What We Use It For |
|---------|-------------------|
| **Nillion nilAI** | TEE inference for clinical SOAP notes + patient AI assistant with cryptographic proof |
| **Chainlink CRE** | All backend workflows (8 total) — TEE compute, on-chain writes, Vault DON secrets |
| **AssemblyAI** | Real-time audio transcription during doctor-patient consultations |
| **Pinata** | IPFS storage for encrypted health record blobs |
| **Thirdweb** | Patient wallet authentication (social/email, zero-friction) + gas sponsorship |
| **Stripe** | Fiat → KUSD deposits (Stripe → CRE payment-mint → KosynUSD.onReport()) |

---

## Demo Flow (for judges)

**Full end-to-end demo:**
1. Go to `/patients/onboarding` → create passkey (Face ID / Touch ID)
2. Upload a vitals record at `/patients/records/new` → encrypted, IPFS CID on-chain
3. Go to `/patients/consultations` → book a doctor
4. Doctor enters consultation at `/doctors/consultation/[id]` → live transcript (AssemblyAI) → AI generates SOAP notes via Nillion nilAI TEE
5. On-chain: `HIPAAComplianceRegistry.attest()` called with bitmask + CRE report hash
6. Back as patient: go to `/patients/records/share` → enable data sharing → Face ID → ECDH key registered on-chain
7. As researcher: go to `/data` → pay KUSD → receive aggregated statistics

**Quick demo path (no wallet):** Go to `/data` → hit any endpoint → see 402 response → pay KUSD → receive data.

---

## What Makes This Novel

1. **WebAuthn PRF as a zero-knowledge key derivation** — no key storage, same key every time, derivation never leaves the device

2. **ECDH marketplace key escrow** — patients wrap their AES key with the CRE's public key at opt-in time. The CRE TEE is the only entity that can ever decrypt their records for aggregation — not even Kosyn can

3. **HIPAA compliance as a bitmask** — 4 safeguards encoded in an 8-bit field, verified on-chain by ACE PolicyEngine, emitted as `ComplianceAttested` event. Any auditor can verify without trusting the platform

4. **Nillion nilAI inside CRE** — TEE-within-TEE: Chainlink CRE orchestrates a call to Nillion's TEE inference API. The SOAP note is generated without PHI ever leaving an enclave. The response hash is stored on-chain as proof

5. **x402 micropayments for healthcare data** — no API keys, no accounts, just KUSD on Fuji and a transaction hash
