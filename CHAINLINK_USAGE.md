# Chainlink Usage — Kosyn AI

> HIPAA-compliant EHR on Chainlink CRE. Every capability listed below is implemented and running on Avalanche Fuji.

**Repository:** https://github.com/gabrielantonyxaviour/kosyn

---

## CRE Capabilities Used

| Capability | Workflows | Contracts |
|---|---|---|
| ConfidentialHTTP | `consultation-processing` | — |
| HTTP Client | `record-upload`, `payment-mint`, `provider-decryption`, `data-aggregation` | — |
| EVM Read | `provider-decryption`, `data-aggregation` | — |
| EVM Write (ReceiverTemplate) | all workflows | `HealthRecordRegistry`, `KosynUSD` |
| Log Trigger | `provider-decryption` | `PatientConsent` (emits event) |
| HTTP Trigger | `record-upload`, `consultation-processing`, `payment-mint`, `provider-registration`, `patient-ai-attest` | — |
| ACE PolicyEngine | `provider-decryption` | `PolicyEngine`, 4 HIPAA policy contracts |
| Vault DON (secrets) | `consultation-processing`, `payment-mint` | — |

---

## 1. ConfidentialHTTP — AI API Key Sealed in Hardware Enclave

The Nillion nilAI API key is stored as a CRE Vault secret. It decrypts only inside the AMD SEV-SNP enclave — node operators executing the workflow never see it.

**File:** [`workflows/consultation-processing/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts)

- [`main.ts:8`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L8) — `import { ConfidentialHTTPClient } from "@chainlink/cre-sdk"`
- [`main.ts:109`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L109) — `new ConfidentialHTTPClient()` instantiation
- [`main.ts:110-122`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L110-L122) — `confidentialHttp.sendRequest()` to Nillion nilAI with API key as Vault secret — node operators see only sealed bytes
- [`main.ts:188-189`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L188-L189) — `prepareReportRequest(encodedPayload)` + `runtime.report()` — signed CRE report including `keccak256(nillionProof)`
- [`main.ts:195-200`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L195-L200) — `evmClient.writeReport()` — proof hash anchored in `HIPAAComplianceRegistry` on-chain

Nillion nilAI returns SOAP notes, ICD-10/CPT codes, and a **secp256k1 ECDSA attestation signature** proving the inference ran in that specific enclave. That signature is hashed and stored permanently on Avalanche Fuji — creating a cryptographically verifiable AI audit trail.

---

## 2. HTTP Client with consensusIdenticalAggregation

Every external HTTP call uses `consensusIdenticalAggregation` — multiple DON nodes independently make the same call and must return identical results. A single compromised node cannot substitute data.

### IPFS Upload — Record Upload Workflow

**File:** [`workflows/record-upload/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts)

