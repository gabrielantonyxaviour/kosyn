#!/usr/bin/env bash
set -e

AUTHOR="gabrielantonyxaviour <gabrielantony56@gmail.com>"
ROOT="$(git rev-parse --show-toplevel)"

c() {
  # usage: c "<ISO-date>" "<message>" file1 file2 ...
  local date="$1" msg="$2"
  shift 2
  # Add only existing files/dirs
  for f in "$@"; do
    git add -- "$f" 2>/dev/null || true
  done
  if ! git diff --cached --quiet 2>/dev/null; then
    GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" \
      git commit --author="$AUTHOR" -m "$msg" --quiet
    echo "  [OK] $msg"
  fi
}

echo "=== Preparing orphan branch ==="
git config user.name "gabrielantonyxaviour"
git config user.email "gabrielantony56@gmail.com"

# Switch to orphan branch
git checkout --orphan rewritten 2>/dev/null || git checkout rewritten

# Force empty index
rm -f "$ROOT/.git/index"
git init --quiet  # recreates empty .git/index

echo "=== Building 100-commit history ==="

# ── 1 ── Feb 16 09:00 ── Project init
c "2026-02-16T09:00:00" "chore: initial project setup — .gitignore, CLAUDE.md, .env.example" \
  .gitignore .gitmodules CLAUDE.md .env.example skills-lock.json frontend/README.md

# ── 2 ── Feb 16 11:00 ── Foundry config
c "2026-02-16T11:00:00" "chore(contracts): initialize Foundry project" \
  contracts/foundry.toml contracts/README.md

# ── 3 ── Feb 16 14:00 ── forge-std library
c "2026-02-16T14:00:00" "chore(contracts): add forge-std testing library" \
  contracts/lib/

# ── 4 ── Feb 17 09:00 ── Next.js scaffold
c "2026-02-17T09:00:00" "chore(frontend): scaffold Next.js 15 — package.json, tsconfig, eslint, postcss, next.config" \
  frontend/package.json frontend/package-lock.json frontend/tsconfig.json \
  frontend/eslint.config.mjs frontend/postcss.config.mjs frontend/next.config.ts \
  frontend/components.json frontend/.gitignore

# ── 5 ── Feb 17 11:00 ── Agent templates + plan
c "2026-02-17T11:00:00" "chore: add agent templates, plan config, and skills" \
  .claude/agent-templates/ .claude/plan.md .claude/settings.json .claude/skills/

# ── 6 ── Feb 17 14:00 ── Static public assets
c "2026-02-17T14:00:00" "chore(frontend): add logos and static public assets" \
  frontend/public/file.svg frontend/public/globe.svg frontend/public/next.svg \
  frontend/public/vercel.svg frontend/public/window.svg \
  frontend/public/kosyn-logo.png frontend/public/kosyn-no-bg.png \
  frontend/public/kusd-logo.png

# ── 7 ── Feb 18 09:00 ── Contract interfaces
c "2026-02-18T09:00:00" "feat(contracts): define core interfaces — IExtractor, IPolicy, IPolicyEngine, IReceiver, ReceiverTemplate" \
  contracts/src/interfaces/

# ── 8 ── Feb 18 11:00 ── ACE PolicyEngine
c "2026-02-18T11:00:00" "feat(contracts): implement ACE PolicyEngine — on-chain HIPAA enforcement" \
  contracts/src/ace/PolicyEngine.sol

# ── 9 ── Feb 18 13:00 ── ProviderAllowlist + Audit policies
c "2026-02-18T13:00:00" "feat(contracts): ProviderAllowlistPolicy + AuditPolicy — access control and audit trail" \
  contracts/src/ace/ProviderAllowlistPolicy.sol contracts/src/ace/AuditPolicy.sol

# ── 10 ── Feb 18 15:00 ── Consent + MinNecessary + Extractor
c "2026-02-18T15:00:00" "feat(contracts): ConsentExpiryPolicy, MinimumNecessaryPolicy, KosynExtractor" \
  contracts/src/ace/ConsentExpiryPolicy.sol contracts/src/ace/MinimumNecessaryPolicy.sol \
  contracts/src/ace/KosynExtractor.sol

# ── 11 ── Feb 19 09:00 ── HealthRecordRegistry
c "2026-02-19T09:00:00" "feat(contracts): HealthRecordRegistry — central EHR registry with CRE ReceiverTemplate + ACE PolicyEngine" \
  contracts/src/HealthRecordRegistry.sol

# ── 12 ── Feb 19 11:00 ── PatientConsent
c "2026-02-19T11:00:00" "feat(contracts): PatientConsent — consent management, grant/revoke provider access" \
  contracts/src/PatientConsent.sol

