# Chainlink Usage — Kosyn AI

> HIPAA-compliant EHR on Chainlink CRE. Every capability listed below is implemented and running on Avalanche Fuji.

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

**File:** `workflows/consultation-processing/main.ts`

The Nillion nilAI API key is stored as a CRE Vault secret. It decrypts only inside the AMD SEV-SNP enclave — node operators executing the workflow never see it.

```
Line   8  — import { ConfidentialHTTPClient } from "@chainlink/cre-sdk"
Line 109  — const confidentialHttp = new ConfidentialHTTPClient()
Line 110  — const result = confidentialHttp.sendRequest(runtime, {
Line 113  —   url: `${nillionBaseUrl}/v1/chat/completions`,
Line 116  —   authorization: { values: [`Bearer ${nillionApiKey}`] }
               // nillionApiKey is a CRE Vault secret — never exposed to node operators
Line 122  — }).result()
```

Nillion nilAI returns SOAP notes, ICD-10/CPT codes, and a **secp256k1 ECDSA attestation signature** proving the inference ran in that specific enclave. That signature is hashed and anchored on-chain:

```
Line 188  — const reportRequest = prepareReportRequest(encodedPayload)
               // encodedPayload includes keccak256(nillionProof)
Line 189  — const report = runtime.report(reportRequest).result()
Line 195  — evmClient.writeReport(...)
               // → HIPAAComplianceRegistry.attest(..., keccak256(report))
```

---

## 2. HTTP Client with consensusIdenticalAggregation

Every external HTTP call (IPFS, Stripe) uses `consensusIdenticalAggregation` — multiple DON nodes independently make the same call and must return identical results. A single compromised node cannot substitute data.

### IPFS Upload — Record Upload Workflow
**File:** `workflows/record-upload/main.ts`
```
Line  14  — import { consensusIdenticalAggregation } from "@chainlink/cre-sdk"
Line  69  — const httpClient = new HTTPClient()
Line  70  — const doUpload = httpClient.sendRequest(
Line  78  —   sender => sender.sendRequest({ url: pinataUrl, method: "POST", ... }).result(),
Line  89  —   consensusIdenticalAggregation<string>()
               // all DON nodes must return same IPFS CID — prevents ciphertext substitution
Line 107  — evmClient.writeReport(...)  // CID written on-chain only after consensus
```

### IPFS Upload — Consultation Processing
**File:** `workflows/consultation-processing/main.ts`
```
Line 160  — const httpClient = new HTTPClient()
Line 170  — consensusIdenticalAggregation<string>()
               // SOAP notes + proof uploaded; all nodes must agree on resulting CID
```

### Stripe Payment Verification — Payment Mint Workflow
**File:** `workflows/payment-mint/main.ts`
```
Line  51  — const httpClient = new HTTPClient()
Line  52  — const doVerify = httpClient.sendRequest(
Line  56  —   url: `https://api.stripe.com/v1/payment_intents/${body.stripePaymentId}`,
Line  60  —   authorization: `Bearer ${stripeKey}`,  // Stripe key as Vault secret
Line  72  — consensusIdenticalAggregation<string>()
               // all DON nodes verify same Stripe payment — amount taken from Stripe response,
               // not from user-submitted body (prevents manipulation)