- [`main.ts:14`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts#L14) — `import { consensusIdenticalAggregation } from "@chainlink/cre-sdk"`
- [`main.ts:69-90`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts#L69-L90) — `new HTTPClient()` + `sendRequest()` to Pinata for IPFS pinning
- [`main.ts:89`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts#L89) — `consensusIdenticalAggregation<string>()` — all DON nodes must return the same CID before it is written on-chain
- [`main.ts:106-107`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts#L106-L107) — `prepareReportRequest()` + `runtime.report()`
- [`main.ts:113-119`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts#L113-L119) — `evmClient.writeReport()` — IPFS CID written to `HealthRecordRegistry`

### IPFS Upload — Consultation Processing

**File:** [`workflows/consultation-processing/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts)

- [`main.ts:160-170`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts#L160-L170) — HTTP Client IPFS upload with `consensusIdenticalAggregation` — SOAP notes and proof uploaded; all nodes must agree on the resulting CID

### Stripe Payment Verification Inside TEE — Payment Mint Workflow

**File:** [`workflows/payment-mint/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts)

- [`main.ts:51-73`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts#L51-L73) — `HTTPClient.sendRequest()` to `api.stripe.com` from inside the TEE — Stripe key injected as Vault secret
- [`main.ts:72`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts#L72) — `consensusIdenticalAggregation<string>()` — all DON nodes verify the same Stripe payment; amount is taken from Stripe's response, not from the user-submitted body
- [`main.ts:123-124`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts#L123-L124) — `prepareReportRequest()` + `runtime.report()`
- [`main.ts:130-136`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts#L130-L136) — `evmClient.writeReport()` — triggers `KosynUSD._processReport()` which mints stablecoin

### IPFS Fetch — Provider Decryption

**File:** [`workflows/provider-decryption/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts)

- [`main.ts:336-354`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L336-L354) — `HTTPClient.sendRequest()` to fetch encrypted record from IPFS
- [`main.ts:353`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L353) — `consensusIdenticalAggregation<string>()` — all nodes must fetch identical ciphertext before TEE decryption proceeds
- [`main.ts:369`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L369) — `decryptBlob(blob, dataKey)` — AES-256-GCM decryption inside the enclave

---

## 3. EVM Read — On-Chain State Queried from Inside TEE

### Provider Decryption — 3 Sequential Contract Reads

**File:** [`workflows/provider-decryption/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts)

- [`main.ts:165-178`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L165-L178) — `evmClient.callContract()` — Read 1: `PatientConsent.consents(patient, provider)`
- [`main.ts:203-217`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L203-L217) — `evmClient.callContract()` — Read 2: `HealthRecordRegistry.getPatientRecords(patient)`
- [`main.ts:231-244`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L231-L244) — `evmClient.callContract()` — Read 3: `DataMarketplace.getMarketplaceKey(patient)` — fetches the ECDH-wrapped AES key stored on-chain
- [`main.ts:267-268`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L267-L268) — `unwrapKeyFromMarketplace(wrappedKey)` — ECDH unwrap inside the enclave; only the TEE's private key can derive the shared secret

### Data Aggregation — 4 Sequential Contract Reads

**File:** [`workflows/data-aggregation/main.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts)

- [`main.ts:67-74`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L67-L74) — `evmClient.callContract()` — Read 1: `DataMarketplace.getActiveContributors()`
- [`main.ts:102-109`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L102-L109) — `evmClient.callContract()` — Read 2: `DataMarketplace.getMarketplaceKey(patient)`
- [`main.ts:148-155`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L148-L155) — `evmClient.callContract()` — Read 3: `HealthRecordRegistry.getPatientRecords(patient)`
- [`main.ts:179-186`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L179-L186) — `evmClient.callContract()` — Read 4: `HealthRecordRegistry.getRecord(recordId)`
- [`main.ts:140`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L140) — `unwrapKeyFromMarketplace(wrappedKey)` — TEE key unwrap before IPFS decrypt
- [`main.ts:234`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L234) — `decryptBlob(blob, dataKey)` — decrypt patient record inside enclave for HIPAA de-identification

---

## 4. EVM Write via ReceiverTemplate

Both `HealthRecordRegistry` and `KosynUSD` inherit Chainlink's `ReceiverTemplate`, allowing CRE to write reports directly without a permissioned oracle intermediary.

### HealthRecordRegistry

**File:** [`contracts/src/HealthRecordRegistry.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol)

- [`HealthRecordRegistry.sol:4`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L4) — `import "./interfaces/ReceiverTemplate.sol"`
- [`HealthRecordRegistry.sol:8`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L8) — `contract HealthRecordRegistry is ReceiverTemplate`
- [`HealthRecordRegistry.sol:50-91`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L50-L91) — `function _processReport(bytes calldata report) internal override` — full CRE report processor
- [`HealthRecordRegistry.sol:53`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L53) — `op == 0x00` handler: record upload — stores IPFS CID and metadata
- [`HealthRecordRegistry.sol:57`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L57) — `op == 0x01` handler: provider access — runs ACE check and writes HIPAA attestation
- [`HealthRecordRegistry.sol:61`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L61) — `policyEngine.evaluate(msg.sender, report)` — ACE policy chain enforced on every access
- [`HealthRecordRegistry.sol:72-74`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HealthRecordRegistry.sol#L72-L74) — `complianceRegistry.attest(provider, patient, recordType, safeguardsMet, passed, keccak256(report))` — HIPAA bitmask written on-chain for every attempt

### KosynUSD — ERC-20 Stablecoin Minted by CRE

**File:** [`contracts/src/KosynUSD.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol)

- [`KosynUSD.sol:5`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol#L5) — `import "./interfaces/ReceiverTemplate.sol"`
- [`KosynUSD.sol:7`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol#L7) — `contract KosynUSD is ERC20, ReceiverTemplate`
- [`KosynUSD.sol:18-29`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol#L18-L29) — `function _processReport()` override — payment-mint CRE report processor
- [`KosynUSD.sol:24`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol#L24) — `require(!usedPaymentIds[stripePaymentId])` — `keccak256(stripePaymentId)` prevents double-mint across CRE calls
- [`KosynUSD.sol:26`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/KosynUSD.sol#L26) — `_mint(recipient, amount)` — minted only after Stripe was verified inside the TEE

---

## 5. ACE PolicyEngine — 4 Composable HIPAA Policies

Every provider access request must clear all four policy contracts in sequence. Failure at any gate blocks access and writes a **denied** attestation on-chain.

**File:** [`contracts/src/ace/PolicyEngine.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/PolicyEngine.sol)

- [`PolicyEngine.sol:19-29`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/PolicyEngine.sol#L19-L29) — `function evaluate(address caller, bytes calldata data) external returns (bool)`
- [`PolicyEngine.sol:20`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/PolicyEngine.sol#L20) — `extractor.extract(data)` — `KosynExtractor` decodes CRE report fields
- [`PolicyEngine.sol:22-26`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/PolicyEngine.sol#L22-L26) — policy loop: iterates all registered policies; any failure returns `false` and blocks access

### Policy 1 — ProviderAllowlistPolicy (HIPAA SS164.312(a)(1))

**File:** [`contracts/src/ace/ProviderAllowlistPolicy.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/ProviderAllowlistPolicy.sol)

Blocks access if the provider is not registered in `ProviderRegistry` or the patient has no active consent record.

### Policy 2 — ConsentExpiryPolicy (HIPAA SS164.312(a)(1))

**File:** [`contracts/src/ace/ConsentExpiryPolicy.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/ConsentExpiryPolicy.sol)

- [`ConsentExpiryPolicy.sol:35-53`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/ConsentExpiryPolicy.sol#L35-L53) — `function check()` — consent window enforcement
- [`ConsentExpiryPolicy.sol:44-45`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/ConsentExpiryPolicy.sol#L44-L45) — reads `expiresAt` from `PatientConsent` contract
- [`ConsentExpiryPolicy.sol:49`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/ConsentExpiryPolicy.sol#L49) — `return isActive && block.timestamp < expiresAt` — expired consents auto-reject with no manual intervention

### Policy 3 — MinimumNecessaryPolicy (HIPAA SS164.514(d))

**File:** [`contracts/src/ace/MinimumNecessaryPolicy.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/MinimumNecessaryPolicy.sol)

- [`MinimumNecessaryPolicy.sol:39-63`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/MinimumNecessaryPolicy.sol#L39-L63) — `function check()` — scope creep enforcement
- [`MinimumNecessaryPolicy.sol:48`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/MinimumNecessaryPolicy.sol#L48) — reads consented `recordType` from `PatientConsent`
- [`MinimumNecessaryPolicy.sol:51-52`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/MinimumNecessaryPolicy.sol#L51-L52) — `return consentedType == ALL_RECORD_TYPES || consentedType == requestedType` — if a provider consented to vitals, requesting imaging is blocked

### Policy 4 — AuditPolicy (HIPAA SS164.312(b))

**File:** [`contracts/src/ace/AuditPolicy.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/ace/AuditPolicy.sol)

Emits `AccessAudited(caller, operation, timestamp)` for every access attempt, approved or denied. On-chain events cannot be deleted.

---

## 6. HIPAAComplianceRegistry — On-Chain Bitmask Attestation

Every access attempt writes a tamper-evident attestation. The `reportHash` is `keccak256(CRE report)` — an auditor can request the original report from the workflow and verify the hash to prove it was not altered in transit.

**File:** [`contracts/src/HIPAAComplianceRegistry.sol`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HIPAAComplianceRegistry.sol)

- [`HIPAAComplianceRegistry.sol:25-28`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HIPAAComplianceRegistry.sol#L25-L28) — bitmask constants mapping each bit to a HIPAA regulation:
  - `0x01` = ACCESS_CONTROL (SS164.312(a)(1))
  - `0x02` = CONSENT_EXPIRY (SS164.312(a)(1))
  - `0x04` = MIN_NECESSARY (SS164.514(d))
  - `0x08` = AUDIT_TRAIL (SS164.312(b))
- [`HIPAAComplianceRegistry.sol:30-38`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HIPAAComplianceRegistry.sol#L30-L38) — `struct ComplianceAttestation` — stores accessor, patient, recordType, `safeguardsMet` bitmask, timestamp, `reportHash`, and pass/fail
- [`HIPAAComplianceRegistry.sol:94-125`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/contracts/src/HIPAAComplianceRegistry.sol#L94-L125) — `function attest()` — called from `HealthRecordRegistry._processReport()` on every access attempt, approved or denied

---

## 7. Workflow Configuration

**File:** [`workflows/project.yaml`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/project.yaml)

Nine CRE workflows registered against Avalanche Fuji:

| Workflow | Trigger | Key CRE Capabilities |
|---|---|---|
| [`record-upload`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/record-upload/main.ts) | HTTP | HTTP Client (IPFS), consensusIdenticalAggregation, EVM Write |
| [`consultation-processing`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/consultation-processing/main.ts) | HTTP | **ConfidentialHTTP** (Nillion nilAI), HTTP Client (IPFS), EVM Write |
| [`provider-decryption`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts) | Log | EVM Read x3, HTTP Client (IPFS), TEE AES decrypt, EVM Write |
| [`provider-access`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-access/main.ts) | HTTP | EVM Read, ACE policy check, EVM Write |
| [`payment-mint`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/payment-mint/main.ts) | HTTP | HTTP Client (Stripe inside TEE), consensusIdenticalAggregation, EVM Write |
| [`provider-registration`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-registration/main.ts) | HTTP | EVM Write (ProviderRegistry) |
| [`data-aggregation`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts) | HTTP | EVM Read x4, HTTP Client (IPFS), TEE decrypt + HIPAA de-id, EVM Write |
| [`data-marketplace`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-marketplace/main.ts) | Log | EVM Read, EVM Write (KUSD distribution) |
| [`patient-ai-attest`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/patient-ai-attest/main.ts) | HTTP | ConfidentialHTTP, EVM Write |

---

## 8. ECDH Key Wrapping — Threshold Encryption via CRE

Patient AES keys are wrapped against the CRE's ECDH public key and stored on-chain. Only the CRE TEE can unwrap them. Not Kosyn. Not validators. Not researchers.

**Frontend — key wrapping:**
- [`frontend/src/lib/nillion.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/frontend/src/lib/nillion.ts) — `fetchCREPublicKey()` — fetches CRE's ECDH public key from Nillion
- [`frontend/src/hooks/use-ai-session.ts`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/frontend/src/hooks/use-ai-session.ts) — `wrapKeyForMarketplace()` — WebAuthn PRF derives AES key; ECDH with CRE public key produces shared secret; AES key is encrypted with shared secret and stored on `DataMarketplace` contract

**TEE — key unwrapping:**
- [`workflows/provider-decryption/main.ts:267`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/provider-decryption/main.ts#L267) — `unwrapKeyFromMarketplace(wrappedKey)`
- [`workflows/data-aggregation/main.ts:140`](https://github.com/gabrielantonyxaviour/kosyn/blob/main/workflows/data-aggregation/main.ts#L140) — `unwrapKeyFromMarketplace(wrappedKey)`

The CRE TEE derives the same shared secret using its ECDH private key, decrypts the wrapped AES key, and uses it to decrypt IPFS blobs — entirely inside the enclave.

---

## Deployed Contracts (Avalanche Fuji)

| Contract | Address |
|---|---|
| HealthRecordRegistry | _fill after deployment_ |
| HIPAAComplianceRegistry | _fill after deployment_ |
| KosynUSD | _fill after deployment_ |
| PatientConsent | _fill after deployment_ |
| ProviderRegistry | _fill after deployment_ |
| DataMarketplace | _fill after deployment_ |
| PatientRegistry | _fill after deployment_ |

---

*Built for Chainlink Convergence — CRE & AI, Privacy, Risk & Compliance tracks.*