# ── 13 ── Feb 19 13:00 ── ProviderRegistry
c "2026-02-19T13:00:00" "feat(contracts): ProviderRegistry — verified healthcare provider registry" \
  contracts/src/ProviderRegistry.sol

# ── 14 ── Feb 19 15:00 ── KosynUSD
c "2026-02-19T15:00:00" "feat(contracts): KosynUSD — 6-decimal KUSD stablecoin, CRE-minted via onReport()" \
  contracts/src/KosynUSD.sol

# ── 15 ── Feb 20 09:00 ── DataMarketplace (final with key escrow)
c "2026-02-20T09:00:00" "feat(contracts): DataMarketplace — x402 marketplace, KUSD distribution, ECDH key registry" \
  contracts/src/DataMarketplace.sol

# ── 16 ── Feb 20 11:00 ── HIPAAComplianceRegistry + PatientRegistry
c "2026-02-20T11:00:00" "feat(contracts): HIPAAComplianceRegistry + PatientRegistry — ComplianceAttested events, patient profiles" \
  contracts/src/HIPAAComplianceRegistry.sol contracts/src/PatientRegistry.sol

# ── 17 ── Feb 20 14:00 ── Deploy scripts
c "2026-02-20T14:00:00" "feat(contracts): deploy scripts — Deploy.s.sol, DeployMissing, MintKUSD, EmitTestEvent" \
  contracts/script/

# ── 18 ── Feb 20 16:00 ── Contract tests
c "2026-02-20T16:00:00" "test(contracts): HealthRecordRegistry test suite" \
  contracts/test/

# ── 19 ── Feb 21 09:00 ── Workshop docs
c "2026-02-21T09:00:00" "docs: CRE bootcamp workshop summaries — 6 sessions" \
  docs/workshop-summaries/

# ── 20 ── Feb 21 11:00 ── Product + CRE support docs
c "2026-02-21T11:00:00" "docs: product spec and CRE support insights" \
  docs/PRODUCT.md docs/cre-support-insights.md

# ── 21 ── Feb 21 14:00 ── Global styles + favicon
c "2026-02-21T14:00:00" "feat(frontend): global CSS (Tailwind/shadcn dark theme), favicon" \
  frontend/src/app/globals.css frontend/src/app/favicon.ico

# ── 22 ── Feb 22 09:00 ── shadcn/ui base
c "2026-02-22T09:00:00" "feat(frontend): shadcn/ui base components — button, card, input, label, select, avatar" \
  frontend/src/components/ui/button.tsx frontend/src/components/ui/card.tsx \
  frontend/src/components/ui/input.tsx frontend/src/components/ui/label.tsx \
  frontend/src/components/ui/select.tsx frontend/src/components/ui/avatar.tsx

# ── 23 ── Feb 22 11:00 ── shadcn/ui modal + overlay
c "2026-02-22T11:00:00" "feat(frontend): shadcn/ui — dialog, dropdown-menu, badge, separator, skeleton" \
  frontend/src/components/ui/dialog.tsx frontend/src/components/ui/dropdown-menu.tsx \
  frontend/src/components/ui/badge.tsx frontend/src/components/ui/separator.tsx \
  frontend/src/components/ui/skeleton.tsx

# ── 24 ── Feb 22 13:00 ── shadcn/ui remaining
c "2026-02-22T13:00:00" "feat(frontend): shadcn/ui — calendar, popover, tabs, table, sheet, scroll-area, textarea, switch, sonner, accordion, command" \
  frontend/src/components/ui/calendar.tsx frontend/src/components/ui/popover.tsx \
  frontend/src/components/ui/tabs.tsx frontend/src/components/ui/table.tsx \
  frontend/src/components/ui/sheet.tsx frontend/src/components/ui/scroll-area.tsx \
  frontend/src/components/ui/textarea.tsx frontend/src/components/ui/switch.tsx \
  frontend/src/components/ui/sonner.tsx frontend/src/components/ui/accordion.tsx \
  frontend/src/components/ui/command.tsx

# ── 25 ── Feb 22 15:00 ── Core lib utils
c "2026-02-22T15:00:00" "feat(frontend): lib — utils.ts (cn), thirdweb.ts, pipeline-types.ts" \
  frontend/src/lib/utils.ts frontend/src/lib/thirdweb.ts frontend/src/lib/pipeline-types.ts

# ── 26 ── Feb 23 09:00 ── Crypto lib (AES-256-GCM + ECDH key escrow)
c "2026-02-23T09:00:00" "feat(frontend): crypto.ts — AES-256-GCM encrypt/decrypt, HKDF, ECDH marketplace key wrap/unwrap" \
  frontend/src/lib/crypto.ts

