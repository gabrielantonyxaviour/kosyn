# Kosyn AI

## Overview
HIPAA-compliant Electronic Health Record system on Chainlink CRE (Confidential Compute). Patients own their health data, providers access it with consent, AI analyzes records inside TEE enclaves — no one sees raw data.

**Hackathons:** Chainlink Convergence (CRE & AI) + Avalanche Build Games
**Tracks:** Privacy + AI + DeFi
**Avalanche Partners:** Kite AI (AI agent identity)

## Stack
- **Framework:** Next.js 15 (App Router)
- **Auth:** Thirdweb Connect (email/social for patients, MetaMask for providers)
- **UI:** shadcn/ui + Tailwind CSS
- **AI (App):** Claude Service at `CLAUDE_SERVICE_URL` — all app-level AI inference (see `src/lib/ai.ts`)
- **AI (CRE TEE):** Gemini 2.0 Flash inside TEE via CRE HTTP Client — for clinical analysis only
- **Contracts:** Foundry (Solidity ^0.8.19)
- **CRE:** Chainlink Runtime Environment — Confidential HTTP, Vault DON, HTTP Client, EVM Read/Write, Log Trigger, HTTP Trigger
- **Cross-chain:** CCIP (Chainlink Cross-Chain Interoperability Protocol)
- **Storage:** IPFS via Pinata (encrypted blobs)
- **Chains:** Avalanche Fuji (primary, chain ID 43113), Base Sepolia (cross-chain CCIP demo)

## Structure
- `frontend/` — Next.js web application (patient dashboard, provider portal)
- `contracts/` — Foundry smart contracts (HealthRecordRegistry, PatientConsent, ProviderRegistry, ACE policies)
- `workflows/` — CRE workflow TypeScript code (record-upload, provider-access)
- `docs/` — Product documentation (PRODUCT.md)
- `data/` — Local databases (memory MCP)
- `template/` — Protocol reference implementations (CCIP)
- `submission/` — Hackathon submission materials

## Smart Contracts
- `HealthRecordRegistry.sol` — Central registry, receives CRE reports via ReceiverTemplate, uses ACE PolicyEngine
- `PatientConsent.sol` — Consent management, grant/revoke provider access, emits events for CRE
- `ProviderRegistry.sol` — Verified healthcare provider registry (simplified for hackathon)
- ACE Policies: `ProviderAllowlistPolicy.sol`, `AuditPolicy.sol`, `KosynExtractor.sol`

## CRE Workflows
- `record-upload/` — HTTP Trigger → Confidential HTTP (encrypt) → HTTP Client (IPFS) → EVM Write
- `provider-access/` — Log Trigger → EVM Read (ACE check) → Confidential HTTP (decrypt + AI) → EVM Write

## Frontend Pages
- `/dashboard` — Patient: upload records, health timeline, AI insights, manage consents, access log
- `/provider` — Provider: request access, view records with AI clinical notes
- `/admin` — Audit view (access logs, compliance metrics)
- `/transfer` — Cross-chain record transfer via CCIP
- `/pitch` — Hackathon pitch deck (React components)

## Test Wallet
- **Address:** `0x7458ee961D5147D169F954181d158AD0bf635B78`
- **Funded on:** avalanche-fuji
- **Private key:** In `.env` (PRIVATE_KEY)
- **DO NOT** use this wallet for anything real. Test-only.

## Development
- `cd frontend && npm run dev` — Start webapp
- `cd contracts && forge test` — Run contract tests
- `cd contracts && forge script script/Deploy.s.sol --broadcast --rpc-url $NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL` — Deploy contracts
- `npx playwright test` — Run E2E tests

## Pipeline
- `docs/plan/pipeline.json` — Pipeline check config for /x2.5
- Checks: forge build, forge test, tsc --noEmit, eslint, next build, deploy dry run
- Deploy: `forge script script/Deploy.s.sol --broadcast --rpc-url $NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL`
- After deploy: set NEXT_PUBLIC_* contract addresses in `.env.local`

## Testing
- **Auth:** Thirdweb Connect — email/social login for patients, MetaMask for providers
- **Gas:** Thirdweb gas sponsorship (patients never pay gas)
- **Chains:** Avalanche Fuji (primary), Base Sepolia (CCIP demo)

## Environment Variables
Copy `.env.example` to `.env` and fill in:
1. `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` — from https://thirdweb.com/dashboard
2. `GEMINI_API_KEY` — from Google AI Studio
3. `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` — from https://pinata.cloud
4. Contract addresses after deployment

## AI Inference Pattern
**CRITICAL:** All app-level AI inference MUST go through the Claude Service. Never call OpenAI/Anthropic/Gemini APIs directly from the app.

- **Claude Service:** `https://innominate-unalleviatingly-yasmin.ngrok-free.dev`
- **Auth:** `X-API-Key` header with `CLAUDE_SERVICE_API_KEY`
- **Client:** `frontend/src/lib/ai.ts` — use `chat()` (streaming) or `chatSync()` (blocking)
- **Models:** `sonnet` (default, fast) or `opus` (complex reasoning)
- **Gemini exception:** Only used inside CRE TEE workflows (enclave-only, not app-level)

```typescript
// Example: app-level AI call
import { chatSync } from "@/lib/ai";
const { text } = await chatSync({ prompt: "Summarize this health record", model: "sonnet" });
```

## Key Patterns
- All health data encrypted inside TEE enclaves via CRE Confidential HTTP
- On-chain stores only hashes and metadata — never PHI (Protected Health Information)
- ACE PolicyEngine enforces HIPAA-equivalent access controls at smart contract level
- AI (Gemini) runs inside CRE TEE only — data never leaves enclave
- App-level AI inference → Claude Service (`src/lib/ai.ts`) — never direct API calls
- Vault DON threshold encryption for patient AES keys