Line 124  — runtime.report(reportRequest).result()
Line 130  — evmClient.writeReport(...)  // → KosynUSD._processReport() → _mint()
```

### IPFS Fetch — Provider Decryption Workflow
**File:** `workflows/provider-decryption/main.ts`
```
Line 336  — httpClient.sendRequest(sender => sender.sendRequest({ url: ipfsUrl }).result(),
Line 353  —   consensusIdenticalAggregation<string>()
               // all nodes must fetch identical ciphertext before TEE decryption
Line 369  — decryptBlob(blob, dataKey)  // AES-256-GCM decryption inside enclave
```

---

## 3. EVM Read — On-Chain State in TEE

### Provider Decryption — 3 Sequential Contract Reads
**File:** `workflows/provider-decryption/main.ts`
```
Line 165  — evmClient.callContract(...)  // Read 1: PatientConsent.consents(patient, provider)
Line 203  — evmClient.callContract(...)  // Read 2: HealthRecordRegistry.getPatientRecords(patient)
Line 231  — evmClient.callContract(...)  // Read 3: DataMarketplace.getMarketplaceKey(patient)
               // fetches ECDH-wrapped AES key stored on-chain for TEE unwrapping
Line 267  — unwrapKeyFromMarketplace(wrappedKey)
               // ECDH unwrap inside enclave — only TEE can derive the shared secret
Line 369  — decryptBlob(blob, dataKey)  // decrypt patient record inside TEE
```

### Data Aggregation — 4 Sequential Contract Reads
**File:** `workflows/data-aggregation/main.ts`
```
Line  67  — evmClient.callContract(...)  // Read 1: DataMarketplace.getActiveContributors()
Line 102  — evmClient.callContract(...)  // Read 2: DataMarketplace.getMarketplaceKey(patient)
Line 148  — evmClient.callContract(...)  // Read 3: HealthRecordRegistry.getPatientRecords(patient)
Line 179  — evmClient.callContract(...)  // Read 4: HealthRecordRegistry.getRecord(recordId)
Line 140  — unwrapKeyFromMarketplace(wrappedKey)  // TEE key unwrap
Line 234  — decryptBlob(blob, dataKey)  // decrypt inside enclave for HIPAA de-identification
```

---

## 4. EVM Write via ReceiverTemplate

Both `HealthRecordRegistry` and `KosynUSD` inherit Chainlink's `ReceiverTemplate`, allowing CRE to write reports directly without a permissioned oracle intermediary.

### HealthRecordRegistry
**File:** `contracts/src/HealthRecordRegistry.sol`
```
Line   4  — import "./interfaces/ReceiverTemplate.sol"
Line   8  — contract HealthRecordRegistry is ReceiverTemplate
Line  50  — function _processReport(bytes calldata report) internal override {
Line  53  —   if (op == 0x00) { ... }  // record upload: store IPFS CID + metadata
Line  57  —   if (op == 0x01) { ... }  // provider access: run ACE + HIPAA attest
Line  61  —     policyEngine.evaluate(msg.sender, report)  // ACE policy chain
Line  72  —     complianceRegistry.attest(                  // HIPAA bitmask on-chain
Line  73  —       provider, patient, recordType, safeguardsMet, passed, keccak256(report)
Line  74  —     )
```

### KosynUSD (ERC-20 Stablecoin)
**File:** `contracts/src/KosynUSD.sol`
```
Line   5  — import "./interfaces/ReceiverTemplate.sol"
Line   7  — contract KosynUSD is ERC20, ReceiverTemplate
Line  18  — function _processReport(bytes calldata report) internal override {
Line  21  —   if (op == 0x04) { ... }  // payment mint operation
Line  24  —     require(!usedPaymentIds[stripePaymentId], "already minted")
               // keccak256(stripePaymentId) prevents double-mint across CRE calls
Line  26  —     _mint(recipient, amount)  // mint only after Stripe verified inside TEE
```

---

## 5. ACE PolicyEngine — 4 Composable HIPAA Policies

**File:** `contracts/src/ace/PolicyEngine.sol`

Every provider access request must clear all four policy contracts in sequence. Failure at any gate blocks access and writes a **denied** attestation on-chain.

```
Line  19  — function evaluate(address caller, bytes calldata data) external returns (bool) {
Line  20  —   extractor.extract(data)          // KosynExtractor decodes CRE report fields
Line  22  —   for (uint256 i = 0; i < policies.length; i++) {
Line  24  —     if (!policies[i].check(caller, data)) return false;  // any failure = blocked
```

### Policy 1 — ProviderAllowlistPolicy (HIPAA §164.312(a)(1))
**File:** `contracts/src/ace/ProviderAllowlistPolicy.sol`

Blocks access if provider is not registered in `ProviderRegistry` or patient has not granted active consent.

### Policy 2 — ConsentExpiryPolicy (HIPAA §164.312(a)(1))
**File:** `contracts/src/ace/ConsentExpiryPolicy.sol`
```
Line  35  — function check(...) external view returns (bool) {
Line  44  —   (, , uint256 expiresAt, bool isActive) = patientConsent.consents(patient, provider)
Line  49  —   return isActive && block.timestamp < expiresAt
               // expired consents auto-reject — no manual revocation needed
```

### Policy 3 — MinimumNecessaryPolicy (HIPAA §164.514(d))
**File:** `contracts/src/ace/MinimumNecessaryPolicy.sol`
```
Line  39  — function check(...) external view returns (bool) {
Line  48  —   (uint8 consentedType, , , ) = patientConsent.consents(patient, provider)
Line  51  —   return consentedType == ALL_RECORD_TYPES || consentedType == requestedRecordType
               // provider consented to vitals cannot access imaging — scope creep impossible
```

### Policy 4 — AuditPolicy (HIPAA §164.312(b))
**File:** `contracts/src/ace/AuditPolicy.sol`

Emits `AccessAudited(caller, operation, timestamp)` for every access attempt, approved or denied. Deletions impossible.

---

## 6. HIPAAComplianceRegistry — On-Chain Bitmask Attestation

**File:** `contracts/src/HIPAAComplianceRegistry.sol`

Every access attempt (granted or denied) writes a tamper-evident attestation. The `reportHash` field is `keccak256(CRE report)` — an auditor can request the original report and verify the hash to prove it was not altered.

```
Line  25  — uint8 constant SAFEGUARD_ACCESS_CONTROL = 0x01  // §164.312(a)(1)
Line  26  — uint8 constant SAFEGUARD_CONSENT_EXPIRY  = 0x02  // §164.312(a)(1)
Line  27  — uint8 constant SAFEGUARD_MIN_NECESSARY   = 0x04  // §164.514(d)
Line  28  — uint8 constant SAFEGUARD_AUDIT_TRAIL     = 0x08  // §164.312(b)

Line  30  — struct ComplianceAttestation {
Line  31  —   address accessor
Line  32  —   address patient
Line  33  —   uint8   recordType
Line  34  —   uint8   safeguardsMet   // bitmask — 0x0F = all four safeguards passed
Line  35  —   uint256 timestamp
Line  36  —   bytes32 reportHash      // keccak256(CRE report) — tamper-evident anchor
Line  37  —   bool    passed
Line  38  — }

Line  94  — function attest(
               address accessor, address patient, uint8 recordType,
               uint8 safeguardsMet, bool passed, bytes32 reportHash
            ) external onlyCaller { ... }
               // called from HealthRecordRegistry._processReport() on every access attempt
```

---

## 7. Workflow Configuration

**File:** `workflows/project.yaml`

Nine CRE workflows registered against Avalanche Fuji and Base Sepolia:

| Workflow | Trigger | Key Capabilities |
|---|---|---|
| `record-upload` | HTTP | HTTP Client (IPFS), EVM Write, consensusIdenticalAggregation |
| `consultation-processing` | HTTP | **ConfidentialHTTP** (Nillion nilAI), HTTP Client (IPFS), EVM Write |
| `provider-decryption` | Log | EVM Read ×3, HTTP Client (IPFS), EVM Write, TEE AES decrypt |
| `provider-access` | HTTP | EVM Read, ACE policy check, EVM Write |
| `payment-mint` | HTTP | HTTP Client (Stripe verify inside TEE), EVM Write (KosynUSD mint) |
| `provider-registration` | HTTP | EVM Write (ProviderRegistry) |
| `data-aggregation` | HTTP | EVM Read ×4, HTTP Client (IPFS ×N), TEE decrypt + HIPAA de-id, EVM Write |
| `data-marketplace` | Log | EVM Read, EVM Write (KUSD distribution) |
| `patient-ai-attest` | HTTP | ConfidentialHTTP (AI inference), EVM Write |

---

## 8. ECDH Key Wrapping — Threshold Encryption via CRE

For the data marketplace, patient AES keys are wrapped against the CRE's ECDH public key (fetched from Nillion). The wrapped key is stored on-chain. Only the CRE TEE — holding the matching ECDH private key — can unwrap it. Not Kosyn. Not validators.

**Frontend (key wrapping):**
```
frontend/src/lib/nillion.ts — fetchCREPublicKey()
frontend/src/hooks/use-ai-session.ts — wrapKeyForMarketplace()
   // WebAuthn PRF → AES key → ECDH(patient_ephemeral, CRE_pubkey) → shared_secret
   // → encrypt(AES_key, shared_secret) → store on DataMarketplace contract
```

**TEE (key unwrapping):**
```
workflows/provider-decryption/main.ts:267  — unwrapKeyFromMarketplace(wrappedKey)
workflows/data-aggregation/main.ts:140     — unwrapKeyFromMarketplace(wrappedKey)
   // CRE TEE derives same shared_secret using its ECDH private key
   // → decrypt(wrappedKey) → AES key usable for IPFS blob decryption
```

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