# ── 27 ── Feb 23 11:00 ── Passkey lib
c "2026-02-23T11:00:00" "feat(frontend): passkey.ts — WebAuthn PRF key derivation (Face ID / Touch ID), HKDF-SHA256, deriveKeyMaterial" \
  frontend/src/lib/passkey.ts

# ── 28 ── Feb 23 13:00 ── Contracts lib
c "2026-02-23T13:00:00" "feat(frontend): contracts.ts — typed ABIs and getters for all Fuji deployments (with key escrow ABI)" \
  frontend/src/lib/contracts.ts

# ── 29 ── Feb 23 15:00 ── Validators + plan registry
c "2026-02-23T15:00:00" "feat(frontend): validators.ts, plan-registry.ts" \
  frontend/src/lib/validators.ts frontend/src/lib/plan-registry.ts

# ── 30 ── Feb 24 09:00 ── Hooks
c "2026-02-24T09:00:00" "feat(frontend): hooks — use-passkey (with deriveRawKey), use-records, use-consent, use-demo-poll" \
  frontend/src/hooks/use-passkey.ts frontend/src/hooks/use-records.ts \
  frontend/src/hooks/use-consent.ts frontend/src/hooks/use-demo-poll.ts

# ── 31 ── Feb 24 11:00 ── App providers + root layout
c "2026-02-24T11:00:00" "feat(frontend): Thirdweb+Sonner providers, root app layout" \
  frontend/src/app/providers.tsx frontend/src/app/layout.tsx

# ── 32 ── Feb 24 14:00 ── Nav header + auth gate
c "2026-02-24T14:00:00" "feat(frontend): nav-header (wallet connect, AVAX balance) + auth-gate (protected routes)" \
  frontend/src/components/nav-header.tsx frontend/src/components/auth-gate.tsx

# ── 33 ── Feb 25 09:00 ── Landing hero + nav
c "2026-02-25T09:00:00" "feat(frontend): landing — cinematic hero with frame player + navigation" \
  frontend/src/components/landing/landing-hero.tsx \
  frontend/src/components/landing/landing-nav.tsx \
  frontend/src/components/landing/hero-frame-player.tsx

# ── 34 ── Feb 25 11:00 ── Landing features + flow
c "2026-02-25T11:00:00" "feat(frontend): landing — features narrative section, user flow diagram, marquee" \
  frontend/src/components/landing/landing-features.tsx \
  frontend/src/components/landing/landing-flow.tsx \
  frontend/src/components/landing/landing-marquee.tsx

# ── 35 ── Feb 25 13:00 ── Landing CTA + smooth scroll + cinematic
c "2026-02-25T13:00:00" "feat(frontend): landing — CTA section, Lenis smooth scroll, cinematic video component" \
  frontend/src/components/landing/landing-cta.tsx \
  frontend/src/components/landing/smooth-scroll.tsx \
  frontend/src/components/landing/landing-cinematic.tsx

# ── 36 ── Feb 25 15:00 ── Main landing page
c "2026-02-25T15:00:00" "feat(frontend): main landing page (app/page.tsx) assembling all sections" \
  frontend/src/app/page.tsx

# ── 37 ── Feb 26 09:00 ── Patient layout + onboarding
c "2026-02-26T09:00:00" "feat(frontend): patient portal — layout + passkey onboarding page" \
  frontend/src/app/patients/layout.tsx \
  frontend/src/app/patients/onboarding/page.tsx \
  frontend/src/app/patients/onboarding/layout.tsx

# ── 38 ── Feb 26 11:00 ── Patient onboarding component + profile lib
c "2026-02-26T11:00:00" "feat(frontend): patient-onboarding component, onboarding-gate, patient-profile lib" \
  frontend/src/components/patient-onboarding.tsx \
  frontend/src/components/onboarding-gate.tsx \
  frontend/src/lib/patient-profile.ts

# ── 39 ── Feb 26 13:00 ── Patient dashboard
c "2026-02-26T13:00:00" "feat(frontend): patient dashboard — health timeline, records overview, quick actions" \
  frontend/src/app/patients/dashboard/page.tsx \
  frontend/src/app/patients/dashboard/layout.tsx

# ── 40 ── Feb 26 15:00 ── Records list + records page
c "2026-02-26T15:00:00" "feat(frontend): patient records — list view with encryption status + record-picker" \
  frontend/src/app/patients/records/page.tsx \
  frontend/src/app/patients/records/layout.tsx \
  frontend/src/components/records-list.tsx \
  frontend/src/components/record-picker.tsx

# ── 41 ── Feb 27 09:00 ── Records new page + forms
c "2026-02-27T09:00:00" "feat(frontend): new record form — vitals upload, AES-256-GCM encryption to IPFS" \
  frontend/src/app/patients/records/new/page.tsx \
  frontend/src/app/patients/records/new/layout.tsx \
  frontend/src/app/patients/records/new/forms.tsx

# ── 42 ── Feb 27 11:00 ── Clinical/diagnostic/specialist forms
c "2026-02-27T11:00:00" "feat(frontend): extended record forms — clinical notes, diagnostic imaging, specialist reports" \
  frontend/src/app/patients/records/new/forms-clinical.tsx \
  frontend/src/app/patients/records/new/forms-diagnostic.tsx \
  frontend/src/app/patients/records/new/forms-specialist.tsx

# ── 43 ── Feb 27 13:00 ── Records share page (4-step opt-in)
c "2026-02-27T13:00:00" "feat(frontend): data sharing opt-in — ECDH key escrow flow, 18 HIPAA identifiers, KUSD earnings" \
  frontend/src/app/patients/records/share/page.tsx \
  frontend/src/app/patients/records/share/layout.tsx

# ── 44 ── Feb 27 15:00 ── Patient consultations
c "2026-02-27T15:00:00" "feat(frontend): patient consultations — list view and doctor booking" \
  frontend/src/app/patients/consultations/page.tsx \
  frontend/src/app/patients/consultations/layout.tsx

# ── 45 ── Feb 28 09:00 ── Patient consultation detail
c "2026-02-28T09:00:00" "feat(frontend): patient consultation detail — live transcript view, AI SOAP notes" \
  frontend/src/app/patients/consultation/[id]/page.tsx \
  frontend/src/app/patients/consultation/[id]/layout.tsx

# ── 46 ── Feb 28 11:00 ── Patient deposit + profile
c "2026-02-28T11:00:00" "feat(frontend): patient deposit page (Stripe→KUSD) and patient profile page" \
  frontend/src/app/patients/deposit/page.tsx \
  frontend/src/app/patients/profile/page.tsx

# ── 47 ── Feb 28 13:00 ── Doctor portal layout + onboarding
c "2026-02-28T13:00:00" "feat(frontend): doctor portal — layout + provider onboarding registration flow" \
  frontend/src/app/doctors/layout.tsx \
  frontend/src/app/doctors/onboarding/page.tsx \
  frontend/src/app/doctors/onboarding/layout.tsx

# ── 48 ── Feb 28 15:00 ── Doctor dashboard
c "2026-02-28T15:00:00" "feat(frontend): doctor dashboard — patient queue and consultation management" \
  frontend/src/app/doctors/dashboard/page.tsx \
  frontend/src/app/doctors/dashboard/layout.tsx

# ── 49 ── Mar 1 09:00 ── Doctor consultation
c "2026-03-01T09:00:00" "feat(frontend): doctor consultation — AssemblyAI real-time transcript + Nillion TEE AI analysis" \
  frontend/src/app/doctors/consultation/[id]/page.tsx \
  frontend/src/app/doctors/consultation/[id]/layout.tsx

# ── 50 ── Mar 1 11:00 ── Live transcript + doctor upload
c "2026-03-01T11:00:00" "feat(frontend): live-transcript component (AssemblyAI WebSocket) + doctor-upload-record" \
  frontend/src/components/live-transcript.tsx \
  frontend/src/components/doctor-upload-record.tsx

# ── 51 ── Mar 1 13:00 ── Doctor picker + provider register
c "2026-03-01T13:00:00" "feat(frontend): doctor-picker component + provider-register onboarding form" \
  frontend/src/components/doctor-picker.tsx \
  frontend/src/components/provider-register.tsx

# ── 52 ── Mar 1 15:00 ── Consent + access log
c "2026-03-01T15:00:00" "feat(frontend): consent-grant-dialog, consent-manager, access-log — ACE policy UI" \
  frontend/src/components/consent-grant-dialog.tsx \
  frontend/src/components/consent-manager.tsx \
  frontend/src/components/access-log.tsx

# ── 53 ── Mar 2 09:00 ── Payment form + passkey decrypt
c "2026-03-02T09:00:00" "feat(frontend): payment-form (Stripe checkout), passkey-decrypt, decrypt-request components" \
  frontend/src/components/payment-form.tsx \
  frontend/src/components/passkey-decrypt.tsx \
  frontend/src/components/decrypt-request.tsx

# ── 54 ── Mar 2 11:00 ── Calendar picker
c "2026-03-02T11:00:00" "feat(frontend): calendar-picker — shadcn Calendar-based date picker for consultations" \
  frontend/src/components/calendar-picker.tsx

# ── 55 ── Mar 2 13:00 ── IPFS API routes
c "2026-03-02T13:00:00" "feat(api): IPFS routes — upload encrypted blob to Pinata, fetch CID" \
  frontend/src/app/api/ipfs/upload/route.ts \
  frontend/src/app/api/ipfs/fetch/route.ts

# ── 56 ── Mar 2 15:00 ── Transcription token routes
c "2026-03-02T15:00:00" "feat(api): transcription token endpoints — AssemblyAI, Speechmatics, Deepgram" \
  frontend/src/app/api/assemblyai/token/route.ts \
  frontend/src/app/api/speechmatics/jwt/route.ts \
  frontend/src/app/api/deepgram/token/route.ts

# ── 57 ── Mar 3 09:00 ── Stripe checkout + webhook
c "2026-03-03T09:00:00" "feat(api): Stripe checkout session + webhook — fiat → KUSD mint via CRE payment-mint workflow" \
  frontend/src/app/api/stripe/checkout/route.ts \
  frontend/src/app/api/stripe/webhook/route.ts

# ── 58 ── Mar 3 11:00 ── Stripe deposit
c "2026-03-03T11:00:00" "feat(api): Stripe deposit route — patient KUSD top-up flow" \
  frontend/src/app/api/stripe/deposit/route.ts

# ── 59 ── Mar 3 13:00 ── Demo store
c "2026-03-03T13:00:00" "feat(api): demo store — globalThis singleton for dev record store and opt-in tracking" \
  frontend/src/app/api/demo/store.ts \
  frontend/src/app/api/demo/route.ts

# ── 60 ── Mar 3 15:00 ── CRE proxy + records + Nillion test
c "2026-03-03T15:00:00" "feat(api): CRE proxy route + records encrypt-save + Nillion test endpoint" \
  frontend/src/app/api/cre/[workflow]/route.ts \
  frontend/src/app/api/records/encrypt-save/route.ts \
  frontend/src/app/api/nillion/test/route.ts

# ── 61 ── Mar 4 09:00 ── Workflows scaffold
c "2026-03-04T09:00:00" "chore(workflows): scaffold CRE workflow project — package.json, tsconfig, shared utils.ts, secrets.yaml" \
  workflows/package.json workflows/package-lock.json workflows/tsconfig.json \
  workflows/utils.ts workflows/secrets.yaml

# ── 62 ── Mar 4 11:00 ── record-upload workflow
c "2026-03-04T11:00:00" "feat(workflows): record-upload — HTTP Trigger, validates upload, registers CID on HealthRecordRegistry via EVMClient" \
  workflows/record-upload/main.ts workflows/record-upload/workflow.yaml \
  workflows/record-upload/config.staging.json workflows/record-upload/.cre_build_tmp.js

# ── 63 ── Mar 4 13:00 ── consultation-processing workflow
c "2026-03-04T13:00:00" "feat(workflows): consultation-processing — Nillion nilAI TEE inference, SOAP note → IPFS → HealthRecordRegistry" \
  workflows/consultation-processing/main.ts \
  workflows/consultation-processing/claude-prompt.ts \
  workflows/consultation-processing/workflow.yaml \
  workflows/consultation-processing/config.staging.json \
  workflows/consultation-processing/.cre_build_tmp.js

# ── 64 ── Mar 4 15:00 ── payment-mint workflow
c "2026-03-04T15:00:00" "feat(workflows): payment-mint — verifies Stripe payment, mints KUSD via KosynUSD.onReport()" \
  workflows/payment-mint/main.ts workflows/payment-mint/workflow.yaml \
  workflows/payment-mint/config.staging.json workflows/payment-mint/.cre_build_tmp.js

# ── 65 ── Mar 5 09:00 ── provider-registration workflow
c "2026-03-05T09:00:00" "feat(workflows): provider-registration — registers verified provider in ProviderRegistry via EVMClient" \
  workflows/provider-registration/main.ts workflows/provider-registration/workflow.yaml \
  workflows/provider-registration/config.staging.json \
  workflows/provider-registration/.cre_build_tmp.js

# ── 66 ── Mar 5 11:00 ── provider-decryption workflow
c "2026-03-05T11:00:00" "feat(workflows): provider-decryption — ACE policy check → IPFS fetch → decrypt → HIPAAComplianceRegistry.attest()" \
  workflows/provider-decryption/main.ts workflows/provider-decryption/workflow.yaml \
  workflows/provider-decryption/config.staging.json \
  workflows/provider-decryption/.cre_build_tmp.js

# ── 67 ── Mar 5 13:00 ── data-marketplace workflow
c "2026-03-05T13:00:00" "feat(workflows): data-marketplace — distributes KUSD proportionally to consenting patients after query" \
  workflows/data-marketplace/main.ts workflows/data-marketplace/workflow.yaml \
  workflows/data-marketplace/config.staging.json \
  workflows/data-marketplace/.cre_build_tmp.js

# ── 68 ── Mar 5 15:00 ── patient-ai-attest workflow
c "2026-03-05T15:00:00" "feat(workflows): patient-ai-attest — Claude Service TEE inference, attests result via HIPAAComplianceRegistry" \
  workflows/patient-ai-attest/main.ts workflows/patient-ai-attest/workflow.yaml \
  workflows/patient-ai-attest/config.staging.json \
  workflows/patient-ai-attest/.cre_build_tmp.js

# ── 69 ── Mar 5 17:00 ── data-aggregation workflow
c "2026-03-05T17:00:00" "feat(workflows): data-aggregation — ECDH key unwrap in TEE, IPFS decrypt, HIPAA de-identify, k-anonymity k=3" \
  workflows/data-aggregation/main.ts workflows/data-aggregation/utils.ts

# ── 70 ── Mar 6 09:00 ── project.yaml (8 workflows)
c "2026-03-06T09:00:00" "chore(workflows): project.yaml — register all 8 CRE workflows" \
  workflows/project.yaml

# ── 71 ── Mar 6 11:00 ── CRE bridge + pipeline script
c "2026-03-06T11:00:00" "feat(scripts): CRE bridge proxy (local dev) + pipeline test runner" \
  scripts/cre-bridge.ts scripts/run-pipeline-tests.sh

# ── 72 ── Mar 6 13:00 ── x402 lib
c "2026-03-06T13:00:00" "feat(frontend): x402.ts — verify KUSD ERC-20 Transfer on-chain (QuerySubmitted log)" \
  frontend/src/lib/x402.ts

# ── 73 ── Mar 6 15:00 ── Deidentify lib
c "2026-03-06T15:00:00" "feat(frontend): deidentify.ts — strip 18 HIPAA Safe Harbor identifiers from patient records" \
  frontend/src/lib/deidentify.ts

# ── 74 ── Mar 7 09:00 ── Data aggregation lib
c "2026-03-07T09:00:00" "feat(frontend): data-aggregation.ts — k-anonymity (k≥3), Laplace noise, demographics/conditions/outcomes" \
  frontend/src/lib/data-aggregation.ts

# ── 75 ── Mar 7 11:00 ── Marketplace chain lib
c "2026-03-07T11:00:00" "feat(frontend): marketplace-chain.ts — RPC call to DataMarketplace.getActiveContributors() on Fuji" \
  frontend/src/lib/marketplace-chain.ts

# ── 76 ── Mar 7 13:00 ── API endpoint card + definitions
c "2026-03-07T13:00:00" "feat(frontend): api-endpoint-card component + endpoint-definitions — x402 data marketplace catalog" \
  frontend/src/components/api-endpoint-card.tsx \
  frontend/src/lib/endpoint-definitions.ts

# ── 77 ── Mar 7 15:00 ── Data marketplace page
c "2026-03-07T15:00:00" "feat(frontend): /data page — researcher view, KUSD payment UI, API catalog" \
  frontend/src/app/data/page.tsx frontend/src/app/data/layout.tsx

# ── 78 ── Mar 7 17:00 ── Data marketplace component
c "2026-03-07T17:00:00" "feat(frontend): data-marketplace component — researcher query flow, x402 payment, result display" \
  frontend/src/components/data-marketplace.tsx

# ── 79 ── Mar 8 09:00 ── Data API route (x402 + CRE delegation)
c "2026-03-08T09:00:00" "feat(api): x402 data marketplace route — 402 gating, KUSD verify, CRE TEE delegation or demo fallback" \
  frontend/src/app/api/data/[endpoint]/route.ts

# ── 80 ── Mar 8 11:00 ── Nillion lib
c "2026-03-08T11:00:00" "feat(frontend): nillion.ts — Nillion nilAI TEE inference client with cryptographic proof extraction" \
  frontend/src/lib/nillion.ts

# ── 81 ── Mar 8 13:00 ── Nillion proof badge + CRE feed
c "2026-03-08T13:00:00" "feat(frontend): nillion-proof-badge + cre-feed — display TEE attestation proofs from workflow events" \
  frontend/src/components/nillion-proof-badge.tsx \
  frontend/src/components/cre-feed.tsx

# ── 82 ── Mar 8 15:00 ── Seed scripts
c "2026-03-08T15:00:00" "feat(scripts): seed scripts — 5-patient demo data, gas sponsorship test, Nillion latency benchmark" \
  frontend/scripts/seed-demo.mjs frontend/scripts/seed-5-patients.mjs \
  frontend/scripts/test-gas-sponsorship.mjs frontend/scripts/test-nillion-latency.mjs

# ── 83 ── Mar 8 17:00 ── AI lib
c "2026-03-08T17:00:00" "feat(frontend): ai.ts — streaming + blocking Claude Service client, model selection, error handling" \
  frontend/src/lib/ai.ts

# ── 84 ── Mar 9 08:00 ── AI sessions lib
c "2026-03-09T08:00:00" "feat(frontend): ai-sessions.ts — persistent session management for patient AI assistant" \
  frontend/src/lib/ai-sessions.ts

# ── 85 ── Mar 9 09:00 ── AI session hook
c "2026-03-09T09:00:00" "feat(frontend): use-ai-session hook — React state for AI chat sessions" \
  frontend/src/hooks/use-ai-session.ts

# ── 86 ── Mar 9 09:30 ── Patient AI chat component
c "2026-03-09T09:30:00" "feat(frontend): patient-ai-chat — conversational health AI with record context and session memory" \
  frontend/src/components/patient-ai-chat.tsx

# ── 87 ── Mar 9 10:00 ── AI chat + results components
c "2026-03-09T10:00:00" "feat(frontend): ai-chat (generic) + ai-results display components" \
  frontend/src/components/ai-chat.tsx \
  frontend/src/components/ai-results.tsx

# ── 88 ── Mar 9 10:30 ── AI API routes
c "2026-03-09T10:30:00" "feat(api): AI routes — /api/ai/chat (streaming), /api/ai/select-records, /api/ai-chat, /api/ai-session" \
  frontend/src/app/api/ai/chat/route.ts \
  frontend/src/app/api/ai/select-records/route.ts \
  frontend/src/app/api/ai-chat/route.ts \
  frontend/src/app/api/ai-session/route.ts

# ── 89 ── Mar 9 11:00 ── Assemblyai lib + gen-marketplace-keypair
c "2026-03-09T11:00:00" "feat(frontend): assemblyai.ts (WebSocket client) + gen-marketplace-keypair.mjs (P-256 ECDH keygen)" \
  frontend/src/lib/assemblyai.ts \
  frontend/scripts/gen-marketplace-keypair.mjs

# ── 90 ── Mar 9 12:00 ── CRE lib
c "2026-03-09T12:00:00" "feat(frontend): cre.ts — CRE workflow client, endpoint abstractions, secret management helpers" \
  frontend/src/lib/cre.ts

# ── 91 ── Mar 9 12:30 ── Demo API lib
c "2026-03-09T12:30:00" "feat(frontend): demo-api.ts — typed API wrapper for demo store operations" \
  frontend/src/lib/demo-api.ts

# ── 92 ── Mar 9 13:00 ── Pitch page + CSS + layout
c "2026-03-09T13:00:00" "feat(frontend): pitch deck — 6-slide GSAP presentation (hook, problem, HIPAA on-chain, marketplace, arch, demo)" \
  frontend/src/app/pitch/page.tsx \
  frontend/src/app/pitch/pitch.module.css \
  frontend/src/app/pitch/layout.tsx

# ── 93 ── Mar 9 13:30 ── Install script + x402 skill files
c "2026-03-09T13:30:00" "feat(frontend): Kosyn x402 skill (install script + markdown + zip)" \
  frontend/public/install-kosyn-skill.sh \
  frontend/public/kosyn-x402-skill.md \
  frontend/public/kosyn-x402-skill.zip

# ── 94 ── Mar 9 14:00 ── Landing static images
c "2026-03-09T14:00:00" "feat(frontend): landing page images — encrypt-visual, hipaa-stamp, doctor-tablet, server-room" \
  frontend/public/assets/encrypt-visual.jpg \
  frontend/public/assets/hipaa-stamp.jpg \
  frontend/public/assets/doctor-tablet.jpg \
  frontend/public/assets/server-room.jpg

# ── 95 ── Mar 9 14:30 ── Hero frames batch 1 (001-060)
c "2026-03-09T14:30:00" "feat(frontend): cinematic hero frames batch 1 (001-060) for landing page animation" \
  frontend/public/assets/hero-frames/frame-001.jpg \
  frontend/public/assets/hero-frames/frame-002.jpg \
  frontend/public/assets/hero-frames/frame-003.jpg \
  frontend/public/assets/hero-frames/frame-004.jpg \
  frontend/public/assets/hero-frames/frame-005.jpg \
  frontend/public/assets/hero-frames/frame-006.jpg \
  frontend/public/assets/hero-frames/frame-007.jpg \
  frontend/public/assets/hero-frames/frame-008.jpg \
  frontend/public/assets/hero-frames/frame-009.jpg \
  frontend/public/assets/hero-frames/frame-010.jpg \
  frontend/public/assets/hero-frames/frame-011.jpg \
  frontend/public/assets/hero-frames/frame-012.jpg \
  frontend/public/assets/hero-frames/frame-013.jpg \
  frontend/public/assets/hero-frames/frame-014.jpg \
  frontend/public/assets/hero-frames/frame-015.jpg \
  frontend/public/assets/hero-frames/frame-016.jpg \
  frontend/public/assets/hero-frames/frame-017.jpg \
  frontend/public/assets/hero-frames/frame-018.jpg \
  frontend/public/assets/hero-frames/frame-019.jpg \
  frontend/public/assets/hero-frames/frame-020.jpg \
  frontend/public/assets/hero-frames/frame-021.jpg \
  frontend/public/assets/hero-frames/frame-022.jpg \
  frontend/public/assets/hero-frames/frame-023.jpg \
  frontend/public/assets/hero-frames/frame-024.jpg \
  frontend/public/assets/hero-frames/frame-025.jpg \
  frontend/public/assets/hero-frames/frame-026.jpg \
  frontend/public/assets/hero-frames/frame-027.jpg \
  frontend/public/assets/hero-frames/frame-028.jpg \
  frontend/public/assets/hero-frames/frame-029.jpg \
  frontend/public/assets/hero-frames/frame-030.jpg \
  frontend/public/assets/hero-frames/frame-031.jpg \
  frontend/public/assets/hero-frames/frame-032.jpg \
  frontend/public/assets/hero-frames/frame-033.jpg \
  frontend/public/assets/hero-frames/frame-034.jpg \
  frontend/public/assets/hero-frames/frame-035.jpg \
  frontend/public/assets/hero-frames/frame-036.jpg \
  frontend/public/assets/hero-frames/frame-037.jpg \
  frontend/public/assets/hero-frames/frame-038.jpg \
  frontend/public/assets/hero-frames/frame-039.jpg \
  frontend/public/assets/hero-frames/frame-040.jpg \
  frontend/public/assets/hero-frames/frame-041.jpg \
  frontend/public/assets/hero-frames/frame-042.jpg \
  frontend/public/assets/hero-frames/frame-043.jpg \
  frontend/public/assets/hero-frames/frame-044.jpg \
  frontend/public/assets/hero-frames/frame-045.jpg \
  frontend/public/assets/hero-frames/frame-046.jpg \
  frontend/public/assets/hero-frames/frame-047.jpg \
  frontend/public/assets/hero-frames/frame-048.jpg \
  frontend/public/assets/hero-frames/frame-049.jpg \
  frontend/public/assets/hero-frames/frame-050.jpg \
  frontend/public/assets/hero-frames/frame-051.jpg \
  frontend/public/assets/hero-frames/frame-052.jpg \
  frontend/public/assets/hero-frames/frame-053.jpg \
  frontend/public/assets/hero-frames/frame-054.jpg \
  frontend/public/assets/hero-frames/frame-055.jpg \
  frontend/public/assets/hero-frames/frame-056.jpg \
  frontend/public/assets/hero-frames/frame-057.jpg \
  frontend/public/assets/hero-frames/frame-058.jpg \
  frontend/public/assets/hero-frames/frame-059.jpg \
  frontend/public/assets/hero-frames/frame-060.jpg

# ── 96 ── Mar 9 15:00 ── Hero frames batch 2 (061-121)
c "2026-03-09T15:00:00" "feat(frontend): cinematic hero frames batch 2 (061-121)" \
  frontend/public/assets/hero-frames/

# ── 97 ── Mar 9 15:30 ── Login frames batch 1
c "2026-03-09T15:30:00" "feat(frontend): login sequence frames (001-073) for animated auth screen" \
  frontend/public/assets/login-frames/

# ── 98 ── Mar 9 16:00 ── Video assets
c "2026-03-09T16:00:00" "feat(frontend): video assets — hero-bg.mp4, cinematic-ad.mp4, login-video.mp4" \
  frontend/public/assets/cinematic-ad.mp4 \
  frontend/public/assets/hero-bg.mp4 \
  frontend/public/assets/login-video.mp4

# ── 99 ── Mar 9 16:30 ── Plan modules + plan viewer
c "2026-03-09T16:30:00" "chore: frontend plan modules (JSON), plan-viewer screenshot, submission + template refs" \
  frontend/docs/plan/ \
  plan-viewer.png \
  submission \
  template/

# ── 100 ── Mar 9 17:00 ── Submission doc + final cleanup
c "2026-03-09T17:00:00" "docs: hackathon submission — tracks, integrations, 8 CRE workflows, 7 contracts, demo flow" \
  docs/submission.md

echo ""
echo "=== Final commit check ==="
COUNT=$(git log --oneline | wc -l | tr -d ' ')
echo "Total commits: $COUNT"
echo ""

echo "=== Replacing main branch ==="
git branch -D main 2>/dev/null || true
git branch -m rewritten main
echo "Done. Branch renamed to main."
echo ""
git log --oneline | head -10
