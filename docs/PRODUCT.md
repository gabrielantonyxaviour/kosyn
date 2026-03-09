# Kosyn AI -- HIPAA-Compliant EHR on CRE

**Hackathon:** Chainlink Convergence + Avalanche Build Games
**Tracks:** Privacy + AI + DeFi (multi-track submission)
**Tagline:** Private health records that patients actually own, with AI-powered clinical intelligence -- built on Chainlink Confidential Compute.

---

## Table of Contents

1. [Product Overview and Problem Statement](#1-product-overview-and-problem-statement)
2. [Core Features](#2-core-features)
3. [Full CRE Architecture](#3-full-cre-architecture)
4. [Smart Contracts](#4-smart-contracts)
5. [ACE Compliance Policies](#5-ace-compliance-policies)
6. [Frontend Pages](#6-frontend-pages)
7. [External Integrations](#7-external-integrations)
8. [Hackathon Demo Flow](#8-hackathon-demo-flow)
9. [Business Model](#9-business-model)
10. [Technical Hackathon Scope](#10-technical-hackathon-scope)
11. [Tracks and Prizes](#11-tracks-and-prizes)

---

## 1. Product Overview and Problem Statement

### The Healthcare Data Crisis

The global healthcare industry is valued at $4.4 trillion. At its core is the Electronic Health Record (EHR) -- the digital representation of a patient's medical history. Despite decades of digitization, the EHR landscape remains deeply fragmented and hostile to the people it is supposed to serve: patients.

**The problems are structural:**

| Problem | Impact | Scale |
|---------|--------|-------|
| **EHR Silos** | Each hospital, clinic, and lab runs its own proprietary EHR system (Epic, Cerner, Allscripts). Patient data is trapped inside these systems with no interoperability. | 78% of US hospitals use a proprietary EHR system. Cross-system data exchange requires manual faxes, phone calls, or CDs. |
| **Patient Data Portability** | Patients legally own their health data (HIPAA Right of Access), but practically cannot move it. Switching providers means starting from scratch. | Average American visits 7+ healthcare providers over their lifetime. Each visit starts with redundant intake forms because prior records are inaccessible. |
| **HIPAA Compliance Burden** | Providers spend enormous resources on compliance -- access controls, audit trails, encryption, breach notification. Small practices are disproportionately burdened. | Healthcare data breaches cost an average of $10.93 million per incident (IBM 2023). HIPAA compliance costs $8.3 billion annually across the US healthcare system. |
| **Data Monetization Without Consent** | Health data is sold to pharma companies, insurers, and data brokers. Patients receive no compensation and often no notification. | The health data market is projected to reach $67 billion by 2025. Patients see $0 of this value. |
| **AI Inaccessibility** | Clinical AI tools exist but require centralized access to raw patient data, creating massive privacy risks. Hospitals are reluctant to adopt AI due to liability and data exposure concerns. | 83% of healthcare organizations report experiencing a data breach. AI adoption in clinical settings is below 15% despite proven benefits. |

### Why Blockchain Alone Does Not Solve This

Previous attempts to put health records on blockchain have failed because:

1. **Transparency is the enemy.** Public blockchains expose all data. Health records cannot be visible to validators, miners, or the public.
2. **Smart contracts are deterministic, not intelligent.** Raw EHR data requires interpretation -- drug interaction checks, anomaly detection, risk scoring. Standard smart contracts cannot perform this analysis.
3. **Cross-chain fragmentation.** Different provider networks operate on different chains. A patient's records on Ethereum are invisible to a provider on Base.
4. **Compliance is not optional.** HIPAA requires specific access controls, audit trails, and breach notification. "Decentralized" does not equal "compliant."

### Why CRE Confidential Compute Changes Everything

Chainlink's CRE (Chainlink Runtime Environment) with Confidential Compute solves all four problems simultaneously:

| Problem | CRE Solution |
|---------|-------------|
| Data must be private | **Confidential HTTP + Vault DON**: Health records are encrypted, stored off-chain, and processed exclusively inside TEE enclaves. CRE nodes, DON operators, and blockchain validators never see raw data. |
| Data needs intelligence | **HTTP Client inside TEE**: AI models (Nillion nilAI (Gemma 3 27B)) analyze health records inside the enclave. Drug interaction checks, anomaly detection, and risk scoring happen on encrypted data. The AI output exits the enclave; the raw data never does. |
| Data must be portable | **CCIP**: Encrypted record references are transferred between chains via Chainlink Cross-Chain Interoperability Protocol. ACE policies travel with the data. |
| Data must be compliant | **ACE (Automated Compliance Engine)**: HIPAA-equivalent access policies are enforced at the smart contract level. Allowlists, time-limited access, emergency overrides, geographic restrictions, rate limits, and immutable audit logs -- all on-chain. |

**The fundamental insight:** CRE's Confidential Compute creates a system where health data can be stored, analyzed, shared, and audited -- all without any party (including the system itself) ever seeing the raw data in plaintext outside a hardware-secured enclave.

---

## 2. Core Features

### 2.1 Patient Record Upload

**What it does:** Patients upload health data (lab results, prescriptions, imaging reports, clinical notes) through a web application. The data is encrypted inside a TEE enclave via Confidential HTTP, stored as an encrypted blob on IPFS or Arweave, and the blob's content hash is recorded on-chain along with metadata.

**How it works:**

1. Patient authenticates via Thirdweb Connect (email/social login -- no crypto knowledge required).
2. Patient selects files to upload (PDF lab reports, DICOM imaging, prescription records, clinical notes).
3. The application sends the file data to a CRE workflow via HTTP Trigger.
4. Inside the CRE workflow, Confidential HTTP processes the data within the TEE enclave:
   - The raw file is encrypted using AES-256-GCM.
   - The AES key is threshold-encrypted and stored in the Vault DON.
   - The encrypted blob is uploaded to IPFS/Arweave via HTTP Client (inside TEE).
5. The IPFS/Arweave hash, record type, timestamp, and encrypted metadata are written on-chain via EVM Write to the `HealthRecordRegistry` contract.
6. The patient's wallet address is mapped to the record hash on-chain.

**Privacy guarantees:**
- Raw health data never leaves the TEE enclave in plaintext.
- The encrypted blob on IPFS/Arweave is unreadable without the Vault DON key shares.
- On-chain data contains only hashes and metadata (record type, timestamp) -- no PHI (Protected Health Information).
- Even the upload endpoint does not see the raw data -- Confidential HTTP handles encryption before CRE nodes process it.

**Record types supported:**
- Laboratory results (blood panels, urinalysis, pathology)
- Prescriptions and medication history
- Imaging reports (radiology, X-ray, MRI summaries)
- Clinical notes and discharge summaries
- Vaccination records
- Allergy lists

### 2.2 Provider Access Control

**What it does:** Healthcare providers request access to a patient's records. The ACE compliance engine evaluates the request against the patient's consent policies. Approved providers receive time-limited access to encrypted records, which are decrypted only inside the TEE. Denied requests are logged on-chain.

**How it works:**

1. Provider submits an `AccessRequested` transaction on-chain via the `PatientConsent` contract, specifying the patient address, record type(s) requested, and reason.
2. The `AccessRequested` event is emitted.
3. A CRE workflow (Log Trigger) picks up the event.
4. The workflow performs an EVM Read to check ACE policies:
   - Is the provider registered in `ProviderRegistry`?
   - Is the provider on the patient's allowlist?
   - Is the access request within the allowed time window?
   - Is the provider's geographic jurisdiction approved?
   - Has the provider exceeded the daily access rate limit?
5. If any policy fails: the workflow writes a denial record on-chain (who, when, why denied) and optionally notifies the patient.
6. If all policies pass: the workflow uses Confidential HTTP to decrypt the record inside the TEE, optionally runs AI analysis, and delivers the encrypted result to the provider's contract address via EVM Write.

**Access grant types:**
- **Standard access**: Patient explicitly adds provider to their allowlist. Time-limited (e.g., 30 days). Provider can access specified record types within the window.
- **Referral access**: A trusted provider can grant another provider temporary access (e.g., specialist referral). Must be explicitly enabled by patient.
- **Emergency access**: See Section 2.6.
- **One-time access**: Provider gets a single decryption session. The access grant is consumed after one use.

**Revocation:** Patients can revoke any provider's access at any time by updating their ACE policies. Revocation is immediate -- the next access attempt by the revoked provider will be denied.

### 2.3 AI Clinical Intelligence

**What it does:** Inside the TEE enclave, AI models analyze patient health records to provide clinical intelligence -- drug interaction checks, anomaly detection, health summary generation, and risk scoring. The AI never sees data outside the enclave, and the raw records never leave it.

**AI capabilities:**

| Capability | Input | Output | Clinical Value |
|-----------|-------|--------|----------------|
| **Drug Interaction Check** | Patient's current medication list | Risk matrix (severity: low/medium/high/critical) with specific interaction pairs | Prevents adverse drug events (responsible for 1.3 million ER visits/year in the US) |
| **Lab Anomaly Detection** | Historical lab results (time series) | Flagged values outside normal ranges, trend analysis (improving/worsening/stable) | Early detection of conditions before they become symptomatic |
| **Health Summary Generation** | All patient records for a time period | Structured clinical summary (diagnoses, active medications, recent procedures, open concerns) | Saves providers 15-30 minutes per patient encounter |
| **Risk Scoring** | Full patient record set | Composite risk score (0-100) across cardiovascular, metabolic, respiratory, and oncological categories | Enables proactive care and prioritization |
| **Medication Adherence Analysis** | Prescription history + refill timestamps | Adherence score, gap analysis, recommendations | Reduces non-adherence (responsible for $300B in avoidable healthcare costs annually) |

**How it works:**

1. CRE workflow decrypts patient records inside the TEE using Confidential HTTP (Vault DON key reconstruction).
2. Inside the TEE, the workflow uses HTTP Client to query the AI model (Nillion nilAI) with a structured prompt containing the health data.
3. The AI model returns structured JSON output (interaction matrix, anomaly flags, summary, risk scores).
4. The AI output is encrypted back inside the TEE.
5. The encrypted AI report hash is stored on-chain. The patient is notified.
6. The patient (or an authorized provider) can decrypt and view the report via a subsequent Confidential HTTP call.

**Privacy model:** The AI API call happens from within the enclave via Confidential HTTP. The API key is threshold-encrypted in the Vault DON. The request body (containing health data) is only constructed inside the enclave. Even if the AI provider (Google) processes the data, the system design ensures:
- The AI provider does not know which patient the data belongs to (no patient identifiers in the prompt).
- CRE nodes never see the request or response (Confidential HTTP).
- The AI output is encrypted before leaving the enclave.

### 2.4 Cross-Chain Portability

**What it does:** Patients can transfer their encrypted health record references to a different blockchain where their new provider operates. The transfer uses CCIP (Chainlink Cross-Chain Interoperability Protocol) to send encrypted record pointers and ACE policy configurations to the destination chain.

**How it works:**

1. Patient initiates a transfer request on-chain via the `HealthRecordRegistry` contract, specifying destination chain, destination provider address, and record IDs to transfer.
2. The `TransferRequested` event is emitted.
3. A CRE workflow (Log Trigger) picks up the event.
4. EVM Read verifies the patient's consent for the transfer.
5. Confidential HTTP re-encrypts the record reference for the destination chain's TEE configuration (different Vault DON key set).
6. A CCIP message is constructed containing:
   - Encrypted record references (IPFS/Arweave hashes)
   - ACE policy configuration (who can access on the destination chain)
   - Patient's public key for the destination chain
   - Metadata (record types, timestamps)
7. The CCIP message is sent to the destination chain.
8. On the destination chain, a receiver contract stores the record references and instantiates the ACE policies.
9. The source chain records are marked as "transferred" with a pointer to the destination chain and CCIP message ID.

**What travels cross-chain:**
- Encrypted references to the same IPFS/Arweave blobs (the encrypted data itself is chain-agnostic).
- ACE policy definitions (allowlists, time windows, rate limits).
- Metadata (record types, timestamps, patient identifiers).

**What does NOT travel:**
- Raw health data (stays on IPFS/Arweave, encrypted).
- Decryption keys (remain in the Vault DON, reconstructed only inside TEE).

### 2.5 Audit Trail

**What it does:** Every access attempt -- successful or denied -- is recorded immutably on-chain. The audit trail captures who requested access, when, which records, whether it was approved or denied, and the reason for denial (if applicable). This creates a HIPAA-compliant audit log without exposing any patient health data.

**On-chain audit record structure:**

```
AccessLog {
    requestId: uint256        // Unique request identifier
    patient: address          // Patient wallet address
    provider: address         // Provider wallet address
    recordType: bytes32       // Type of record requested
    timestamp: uint256        // Block timestamp
    status: uint8             // 0=denied, 1=approved, 2=emergency
    denialReason: bytes32     // ACE policy that blocked (if denied)
    accessDuration: uint256   // Seconds of access granted (if approved)
    accessExpiry: uint256     // Timestamp when access expires
}
```

**What is auditable:**
- Total number of access attempts per provider.
- Approval/denial ratio per provider.
- Which ACE policies are most frequently triggered.
- Emergency access frequency and review status.
- Time-based access patterns (after-hours access flagged for review).
- Cross-chain transfer history.

**What is NOT exposed:**
- The content of health records.
- The specific values in lab results, prescriptions, or imaging.
- The AI analysis results (stored encrypted, accessible only to patient and authorized providers).

### 2.6 Emergency Access

**What it does:** Emergency healthcare providers (ER doctors, paramedics, on-call physicians) can obtain immediate, time-limited access to a patient's records without prior consent. The access is automatically granted, time-boxed (24 hours by default), and flagged for mandatory post-incident patient review.

**How it works:**

1. Emergency provider calls the `EmergencyAccess` contract's `requestEmergencyAccess()` function, providing their provider ID, the patient address, and an emergency reason code.
2. The `EmergencyAccessGranted` event is emitted.
3. A CRE workflow (Log Trigger) picks up the event.
4. The workflow writes a special ACE policy granting the emergency provider temporary access:
   - Duration: 24 hours (configurable).
   - Scope: All record types (full medical history).
   - Auto-expiry: After the duration elapses, the access grant is automatically removed.
5. The emergency provider can now access records through the standard Provider Access workflow (Section 2.2), but with the emergency policy in effect.
6. After the emergency period expires:
   - The patient receives a notification with the full emergency access log.
   - The access log is flagged as "emergency -- pending review."
   - The patient can retroactively approve or dispute the emergency access.

**Emergency reason codes:**

| Code | Description | Duration |
|------|-------------|----------|
| `0x01` | Life-threatening emergency | 24 hours |
| `0x02` | Unconscious/incapacitated patient | 48 hours |
| `0x03` | Urgent surgical preparation | 12 hours |
| `0x04` | Mental health crisis | 24 hours |
| `0x05` | Pediatric emergency (guardian unavailable) | 24 hours |

**Abuse prevention:**
- Emergency access is rate-limited per provider (max 3 emergency requests per 30-day period).
- Every emergency access is logged and flagged for review.
- False emergency claims can result in provider de-registration.
- The audit trail for emergency access is permanent and cannot be deleted.

---

## 3. Full CRE Architecture

### Workflow 1: Record Upload

**Trigger:** HTTP Trigger (patient uploads via web application)
**Capabilities:** Confidential HTTP, HTTP Client (inside TEE), EVM Write

```
Patient App                  CRE Workflow                        External
-----------                  ------------                        --------

[Patient uploads       HTTP Trigger
 health record]  -----> (receives file data)
                              |
                              v
                    Confidential HTTP
                    (inside TEE enclave):
                      - Decrypt Vault DON key shares
                      - Encrypt record with AES-256-GCM
                      - Key shares stored in Vault DON
                              |
                              v
                    HTTP Client (inside TEE):
                      - Upload encrypted blob        -----> IPFS/Arweave
                      - Receive content hash          <----- (returns CID)
                              |
                              v
                    EVM Write:
                      - Store CID + metadata on-chain
                      - Map patient address to record
                      - Emit RecordUploaded event
                              |
                              v
                    HealthRecordRegistry.sol
                    (on-chain: hash, type, timestamp)
```

**CRE workflow code structure (TypeScript):**

```typescript
// record-upload/main.ts
import { cre, getNetwork } from "@cre/sdk";

interface Config {
  evms: Array<{
    registryAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
  ipfsGatewayUrl: string;
}

export default function initWorkflow(config: Config) {
  return [
    {
      trigger: cre.triggers.HTTPTrigger({
        authorizedKeys: [{ type: "KEY_TYPE_ECDSA_EVM", publicKey: "0x..." }],
      }),
      callback: onRecordUpload,
    },
  ];
}

async function onRecordUpload(runtime: any, payload: any) {
  const fileData = payload.input;

  // Step 1: Encrypt record inside TEE via Confidential HTTP
  const encryptedBlob = await cre.capabilities.ConfidentialHTTP.encrypt(runtime, {
    data: fileData,
    vaultSecrets: { SAN_MARINO_AES_GCM_ENCRYPTION_KEY: "record_encryption_key" },
    encrypt_output: true,
  });

  // Step 2: Upload encrypted blob to IPFS (HTTP Client inside TEE)
  const httpClient = cre.capabilities.HTTPClient;
  const ipfsResponse = await httpClient.sendRequest(runtime, () => ({
    url: `${runtime.config.ipfsGatewayUrl}/api/v0/add`,
    method: "POST",
    body: btoa(encryptedBlob),
    headers: { "Content-Type": "application/octet-stream" },
  }), consensus.identicalAggregation);

  const ipfsCid = ipfsResponse.Hash;

  // Step 3: Write hash + metadata on-chain
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });
  const evmClient = cre.capabilities.EVMClient(network.chainSelector);

  const reportData = encodeAbiParameters(
    [
      { name: "ipfsCid", type: "string" },
      { name: "recordType", type: "bytes32" },
      { name: "timestamp", type: "uint256" },
    ],
    [ipfsCid, recordType, BigInt(Date.now())]
  );

  const signedReport = await cre.signReport(runtime, reportData);
  const txHash = await evmClient.writeReport(runtime, signedReport, {
    receiver: evmConfig.registryAddress,
    gasConfig: { gasLimit: evmConfig.gasLimit },
  });

  return txHash;
}
```

### Workflow 2: Provider Access Request

**Trigger:** Log Trigger (`AccessRequested` event from `PatientConsent` contract)
**Capabilities:** EVM Read, Confidential HTTP, HTTP Client (AI inside TEE), EVM Write

```
Provider App               On-Chain                   CRE Workflow
------------               --------                   ------------

[Provider requests    PatientConsent.sol
 access to record] -> requestAccess()
                        |
                        v
                    emit AccessRequested(
                      provider, patient,
                      recordType, reason
                    )
                                              Log Trigger picks up event
                                                      |
                                                      v
                                              EVM Read:
                                                - Check ProviderRegistry
                                                  (is provider registered?)
                                                - Check PatientConsent
                                                  (is provider on allowlist?)
                                                - Check ACE policies:
                                                  - TimeWindowPolicy
                                                  - GeographicRestriction
                                                  - RateLimitPolicy
                                                      |
                                            +---------+---------+
                                            |                   |
                                          DENIED             APPROVED
                                            |                   |
                                            v                   v
                                      EVM Write:          Confidential HTTP:
                                        - Log denial        - Decrypt record
                                        - Record reason       inside TEE
                                        - Notify patient    - Reconstruct
                                                              Vault DON keys
                                                              in enclave
                                                                |
                                                                v
                                                          HTTP Client (TEE):
                                                            - Query Nillion nilAI
                                                            - Drug interactions
                                                            - Anomaly detection
                                                            - Health summary
                                                                |
                                                                v
                                                          Confidential HTTP:
                                                            - Encrypt AI report
                                                            - Encrypt record
                                                              for provider
                                                                |
                                                                v
                                                          EVM Write:
                                                            - Deliver encrypted
                                                              result to provider
                                                            - Log access grant
                                                            - Set expiry time
```

**CRE workflow code structure (TypeScript):**

```typescript
// provider-access/logCallback.ts
import { cre, getNetwork, toHex, lastFinalizedBlockNumber } from "@cre/sdk";
import { decodeEventLog, encodeFunctionData, decodeFunctionResult } from "viem";

export async function onAccessRequested(runtime: any, payload: any) {
  // Step 1: Decode AccessRequested event
  const decodedLog = decodeEventLog({
    abi: accessRequestedAbi,
    data: toHex(payload.data),
    topics: payload.topics.filter((t: any) => t !== null),
  });

  const { provider, patient, recordType, reason } = decodedLog.args;

  // Step 2: EVM Read -- check ACE policies
  const evmClient = cre.capabilities.EVMClient(network.chainSelector);

  // Check provider registration
  const isRegistered = await evmClient.callContract(runtime, {
    call: {
      from: "0x0000000000000000000000000000000000000000",
      to: config.providerRegistryAddress,
      data: encodeFunctionData({
        abi: providerRegistryAbi,
        functionName: "isRegistered",
        args: [provider],
      }),
    },
    blockNumber: lastFinalizedBlockNumber,
  });

  if (!isRegistered) {
    // Write denial on-chain
    return await writeDenial(runtime, evmClient, provider, patient, "UNREGISTERED_PROVIDER");
  }

  // Check patient consent (allowlist)
  const hasConsent = await evmClient.callContract(runtime, {
    call: {
      from: "0x0000000000000000000000000000000000000000",
      to: config.consentAddress,
      data: encodeFunctionData({
        abi: consentAbi,
        functionName: "isProviderAllowed",
        args: [patient, provider, recordType],
      }),
    },
    blockNumber: lastFinalizedBlockNumber,
  });

  if (!hasConsent) {
    return await writeDenial(runtime, evmClient, provider, patient, "NO_CONSENT");
  }

  // Step 3: Decrypt record inside TEE, run AI analysis
  const encryptedRecord = await cre.capabilities.ConfidentialHTTP.fetch(runtime, {
    url: `${config.ipfsGateway}/ipfs/${recordCid}`,
    vaultSecrets: { SAN_MARINO_AES_GCM_ENCRYPTION_KEY: "record_encryption_key" },
  });

  // Step 4: AI analysis inside TEE
  const nillionApiKey = runtime.getSecret("NILLION_API_KEY");
  const aiResult = await analyzeWithNilAI(runtime, encryptedRecord, nillionApiKey);

  // Step 5: Write approved access + AI report on-chain
  const reportData = encodeAbiParameters(
    [
      { name: "provider", type: "address" },
      { name: "patient", type: "address" },
      { name: "aiReportHash", type: "bytes32" },
      { name: "accessExpiry", type: "uint256" },
    ],
    [provider, patient, aiReportHash, expiryTimestamp]
  );

  const signedReport = await cre.signReport(runtime, reportData);
  return await evmClient.writeReport(runtime, signedReport);
}
```

### Workflow 3: AI Health Analysis (Periodic)

**Trigger:** Cron Trigger (configurable: daily, weekly, or on-demand)
**Capabilities:** Confidential HTTP, HTTP Client (AI inside TEE), EVM Write

```
Cron Schedule              CRE Workflow                     External
-------------              ------------                     --------

[Daily/weekly     Cron Trigger fires
 health check] ------> |
                        v
                  EVM Read:
                    - Get patient's record list
                    - Get record CIDs from registry
                        |
                        v
                  Confidential HTTP:
                    - Fetch encrypted records from     <---> IPFS/Arweave
                      IPFS/Arweave
                    - Decrypt inside TEE using
                      Vault DON key shares
                        |
                        v
                  HTTP Client (inside TEE):
                    - Send structured prompt to        <---> Nillion nilAI API
                      Nillion nilAI with health data
                    - Request: drug interactions,
                      anomaly detection, risk score
                    - Receive structured JSON response
                        |
                        v
                  Confidential HTTP:
                    - Encrypt AI report in TEE
                    - Upload encrypted report          <---> IPFS/Arweave
                      to IPFS/Arweave
                        |
                        v
                  EVM Write:
                    - Store AI report hash on-chain
                    - Emit HealthAnalysisCompleted
                      event
                    - Notify patient (on-chain event)
```

**Nillion nilAI prompt structure (inside TEE):**

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{
        "text": "Analyze the following patient health records and return a JSON response with: drug_interactions (array of {drug_pair, severity, recommendation}), anomalies (array of {test_name, value, normal_range, trend}), risk_scores (object with cardiovascular, metabolic, respiratory, oncological as 0-100 integers), and summary (string, 200 words max clinical summary)."
      }]
    },
    {
      "role": "user",
      "parts": [{
        "text": "<PATIENT_RECORDS_JSON>"
      }]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "drug_interactions": { "type": "array" },
        "anomalies": { "type": "array" },
        "risk_scores": { "type": "object" },
        "summary": { "type": "string" }
      }
    }
  }
}
```

### Workflow 4: Cross-Chain Transfer

**Trigger:** Log Trigger (`TransferRequested` event)
**Capabilities:** EVM Read, Confidential HTTP, CCIP, EVM Write

```
Patient App               Source Chain              CRE Workflow              Dest Chain
-----------               ------------              ------------              ----------

[Patient requests   HealthRecordRegistry
 transfer to        .requestTransfer(
 new chain/         destChain,
 provider]  ------> destProvider,
                    recordIds
                    )
                        |
                        v
                    emit TransferRequested(
                      patient, destChain,
                      destProvider, recordIds[]
                    )
                                              Log Trigger
                                                  |
                                                  v
                                            EVM Read:
                                              - Verify patient consent
                                              - Get record CIDs
                                              - Get current ACE policies
                                                  |
                                                  v
                                            Confidential HTTP:
                                              - Re-encrypt record
                                                references for
                                                destination chain's
                                                Vault DON
                                                  |
                                                  v
                                            Construct CCIP Message:
                                              - Encrypted record refs
                                              - ACE policy config
                                              - Patient dest address
                                              - Metadata
                                                  |
                                                  v
                                            EVM Write (source):           CCIP
                                              - Send CCIP message  ------> Network
                                              - Burn/lock record refs      |
                                              - Update access log          v
                                              - Mark as transferred  HealthRecordReceiver
                                                                      .ccipReceive()
                                                                          |
                                                                          v
                                                                    Store record refs
                                                                    Instantiate ACE
                                                                    policies
                                                                    Notify patient
```

### Workflow 5: Consent Management

**Trigger:** Log Trigger (`ConsentUpdated` event from `PatientConsent` contract)
**Capabilities:** EVM Read, EVM Write

```
Patient App               On-Chain                   CRE Workflow
-----------               --------                   ------------

[Patient grants    PatientConsent.sol
 or revokes        .updateConsent(
 provider          provider,
 access]  -------> recordTypes[],
                   action, // grant/revoke
                   duration
                   )
                        |
                        v
                    emit ConsentUpdated(
                      patient, provider,
                      recordTypes[],
                      action, duration
                    )
                                              Log Trigger
                                                  |
                                                  v
                                            EVM Read:
                                              - Get current ACE policy set
                                              - Get provider details from
                                                ProviderRegistry
                                              - Validate provider exists
                                                  |
                                                  v
                                            EVM Write:
                                              - If GRANT:
                                                - Add provider to allowlist
                                                - Set time window policy
                                                - Set rate limit policy
                                              - If REVOKE:
                                                - Remove provider from
                                                  allowlist
                                                - Invalidate active sessions
                                              - Emit ConsentEnforced event
                                              - Update audit log
```

### CRE Capabilities Summary

| Capability | Workflows Used In | Purpose |
|-----------|-------------------|---------|
| **HTTP Trigger** | Record Upload | Patient uploads health data via web app |
| **Log Trigger** | Provider Access, Cross-Chain Transfer, Consent Management, Emergency Access | React to on-chain events (access requests, consent changes, transfers) |
| **Cron Trigger** | AI Health Analysis | Periodic health checks (daily/weekly) |
| **Confidential HTTP** | Record Upload, Provider Access, AI Health Analysis, Cross-Chain Transfer | Encrypt/decrypt health records inside TEE; API secrets stay in Vault DON |
| **HTTP Client** | Record Upload (IPFS), AI Health Analysis (Nillion nilAI), Provider Access (Nillion nilAI) | Upload blobs to IPFS, query AI models inside TEE |
| **EVM Read** | Provider Access, Cross-Chain Transfer, Consent Management | Check ACE policies, read patient consents, verify provider registration |
| **EVM Write** | All workflows | Store hashes, log access, update policies, deliver encrypted results |
| **CCIP** | Cross-Chain Transfer | Transfer encrypted record references between chains |
| **Vault DON** | All workflows using Confidential HTTP | Threshold encryption for AES keys, API credentials |
| **Consensus** | AI Health Analysis (byFields for risk scores), Provider Access (identical for policy checks) | DON agreement on results |

---

## 4. Smart Contracts

### 4.1 HealthRecordRegistry.sol

**Purpose:** Central registry for all patient health records. Stores encrypted record hashes, patient-to-record mappings, and access logs. Receives CRE reports via the ReceiverTemplate pattern.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReceiverTemplate} from "./interfaces/ReceiverTemplate.sol";
import {IPolicyEngine} from "./interfaces/IPolicyEngine.sol";

contract HealthRecordRegistry is ReceiverTemplate {
    // --- Structs ---
    struct HealthRecord {
        string ipfsCid;           // IPFS/Arweave content hash (encrypted blob)
        bytes32 recordType;       // e.g., keccak256("LAB_RESULT"), keccak256("PRESCRIPTION")
        uint256 uploadTimestamp;
        uint256 lastAccessedAt;
        bool isActive;            // false if transferred or deleted
        address patient;
    }

    struct AccessLog {
        uint256 requestId;
        address provider;
        address patient;
        bytes32 recordType;
        uint256 timestamp;
        uint8 status;             // 0=denied, 1=approved, 2=emergency
        bytes32 denialReason;
        uint256 accessDuration;
        uint256 accessExpiry;
    }

    // --- State ---
    mapping(uint256 => HealthRecord) public records;
    mapping(address => uint256[]) public patientRecords;  // patient -> record IDs
    mapping(uint256 => AccessLog[]) public recordAccessLogs;
    uint256 public recordCount;
    uint256 public accessLogCount;

    IPolicyEngine public policyEngine;

    // --- Events ---
    event RecordUploaded(
        uint256 indexed recordId,
        address indexed patient,
        bytes32 recordType,
        string ipfsCid,
        uint256 timestamp
    );
    event AccessGranted(
        uint256 indexed recordId,
        address indexed provider,
        address indexed patient,
        uint256 accessExpiry
    );
    event AccessDenied(
        uint256 indexed recordId,
        address indexed provider,
        address indexed patient,
        bytes32 reason
    );
    event RecordTransferred(
        uint256 indexed recordId,
        uint64 destinationChainSelector,
        bytes32 ccipMessageId
    );

    // --- Constructor ---
    constructor(
        address forwarder,
        address _policyEngine
    ) ReceiverTemplate(forwarder) {
        policyEngine = IPolicyEngine(_policyEngine);
    }

    // --- CRE Report Processing ---
    modifier runPolicy() {
        policyEngine.run(msg.data);
        _;
    }

    function _processReport(bytes calldata report) internal override runPolicy {
        // First byte is the operation discriminator
        uint8 operation = uint8(report[0]);

        if (operation == 0x00) {
            _handleRecordUpload(report[1:]);
        } else if (operation == 0x01) {
            _handleAccessGrant(report[1:]);
        } else if (operation == 0x02) {
            _handleAccessDenial(report[1:]);
        } else if (operation == 0x03) {
            _handleTransferComplete(report[1:]);
        }
    }

    function _handleRecordUpload(bytes calldata data) internal {
        (string memory ipfsCid, bytes32 recordType, uint256 timestamp, address patient) =
            abi.decode(data, (string, bytes32, uint256, address));

        uint256 recordId = recordCount++;
        records[recordId] = HealthRecord({
            ipfsCid: ipfsCid,
            recordType: recordType,
            uploadTimestamp: timestamp,
            lastAccessedAt: 0,
            isActive: true,
            patient: patient
        });
        patientRecords[patient].push(recordId);

        emit RecordUploaded(recordId, patient, recordType, ipfsCid, timestamp);
    }

    function _handleAccessGrant(bytes calldata data) internal {
        (address provider, address patient, bytes32 recordType,
         uint256 accessDuration, bytes32 aiReportHash) =
            abi.decode(data, (address, address, bytes32, uint256, bytes32));

        uint256 expiry = block.timestamp + accessDuration;
        accessLogCount++;

        emit AccessGranted(0, provider, patient, expiry);
    }

    function _handleAccessDenial(bytes calldata data) internal {
        (address provider, address patient, bytes32 reason) =
            abi.decode(data, (address, address, bytes32));

        accessLogCount++;
        emit AccessDenied(0, provider, patient, reason);
    }

    function _handleTransferComplete(bytes calldata data) internal {
        (uint256 recordId, uint64 destChain, bytes32 ccipMessageId) =
            abi.decode(data, (uint256, uint64, bytes32));

        records[recordId].isActive = false;
        emit RecordTransferred(recordId, destChain, ccipMessageId);
    }

    // --- View Functions ---
    function getPatientRecords(address patient) external view returns (uint256[] memory) {
        return patientRecords[patient];
    }

    function getRecord(uint256 recordId) external view returns (HealthRecord memory) {
        return records[recordId];
    }

    function getAccessLog(uint256 recordId) external view returns (AccessLog[] memory) {
        return recordAccessLogs[recordId];
    }
}
```

### 4.2 PatientConsent.sol

**Purpose:** Manages patient consent preferences. Patients grant or revoke provider access, specifying record types and durations. Emits events that CRE workflows listen to.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PatientConsent {
    // --- Structs ---
    struct ConsentGrant {
        address provider;
        bytes32[] recordTypes;   // Which record types the provider can access
        uint256 grantedAt;
        uint256 expiresAt;       // 0 = indefinite
        bool isActive;
    }

    // --- State ---
    mapping(address => mapping(address => ConsentGrant)) public consents;
    // patient -> provider -> consent

    mapping(address => address[]) public patientProviders;
    // patient -> list of providers with any consent (active or expired)

    // --- Events ---
    event AccessRequested(
        address indexed provider,
        address indexed patient,
        bytes32 recordType,
        string reason
    );
    event ConsentUpdated(
        address indexed patient,
        address indexed provider,
        bytes32[] recordTypes,
        uint8 action,            // 0=revoke, 1=grant
        uint256 duration
    );

    // --- Patient Functions ---
    function grantAccess(
        address provider,
        bytes32[] calldata recordTypes,
        uint256 duration
    ) external {
        uint256 expiry = duration > 0 ? block.timestamp + duration : 0;

        consents[msg.sender][provider] = ConsentGrant({
            provider: provider,
            recordTypes: recordTypes,
            grantedAt: block.timestamp,
            expiresAt: expiry,
            isActive: true
        });

        patientProviders[msg.sender].push(provider);

        emit ConsentUpdated(msg.sender, provider, recordTypes, 1, duration);
    }

    function revokeAccess(address provider) external {
        consents[msg.sender][provider].isActive = false;

        bytes32[] memory empty = new bytes32[](0);
        emit ConsentUpdated(msg.sender, provider, empty, 0, 0);
    }

    // --- Provider Functions ---
    function requestAccess(
        address patient,
        bytes32 recordType,
        string calldata reason
    ) external {
        emit AccessRequested(msg.sender, patient, recordType, reason);
    }

    // --- View Functions ---
    function isProviderAllowed(
        address patient,
        address provider,
        bytes32 recordType
    ) external view returns (bool) {
        ConsentGrant storage consent = consents[patient][provider];
        if (!consent.isActive) return false;
        if (consent.expiresAt > 0 && block.timestamp > consent.expiresAt) return false;

        for (uint i = 0; i < consent.recordTypes.length; i++) {
            if (consent.recordTypes[i] == recordType) return true;
        }
        return false;
    }

    function getConsentDetails(
        address patient,
        address provider
    ) external view returns (ConsentGrant memory) {
        return consents[patient][provider];
    }
}
```

### 4.3 ProviderRegistry.sol

**Purpose:** Registry of verified healthcare providers with credentials. ACE policies reference this contract for allowlist validation.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ProviderRegistry is Ownable {
    // --- Structs ---
    struct Provider {
        bytes32 name;              // Provider name (hashed)
        bytes32 licenseHash;       // Hash of medical license number
        bytes32 specialty;         // e.g., keccak256("CARDIOLOGY")
        bytes32 jurisdiction;      // Geographic jurisdiction code
        uint256 registeredAt;
        bool isActive;
        bool isEmergencyProvider;  // Can use emergency access
    }

    // --- State ---
    mapping(address => Provider) public providers;
    address[] public providerList;

    // --- Events ---
    event ProviderRegistered(address indexed provider, bytes32 specialty, bytes32 jurisdiction);
    event ProviderDeactivated(address indexed provider);
    event ProviderActivated(address indexed provider);

    constructor() Ownable(msg.sender) {}

    // --- Admin Functions ---
    function registerProvider(
        address providerAddress,
        bytes32 name,
        bytes32 licenseHash,
        bytes32 specialty,
        bytes32 jurisdiction,
        bool isEmergencyProvider
    ) external onlyOwner {
        providers[providerAddress] = Provider({
            name: name,
            licenseHash: licenseHash,
            specialty: specialty,
            jurisdiction: jurisdiction,
            registeredAt: block.timestamp,
            isActive: true,
            isEmergencyProvider: isEmergencyProvider
        });
        providerList.push(providerAddress);

        emit ProviderRegistered(providerAddress, specialty, jurisdiction);
    }

    function deactivateProvider(address providerAddress) external onlyOwner {
        providers[providerAddress].isActive = false;
        emit ProviderDeactivated(providerAddress);
    }

    // --- View Functions ---
    function isRegistered(address providerAddress) external view returns (bool) {
        return providers[providerAddress].isActive;
    }

    function isEmergencyProvider(address providerAddress) external view returns (bool) {
        return providers[providerAddress].isActive &&
               providers[providerAddress].isEmergencyProvider;
    }

    function getProvider(address providerAddress) external view returns (Provider memory) {
        return providers[providerAddress];
    }

    function getJurisdiction(address providerAddress) external view returns (bytes32) {
        return providers[providerAddress].jurisdiction;
    }
}
```

### 4.4 EmergencyAccess.sol

**Purpose:** Time-locked emergency access with auto-expiry. Emergency providers can obtain immediate access without prior patient consent, subject to rate limits and mandatory post-incident review.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ProviderRegistry} from "./ProviderRegistry.sol";

contract EmergencyAccess {
    // --- Structs ---
    struct EmergencyGrant {
        address provider;
        address patient;
        uint8 reasonCode;
        uint256 grantedAt;
        uint256 expiresAt;
        bool isActive;
        bool reviewedByPatient;
    }

    // --- State ---
    ProviderRegistry public providerRegistry;
    mapping(uint256 => EmergencyGrant) public emergencyGrants;
    mapping(address => uint256) public providerEmergencyCount;  // 30-day rolling count
    mapping(address => uint256) public providerLastEmergency;
    uint256 public grantCount;

    uint256 public constant MAX_EMERGENCY_PER_30_DAYS = 3;
    mapping(uint8 => uint256) public reasonDurations;  // reason code -> duration in seconds

    // --- Events ---
    event EmergencyAccessGranted(
        uint256 indexed grantId,
        address indexed provider,
        address indexed patient,
        uint8 reasonCode,
        uint256 expiresAt
    );
    event EmergencyAccessExpired(uint256 indexed grantId);
    event EmergencyAccessReviewed(uint256 indexed grantId, bool approved);

    constructor(address _providerRegistry) {
        providerRegistry = ProviderRegistry(_providerRegistry);
        // Default durations
        reasonDurations[0x01] = 24 hours;  // Life-threatening
        reasonDurations[0x02] = 48 hours;  // Unconscious
        reasonDurations[0x03] = 12 hours;  // Surgical prep
        reasonDurations[0x04] = 24 hours;  // Mental health
        reasonDurations[0x05] = 24 hours;  // Pediatric
    }

    function requestEmergencyAccess(
        address patient,
        uint8 reasonCode
    ) external {
        require(
            providerRegistry.isEmergencyProvider(msg.sender),
            "Not an emergency provider"
        );
        require(reasonDurations[reasonCode] > 0, "Invalid reason code");

        // Rate limit check
        if (block.timestamp > providerLastEmergency[msg.sender] + 30 days) {
            providerEmergencyCount[msg.sender] = 0;
        }
        require(
            providerEmergencyCount[msg.sender] < MAX_EMERGENCY_PER_30_DAYS,
            "Emergency rate limit exceeded"
        );

        uint256 duration = reasonDurations[reasonCode];
        uint256 grantId = grantCount++;

        emergencyGrants[grantId] = EmergencyGrant({
            provider: msg.sender,
            patient: patient,
            reasonCode: reasonCode,
            grantedAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            isActive: true,
            reviewedByPatient: false
        });

        providerEmergencyCount[msg.sender]++;
        providerLastEmergency[msg.sender] = block.timestamp;

        emit EmergencyAccessGranted(grantId, msg.sender, patient, reasonCode, block.timestamp + duration);
    }

    function reviewEmergencyAccess(uint256 grantId, bool approved) external {
        EmergencyGrant storage grant = emergencyGrants[grantId];
        require(msg.sender == grant.patient, "Only patient can review");
        grant.reviewedByPatient = true;
        emit EmergencyAccessReviewed(grantId, approved);
    }

    function isEmergencyActive(address provider, address patient) external view returns (bool) {
        for (uint256 i = 0; i < grantCount; i++) {
            EmergencyGrant storage grant = emergencyGrants[i];
            if (grant.provider == provider &&
                grant.patient == patient &&
                grant.isActive &&
                block.timestamp < grant.expiresAt) {
                return true;
            }
        }
        return false;
    }
}
```

---

## 5. ACE Compliance Policies

The ACE (Automated Compliance Engine) is the on-chain policy enforcement layer. Every access to patient records passes through the PolicyEngine, which runs a chain of configurable policies sequentially. If any policy reverts, the entire access attempt is denied.

### ACE Architecture for Kosyn AI

```
HealthRecordRegistry.onReport()
    |
    +-- runPolicy modifier
            |
            v
        PolicyEngine.run(msg.data)
            |
            +-- UnifiedExtractor.extract(callData)
            |       - Parses: provider address, patient address,
            |         record type, operation type
            |
            +-- Policy[0]: ProviderAllowlistPolicy
            +-- Policy[1]: TimeWindowPolicy
            +-- Policy[2]: EmergencyOverridePolicy
            +-- Policy[3]: GeographicRestrictionPolicy
            +-- Policy[4]: RateLimitPolicy
            +-- Policy[5]: AuditPolicy
            |
            v
        All pass --> Execute operation
        Any fail --> Revert with reason
```

### 5.1 ProviderAllowlistPolicy

**Purpose:** Ensures that only registered, patient-approved providers can access records. This is the primary consent enforcement mechanism.

**Validation logic:**
1. Check that the provider address exists in the `ProviderRegistry` and is active.
2. Check that the patient has an active consent grant for this specific provider in `PatientConsent`.
3. Check that the consent grant covers the requested record type.

**Revert conditions:**
- `"Provider not registered"` -- address not in ProviderRegistry or deactivated.
- `"No patient consent"` -- patient has not granted access to this provider.
- `"Record type not authorized"` -- provider has consent but not for this specific record type.

```solidity
contract ProviderAllowlistPolicy is IPolicy {
    ProviderRegistry public providerRegistry;
    PatientConsent public patientConsent;

    function validate(bytes[] memory params) external view {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));
        bytes32 recordType = abi.decode(params[2], (bytes32));

        require(providerRegistry.isRegistered(provider), "Provider not registered");
        require(
            patientConsent.isProviderAllowed(patient, provider, recordType),
            "No patient consent for this record type"
        );
    }
}
```

### 5.2 TimeWindowPolicy

**Purpose:** Enforces that access grants expire after a configured duration. Prevents indefinite access even if a patient forgets to revoke.

**Validation logic:**
1. Look up the consent grant's `expiresAt` timestamp.
2. If `expiresAt > 0` and `block.timestamp > expiresAt`, deny access.

**Revert conditions:**
- `"Access grant expired"` -- the time window has elapsed.

```solidity
contract TimeWindowPolicy is IPolicy {
    PatientConsent public patientConsent;

    function validate(bytes[] memory params) external view {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));

        PatientConsent.ConsentGrant memory consent =
            patientConsent.getConsentDetails(patient, provider);

        if (consent.expiresAt > 0) {
            require(block.timestamp <= consent.expiresAt, "Access grant expired");
        }
    }
}
```

### 5.3 EmergencyOverridePolicy

**Purpose:** Allows emergency providers to bypass the standard allowlist and time window policies when an active emergency grant exists. This policy is checked before the standard policies -- if an emergency is active, subsequent policies are relaxed.

**Validation logic:**
1. Check if an active emergency grant exists for this provider-patient pair in `EmergencyAccess`.
2. If yes, mark the access as emergency-level (subsequent policies may skip).
3. If no, this policy passes without effect (defers to standard policies).

**Implementation note:** This policy does not revert on its own. It sets a flag that other policies check to determine whether to enforce or skip.

```solidity
contract EmergencyOverridePolicy is IPolicy {
    EmergencyAccess public emergencyAccess;

    function validate(bytes[] memory params) external view {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));

        // If emergency is active, this policy passes.
        // Other policies check EmergencyAccess.isEmergencyActive()
        // to decide whether to enforce or skip their own checks.
        // This policy itself always passes -- it is an override, not a gate.
    }
}
```

### 5.4 GeographicRestrictionPolicy

**Purpose:** Ensures that patient data can only be accessed from approved jurisdictions. Prevents cross-border data leakage in compliance with data residency laws (GDPR, HIPAA, local regulations).

**Validation logic:**
1. Look up the provider's jurisdiction from `ProviderRegistry.getJurisdiction()`.
2. Compare against the patient's approved jurisdiction list (stored in policy storage).
3. If the provider's jurisdiction is not in the approved list, deny access.

**Revert conditions:**
- `"Provider jurisdiction not approved"` -- the provider operates in a jurisdiction the patient has not authorized for data access.

```solidity
contract GeographicRestrictionPolicy is IPolicy {
    ProviderRegistry public providerRegistry;

    // patient -> approved jurisdiction codes
    mapping(address => mapping(bytes32 => bool)) public approvedJurisdictions;

    function validate(bytes[] memory params) external view {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));

        bytes32 providerJurisdiction = providerRegistry.getJurisdiction(provider);
        require(
            approvedJurisdictions[patient][providerJurisdiction],
            "Provider jurisdiction not approved"
        );
    }

    function setApprovedJurisdiction(
        address patient,
        bytes32 jurisdiction,
        bool approved
    ) external {
        // Only callable by patient or admin
        approvedJurisdictions[patient][jurisdiction] = approved;
    }
}
```

### 5.5 RateLimitPolicy

**Purpose:** Prevents bulk data scraping by limiting the number of access requests a provider can make per day for a given patient's records.

**Validation logic:**
1. Track a rolling counter of access attempts per provider-patient pair per 24-hour window.
2. If the counter exceeds the configured maximum, deny access.

**Revert conditions:**
- `"Daily access rate limit exceeded"` -- provider has exceeded the maximum allowed accesses per day.

**Default limit:** 10 accesses per provider per patient per 24-hour window.

```solidity
contract RateLimitPolicy is IPolicy {
    uint256 public maxAccessesPerDay = 10;

    // provider -> patient -> day -> count
    mapping(address => mapping(address => mapping(uint256 => uint256))) public accessCounts;

    function validate(bytes[] memory params) external view {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));

        uint256 today = block.timestamp / 1 days;
        require(
            accessCounts[provider][patient][today] < maxAccessesPerDay,
            "Daily access rate limit exceeded"
        );
    }

    // Called by the registry after a successful access to increment counter
    function recordAccess(address provider, address patient) external {
        uint256 today = block.timestamp / 1 days;
        accessCounts[provider][patient][today]++;
    }
}
```

### 5.6 AuditPolicy

**Purpose:** Ensures that every access attempt (successful or denied) generates an immutable on-chain log entry. This policy never reverts -- it always passes, but guarantees that the audit trail is complete.

**Validation logic:**
1. Emit an `AccessAttemptLogged` event with the full details of the access request.
2. Always pass (this is a logging policy, not a gate).

**Implementation note:** This policy runs last in the chain. By the time it executes, all other policies have either passed (access is approved) or one has reverted (access is denied, and this policy's log is part of the reverted transaction). To log denials, the CRE workflow handles denial logging separately via EVM Write before the policy chain runs.

```solidity
contract AuditPolicy is IPolicy {
    event AccessAttemptLogged(
        address indexed provider,
        address indexed patient,
        bytes32 recordType,
        uint256 timestamp,
        bool approved
    );

    function validate(bytes[] memory params) external {
        address provider = abi.decode(params[0], (address));
        address patient = abi.decode(params[1], (address));
        bytes32 recordType = abi.decode(params[2], (bytes32));

        emit AccessAttemptLogged(provider, patient, recordType, block.timestamp, true);
        // Always passes -- this is a logging policy
    }
}
```

### Unified Extractor for Kosyn AI

Because all CRE workflows use `onReport` with the same function selector, a unified extractor differentiates between operation types using the first byte of the report data as a discriminator:

```solidity
contract KosynExtractor is IExtractor {
    function extract(bytes calldata callData) external pure returns (bytes[] memory) {
        // Skip the first 4 bytes (function selector for onReport)
        bytes calldata reportData = callData[4:];

        // First byte = operation type
        uint8 operation = uint8(reportData[0]);
        bytes calldata data = reportData[1:];

        if (operation == 0x00) {
            // Record upload: extract patient address
            (, , , address patient) = abi.decode(data, (string, bytes32, uint256, address));
            bytes[] memory params = new bytes[](3);
            params[0] = abi.encode(address(0)); // no provider for uploads
            params[1] = abi.encode(patient);
            params[2] = abi.encode(bytes32(0));
            return params;
        } else if (operation == 0x01) {
            // Access grant: extract provider, patient, recordType
            (address provider, address patient, bytes32 recordType, , ) =
                abi.decode(data, (address, address, bytes32, uint256, bytes32));
            bytes[] memory params = new bytes[](3);
            params[0] = abi.encode(provider);
            params[1] = abi.encode(patient);
            params[2] = abi.encode(recordType);
            return params;
        }
        // ... other operations
    }
}
```

---

## 6. Frontend Pages

### Technology Stack

- **Framework:** Next.js (App Router)
- **Wallet Connection:** Thirdweb Connect (email/social login for patients, MetaMask/EOA for providers)
- **UI Components:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack Query for on-chain data
- **Gas Sponsorship:** Thirdweb gas sponsorship (patients never pay gas)
- **Chain:** Ethereum Sepolia (primary), Base Sepolia (for cross-chain demo)

### 6.1 Patient Dashboard

**Route:** `/dashboard`

**Layout:**

```
+------------------------------------------------------------------+
|  Kosyn AI                                    [Connected: 0x...]   |
|  Patient Dashboard                           [Settings] [Logout]  |
+------------------------------------------------------------------+
|                                                                    |
|  +-- Upload Records ----+  +-- Health Timeline ---------------+   |
|  |                       |  |                                   |  |
|  |  [Drag & drop zone]  |  |  Feb 2026 -- Lab Results (blood)  |  |
|  |  PDF, DICOM, TXT     |  |    > A1C: 6.2 (normal)            |  |
|  |                       |  |    > Cholesterol: 215 (flagged)   |  |
|  |  Record type:         |  |                                   |  |
|  |  [x] Lab Results     |  |  Jan 2026 -- Prescription          |  |
|  |  [ ] Prescription    |  |    > Metformin 500mg 2x daily      |  |
|  |  [ ] Imaging         |  |                                   |  |
|  |  [ ] Clinical Notes  |  |  Dec 2025 -- Imaging (chest X-ray) |  |
|  |                       |  |    > No abnormalities detected     |  |
|  |  [Upload to TEE]     |  |                                   |  |
|  +-----------------------+  +-----------------------------------+  |
|                                                                    |
|  +-- AI Health Insights -----+  +-- Manage Consents ----------+   |
|  |                            |  |                              |  |
|  |  Last analysis: 2h ago    |  |  Dr. Smith (Cardiology)      |  |
|  |                            |  |    Access: Lab, Imaging      |  |
|  |  Drug Interactions:        |  |    Expires: Mar 15, 2026     |  |
|  |    NONE detected           |  |    [Revoke]                  |  |
|  |                            |  |                              |  |
|  |  Risk Scores:              |  |  City Hospital ER            |  |
|  |    Cardiovascular: 32/100  |  |    Access: EMERGENCY (24h)   |  |
|  |    Metabolic: 45/100       |  |    Expires: in 18 hours      |  |
|  |    Respiratory: 12/100     |  |    [Review]                  |  |
|  |                            |  |                              |  |
|  |  Anomalies:                |  |  + [Grant New Access]        |  |
|  |    Cholesterol trending    |  |                              |  |
|  |    upward (3-month trend)  |  +------------------------------+  |
|  |                            |                                    |
|  |  [View Full Report]        |  +-- Access Log ---------------+   |
|  +----------------------------+  |                              |  |
|                                  |  Today 2:14 PM              |  |
|                                  |    Dr. Smith accessed Labs   |  |
|                                  |    Status: APPROVED          |  |
|                                  |                              |  |
|                                  |  Today 11:30 AM              |  |
|                                  |    Unknown Provider 0x7f...  |  |
|                                  |    Status: DENIED            |  |
|                                  |    Reason: Not registered    |  |
|                                  |                              |  |
|                                  |  [View Full Audit Trail]     |  |
|                                  +------------------------------+  |
+------------------------------------------------------------------+
```

**Key interactions:**
- **Upload Records:** Drag-and-drop file upload. Selecting record type tags the upload. The "Upload to TEE" button triggers the CRE HTTP Trigger workflow. A loading state shows "Encrypting in secure enclave..." followed by "Stored on IPFS" with the CID.
- **Health Timeline:** Chronological list of all records. Each entry shows the record type, date, and a brief summary (extracted by AI at upload time). Clicking a record opens the full encrypted record (decrypted in a new TEE session for the patient).
- **AI Health Insights:** Displays the latest AI analysis results. Risk scores are shown as progress bars. Drug interactions are highlighted in red/yellow/green. "View Full Report" opens the complete AI-generated clinical summary.
- **Manage Consents:** List of all providers with active access. Shows access scope, expiry, and a one-click "Revoke" button. "Grant New Access" opens a modal to add a provider by address or ENS name.
- **Access Log:** Real-time feed of access attempts from on-chain events. Color-coded: green for approved, red for denied, yellow for emergency.

### 6.2 Provider Portal

**Route:** `/provider`

**Layout:**

```
+------------------------------------------------------------------+
|  Kosyn AI                                    [Connected: 0x...]   |
|  Provider Portal                             [My Patients]        |
+------------------------------------------------------------------+
|                                                                    |
|  +-- Request Access --------+  +-- Active Patients -----------+   |
|  |                           |  |                               |  |
|  |  Patient Address:         |  |  Patient 0xa3... (Jane Doe)   |  |
|  |  [0x... or ENS name]     |  |    Records: Lab, Prescription  |  |
|  |                           |  |    Expires: 28 days            |  |
|  |  Record Types Needed:     |  |    [View Records]              |  |
|  |  [x] Lab Results         |  |                               |  |
|  |  [x] Prescriptions       |  |  Patient 0xf1... (John Smith)  |  |
|  |  [ ] Imaging              |  |    Records: All (Emergency)    |  |
|  |  [ ] Clinical Notes       |  |    Expires: 6 hours            |  |
|  |                           |  |    [View Records]              |  |
|  |  Reason:                  |  |                               |  |
|  |  [Follow-up consultation] |  +-------------------------------+  |
|  |                           |                                    |
|  |  [Request Access]         |                                    |
|  +---------------------------+                                    |
|                                                                    |
|  +-- Patient Records (when viewing) --------------------------+   |
|  |                                                              |  |
|  |  Patient: 0xa3... (Jane Doe)                                 |  |
|  |  Access granted: Feb 10, 2026 | Expires: Mar 10, 2026        |  |
|  |                                                              |  |
|  |  +-- Lab Results --------+  +-- AI Clinical Notes -------+  |  |
|  |  | Feb 5 - Blood Panel   |  | Generated by AI (Feb 10)   |  |  |
|  |  |   A1C: 6.2            |  |                             |  |  |
|  |  |   Glucose: 110        |  | Summary: Patient shows      |  |  |
|  |  |   Cholesterol: 215    |  | well-controlled diabetes    |  |  |
|  |  | Jan 20 - Urinalysis   |  | with mild hyperlipidemia.   |  |  |
|  |  |   All values normal   |  | Recommend statin eval.      |  |  |
|  |  +------------------------+  |                             |  |  |
|  |                              | Risk: Cardiovascular 32     |  |  |
|  |  +-- Prescriptions ------+  | Drug Interactions: NONE     |  |  |
|  |  | Metformin 500mg 2x    |  +-----------------------------+  |  |
|  |  | Lisinopril 10mg 1x    |                                   |  |
|  |  +------------------------+                                   |  |
|  +--------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

**Key interactions:**
- **Request Access:** Provider enters patient address, selects record types needed, provides reason. Submits on-chain `AccessRequested` event. Shows pending status while CRE workflow evaluates policies.
- **Active Patients:** List of patients where the provider has active access. Shows access scope and remaining time.
- **View Records:** Opens the patient's records (decrypted inside TEE for this session). AI-generated clinical notes are displayed alongside the raw data.

### 6.3 Admin/Audit View

**Route:** `/admin`

**Layout:** A table-based view showing:
- All access logs across all patients (aggregated from on-chain events).
- Filterable by: provider, patient, date range, status (approved/denied/emergency).
- Emergency access entries highlighted and sortable by review status.
- Compliance metrics: total accesses this month, denial rate, top denial reasons, emergency access frequency.
- Export to CSV for regulatory reporting.

### 6.4 Cross-Chain Transfer Page

**Route:** `/transfer`

**Layout:**
- Source chain indicator (current chain where records live).
- Record selection (checkboxes for which records to transfer).
- Destination chain selector (dropdown: Ethereum Sepolia, Base Sepolia, etc.).
- Destination provider address input.
- CCIP fee estimate display.
- Transfer button with confirmation modal.
- Transfer status tracker (CCIP message ID, source chain confirmation, CCIP relay, destination chain confirmation).

---

## 7. External Integrations

### 7.1 IPFS/Arweave -- Encrypted Blob Storage

**Purpose:** Store encrypted health record blobs off-chain. The encrypted data is content-addressed (IPFS CID or Arweave transaction ID), and only the hash is stored on-chain.

**Choice rationale:**
- **IPFS (Pinata/Infura):** Faster for demo, free tier sufficient for hackathon. Data persistence depends on pinning service.
- **Arweave:** Permanent storage (pay once, stored forever). Better for production but adds cost.

**Hackathon recommendation:** Use IPFS via Pinata for the demo. Mention Arweave as the production storage layer.

### 7.2 Nillion nilAI -- Clinical Analysis Inside TEE

**Purpose:** Perform drug interaction checks, anomaly detection, health summaries, and risk scoring on patient data. All AI inference happens inside the TEE enclave via HTTP Client within a Confidential HTTP session.

**Model:** Nillion nilAI — Gemma 3 27B (google/gemma-3-27b-it) running inside AMD SEV-SNP + NVIDIA CC TEE.

**Integration pattern:**
- CRE workflow decrypts patient data inside TEE.
- Constructs a structured prompt with health data (no patient identifiers).
- Sends to Nillion nilAI via HTTP Client with `cacheSettings` to prevent duplicate DON calls.
- Receives structured JSON response.
- Encrypts the AI output back inside TEE.

**Consensus strategy:** `aggregation.byFields` with `median` for numeric risk scores and `identical` for text fields (summary, interaction lists).

### 7.3 CCIP -- Cross-Chain Record Portability

**Purpose:** Transfer encrypted health record references and ACE policy configurations between blockchains where different providers operate.

**Message structure:**
```
CCIP Message {
    receiver: address (HealthRecordReceiver on destination chain)
    data: bytes (ABI-encoded: encrypted record CIDs, ACE policy config, patient address)
    tokenAmounts: [] (no token transfer, data-only message)
    extraArgs: bytes (gas limit for destination execution)
    feeToken: address (LINK or native token for CCIP fee)
}
```

### 7.4 ACE -- Compliance Engine

**Purpose:** On-chain policy enforcement for HIPAA-equivalent access controls. Described in detail in Section 5.

**Key integration pattern:** The `runPolicy` modifier on the consumer contract's `onReport` function intercepts every CRE write and routes it through the policy chain before execution.

### 7.5 Vault DON -- Threshold Encryption for Patient Keys

**Purpose:** Store AES-256-GCM encryption keys for patient records using threshold encryption across Vault DON nodes. No single node can reconstruct a key. Keys are only assembled inside the TEE at execution time.

**Key types stored:**
- Per-record AES keys (used to encrypt/decrypt individual health records).
- AI API credentials (Nillion API key).
- IPFS gateway credentials.

### 7.6 Thirdweb -- Wallet Connection and Gas Sponsorship

**Purpose:** Provide a frictionless onboarding experience for patients who are not crypto-native. Thirdweb Connect supports email/social login (creates an in-app wallet automatically). Gas sponsorship means patients never need to acquire ETH to interact with the system.

**Components used:**
- **ConnectButton:** Email, Google, Apple sign-in for patients. MetaMask/WalletConnect for providers.
- **Gas Sponsorship:** Thirdweb metered gas sponsorship for all patient transactions (uploads, consent management).
- **Server Wallets (optional):** Backend wallet for automated CRE workflow interactions.

---

## 8. Hackathon Demo Flow (3-5 Minutes)

### Setup (Before Demo)

- Deploy contracts to Sepolia (HealthRecordRegistry, PatientConsent, ProviderRegistry, EmergencyAccess, PolicyEngine + all policies).
- Register one provider in ProviderRegistry.
- Fund the CRE simulation wallet with Sepolia ETH.
- Prepare a sample lab report PDF.
- Have the frontend running locally.

### Demo Script

**[0:00 - 0:30] Introduction**

"Kosyn AI is a HIPAA-compliant Electronic Health Record system where patients own their data, providers access it with consent, and AI analyzes records -- all without anyone, including the system itself, seeing raw data. Everything runs inside Chainlink's Confidential Compute."

**[0:30 - 1:30] Patient Uploads a Record**

1. Open the Patient Dashboard. Connect via email (Thirdweb Connect).
2. Drag a lab report PDF into the upload zone.
3. Select "Lab Results" as the record type.
4. Click "Upload to TEE."
5. Show the loading state: "Encrypting inside secure enclave..."
6. Show the success: IPFS CID displayed, record appears in the health timeline.
7. Point out: "The raw PDF was encrypted inside a hardware enclave. It is now on IPFS as an unreadable blob. Only the hash is on-chain."

**[1:30 - 2:30] Provider Requests Access -- ACE Policy Check**

1. Switch to the Provider Portal. Connect with MetaMask (provider wallet).
2. Enter the patient's address. Request access to Lab Results.
3. Show the pending state while CRE workflow evaluates ACE policies.
4. Policy check passes (provider is registered, patient has granted consent).
5. Show the AI-generated clinical summary: "A1C: 6.2 (normal), Cholesterol: 215 (elevated), Risk Score: Cardiovascular 32/100."
6. Point out: "The provider sees the analysis, but the CRE nodes never saw the raw data. The AI ran inside the enclave."

**[2:30 - 3:15] Unauthorized Access -- ACE Rejection**

1. Switch to a different wallet (unregistered provider).
2. Request access to the same patient's records.
3. Show the DENIED status.
4. Show the denial reason: "Provider not registered."
5. Switch back to the patient dashboard. Show the access log: "Access denied -- unknown provider 0x7f... -- reason: not registered."
6. Point out: "Every access attempt is logged on-chain. The patient sees exactly who tried to access their data and why they were blocked."

**[3:15 - 4:00] Patient Revokes Access**

1. On the Patient Dashboard, go to Manage Consents.
2. Click "Revoke" next to the authorized provider.
3. Switch to the Provider Portal. Try to view records.
4. Show the DENIED status: "Access revoked by patient."
5. Point out: "Revocation is immediate. The next access attempt is blocked. The patient is always in control."

**[4:00 - 4:30] The On-Chain Audit Trail**

1. Show the Admin/Audit View.
2. Scroll through the access log: uploads, grants, denials, revocations -- all timestamped, all on-chain.
3. Point out: "This is a complete HIPAA audit trail. Every access is logged, nothing is hidden, but no health data is exposed. The audit trail itself contains only hashes and addresses."

**[4:30 - 5:00] Wrap-Up**

"Kosyn AI demonstrates that healthcare data can be private, portable, intelligent, and compliant -- simultaneously. CRE's Confidential Compute, ACE compliance engine, and CCIP make this possible for the first time. The patient owns their data. The provider gets AI-powered insights. Nobody sees the raw records. Thank you."

---

## 9. Business Model

### Revenue Streams

| Stream | Description | Pricing Model | Target Customer |
|--------|-------------|---------------|-----------------|
| **Provider SaaS** | Monthly subscription for healthcare providers to access the Kosyn platform (request patient records, receive AI clinical notes, manage access grants) | $5-15 per patient per month (tiered by provider size) | Hospitals, clinics, private practices |
| **Patient Premium** | Subscription for patients to access AI health insights (risk scoring, drug interaction alerts, health trend analysis, proactive notifications) | $9.99/month or $99/year | Health-conscious patients, chronic disease management |
| **Enterprise Compliance** | Custom ACE policy configuration, dedicated support, SLA guarantees, white-label deployment for hospital networks | Custom pricing ($50K-500K/year) | Large hospital networks, health systems |
| **Data Marketplace (Health Data Marketplace)** | Patients opt-in to sell anonymized health data to pharma researchers. AI aggregates inside TEE -- researchers get statistics, never raw data. Patients get paid. | 10-15% marketplace fee on bounties | Pharma companies, clinical research organizations |

### Unit Economics

- **Cost per record upload:** IPFS storage (~$0.001) + CRE workflow gas (~$0.05 Sepolia, ~$0.50 mainnet) + Vault DON key storage (included in CRE).
- **Cost per AI analysis:** Nillion nilAI call + CRE workflow gas.
- **Cost per CCIP transfer:** CCIP fee (~0.1-0.5 LINK per message) + gas on both chains.
- **Thirdweb gas sponsorship:** Metered, ~$0.01-0.05 per patient transaction.

### Go-to-Market

1. **Phase 1 (Hackathon):** Build the core product, demonstrate at Convergence.
2. **Phase 2 (Pilot):** Partner with 2-3 small clinics in India for a pilot deployment (lower regulatory barrier, high EHR fragmentation).
3. **Phase 3 (Growth):** Expand to US market with HIPAA certification. Health Data Marketplace as the monetization engine.

---

## 10. Technical Hackathon Scope

### What to Build for the Hackathon

The hackathon submission must be realistic for a 2-4 week build period. Below is the scoped-down version that demonstrates the full CRE capability set without overextending.

#### Smart Contracts (2 contracts)

| Contract | Scope | Complexity |
|----------|-------|------------|
| **HealthRecordRegistry.sol** | Full implementation: record upload, access grants, access denials, audit logging. Inherits ReceiverTemplate. Uses `runPolicy` modifier with ACE PolicyEngine. | Medium-High |
| **PatientConsent.sol** | Full implementation: grant access, revoke access, check consent, emit events. | Medium |

**Simplified for hackathon:**
- ProviderRegistry can be a simple mapping (no full credential verification).
- EmergencyAccess can be omitted or mocked.
- ACE policies: implement ProviderAllowlist and AuditPolicy only. Others are described in the doc and mentioned in the pitch as roadmap.

#### CRE Workflows (2-3 workflows)

| Workflow | Trigger | Capabilities | Priority |
|----------|---------|-------------|----------|
| **Record Upload** | HTTP Trigger | Confidential HTTP (encrypt), HTTP Client (IPFS upload), EVM Write (store hash) | MUST HAVE |
| **Provider Access** | Log Trigger | EVM Read (check consent), Confidential HTTP (decrypt + AI), EVM Write (log access) | MUST HAVE |
| **AI Health Analysis** | Cron Trigger | Confidential HTTP (decrypt), HTTP Client (Nillion nilAI), EVM Write (store report hash) | NICE TO HAVE (can merge with Provider Access) |

**Hackathon simplification:** Workflows 2 and 3 can be combined into a single workflow. When a provider requests access, the workflow decrypts, runs AI, encrypts the result, and delivers it. The Cron-based periodic analysis can be mentioned as a roadmap feature.

#### Frontend (1 app, 2-3 pages)

| Page | Priority | Scope |
|------|----------|-------|
| **Patient Dashboard** | MUST HAVE | Upload records, view timeline, manage consents, view access log |
| **Provider Portal** | MUST HAVE | Request access, view approved records with AI notes |
| **Audit View** | NICE TO HAVE | Table of access logs (can be a tab within Patient Dashboard) |

#### What is Roadmap (NOT built for hackathon)

- Cross-chain transfer via CCIP (described in architecture, not implemented).
- Emergency access workflow (described, contract can be stubbed).
- Geographic restriction and rate limit ACE policies (described, not deployed).
- Health Data Marketplace integration.
- Mobile app.
- Multi-chain deployment.

### Deployment Strategy

1. Deploy contracts to **Ethereum Sepolia** using Foundry.
2. CRE workflows simulated with `--broadcast` flag (real on-chain transactions on Sepolia).
3. Frontend deployed on **Vercel** or run locally for the demo video.
4. Use the **Simulation Forwarder** address for CRE (no production deployment needed).
5. Demo video: 3-5 minutes, screen recording of the full flow.

### File Structure

```
kosyn-ai/
  contracts/
    src/
      HealthRecordRegistry.sol
      PatientConsent.sol
      ProviderRegistry.sol
      interfaces/
        IReceiver.sol
        ReceiverTemplate.sol
        IPolicyEngine.sol
        IPolicy.sol
        IExtractor.sol
      policies/
        ProviderAllowlistPolicy.sol
        AuditPolicy.sol
        KosynExtractor.sol
    script/
      Deploy.s.sol
    foundry.toml
  workflows/
    record-upload/
      main.ts
      httpCallback.ts
      workflow.yaml
      config.staging.json
    provider-access/
      main.ts
      logCallback.ts
      nillion.ts
      workflow.yaml
      config.staging.json
    project.yaml
    secrets.yaml
    .env
  frontend/
    app/
      dashboard/
        page.tsx          # Patient dashboard
      provider/
        page.tsx          # Provider portal
      layout.tsx
    components/
      upload-record.tsx
      health-timeline.tsx
      consent-manager.tsx
      access-log.tsx
      provider-access-form.tsx
      ai-clinical-notes.tsx
    lib/
      contracts.ts        # ABI + addresses
      cre.ts              # CRE interaction helpers
    package.json
    next.config.js
  README.md
  .gitignore
```

---

## 12. Avalanche Build Games Integration

Kosyn AI is submitted to both Chainlink Convergence and Avalanche Build Games. The Avalanche integration layers on top of the existing CRE architecture without replacing anything -- it adds a deployment target and expands the partner integrations.

### Why Avalanche

**C-Chain deployment (immediate):**
- Avalanche C-Chain is fully EVM-compatible. All existing Solidity contracts (HealthRecordRegistry, PatientConsent, ProviderRegistry, ACE policies) deploy to C-Chain without modification.
- Avalanche Fuji testnet provides a second demo chain alongside Sepolia and Base Sepolia.

**Future L1 upgrade path (roadmap pitch):**
- Post-Avalanche9000, launching a dedicated Kosyn L1 is economically viable at ~1.33 AVAX/month per validator.
- Kosyn L1 would use **eERC (Encrypted ERC)** for patient records: balances and health scores stored as encrypted values using zk-SNARKs + homomorphic encryption. Patients hold decryption keys; no one else can read values without explicit consent.
- **validatorOnly mode** restricts network traffic to approved healthcare validators only -- a HIPAA-compliant network where raw health transactions are never visible to unapproved nodes.
- This vision positions Kosyn AI not just as a dapp but as the foundation layer for a privacy-first healthcare blockchain.

### Partner Integrations

**Chainlink CRE (already core):**
- Confidential HTTP for health data encryption/decryption inside TEE
- Consensus for multi-provider AI result verification
- CCIP for cross-chain health record transfer (Sepolia ↔ Base Sepolia ↔ Avalanche Fuji)

**Kite AI -- AI Diagnostic Agents with Proof of Attributed Intelligence:**
- Kite AI provides verifiable identity for the AI model that analyzes patient health data.
- Every clinical diagnosis carries a PAI attestation: which model version ran, when it ran, and that model's track record (accuracy, audit history).
- Patients can inspect the AI's credentials before trusting a diagnosis -- analogous to checking a doctor's medical license.
- Replaces the anonymous "AI said so" with a cryptographically verifiable AI identity anchored on Kite's network.

**KosynUSD (KUSD) -- Stablecoin Healthcare Payments:**
- Healthcare service payments denominated in KUSD (custom ERC-20, 6 decimals, minted via Chainlink CRE).
- Patients deposit USD via Stripe → CRE mints equivalent KUSD to their wallet.
- Researchers pay KUSD per data query via x402 payment standard; CRE distributes shares to contributing patients automatically.
- Provider payments settled on-chain in KUSD, eliminating traditional billing cycle delays.

### Avalanche-Specific Architecture

```
Patient → Avalanche C-Chain (health records, payments in KUSD)
        → CRE TEE (confidential health analysis via Confidential HTTP)
        → Kite AI (AI agent identity + PAI attestation on diagnosis)
        → KosynUSD (KUSD payment settlement for services and data queries)

Future (Kosyn L1):
Patient → Kosyn L1 (eERC encrypted records, validatorOnly HIPAA mode)
        → CRE (confidential compute bridge)
        → Approved providers (decrypt with patient consent)
```

### Build Games Judging Alignment

| Criterion | How Kosyn AI Addresses It |
|-----------|--------------------------|
| **Builder Drive** | Healthcare + AI + crypto is a genuinely underserved category. No major EHR system uses on-chain consent or TEE-based analysis. |
| **Execution** | Full-stack app: deployed contracts on Avalanche Fuji, CRE confidential workflows running on Sepolia, frontend with Thirdweb auth. |
| **Crypto Culture** | Health data sovereignty is crypto's core value applied to a real-world crisis. Patients are the first true owners of their medical records. |
| **Long-Term Intent** | Vision for a HIPAA-compliant L1 with eERC encrypted records is a multi-year roadmap with clear Avalanche9000 economics. |
| **Partner Integration Depth** | CRE and Kite AI integrated at the architecture level — confidential compute + verifiable AI identity on every diagnosis. |

---

## 13. Build Games Demo Angle

### Core Demo Narrative: "Your AI doctor has a verifiable track record"

Most AI medical tools are black boxes. Kosyn AI is the first system where the AI's identity, credentials, and diagnostic history are cryptographically verifiable on-chain via Kite AI's Proof of Attributed Intelligence.

**Demo flow (5 minutes):**

1. **Patient uploads health data** -- drag-and-drop lab results, vitals, imaging reports into the frontend. Thirdweb Connect handles signing.
2. **CRE processes in TEE** -- Confidential HTTP workflow encrypts the record inside the enclave. On-chain, only a hash is stored. The raw data never touches a public node.
3. **AI diagnosis with attestation** -- Nillion nilAI (Gemma 3 27B) runs inside the TEE enclave. Kite AI PAI attestation is generated: model version, timestamp, accuracy score. The patient sees "Analyzed by Kite AI Agent v2.3.1 -- 94.2% diagnostic accuracy, 847 prior cases." This attestation is on-chain.
4. **Payment in KUSD** -- Provider receives KUSD for the consultation. If an insurance payout is triggered by the diagnosis, the ACE policy verifies eligibility and settlement lands in patient's wallet within the same transaction.
5. **Patient owns the keys** -- Thirdweb Connect wallet holds the decryption key. The patient can revoke provider access, export records, or transfer to a new provider -- all without asking Kosyn AI for permission.

**What the judge sees:**
- A working dapp deployed on Avalanche Fuji
- A CRE confidential workflow producing verifiable on-chain attestations
- A Kite AI PAI attestation linked to a real diagnosis
- A KUSD payment settling in the same transaction as the consultation
- A patient wallet (Thirdweb Connect) that survives even if Kosyn AI shuts down

**Differentiation:**
Nobody else is combining healthcare data sovereignty + Avalanche deployment + CRE confidential compute + verifiable AI identity (Kite). The three hardest problems in health tech -- privacy, AI accountability, and patient ownership -- are all addressed in a single demo flow.

---

## 11. Tracks and Prizes

### Primary Track: Privacy ($16,000 prize pool)

**Why Kosyn AI qualifies:** Confidential Compute is the centerpiece of the entire product, not an afterthought. Every core feature depends on TEE enclaves:
- Record encryption/decryption via Confidential HTTP.
- AI analysis inside TEE (data never leaves enclave).
- Vault DON threshold encryption for patient keys.
- On-chain audit trail that provides transparency WITHOUT exposing data.

This is the strongest possible privacy track submission because the product literally cannot function without Confidential Compute. The privacy is not a feature -- it is the architecture.

### Secondary Track: AI

**Why Kosyn AI qualifies:** AI is deeply integrated into the clinical workflow:
- Drug interaction detection via Nillion nilAI inside TEE.
- Anomaly detection on historical lab results.
- Health summary generation for providers.
- Risk scoring (cardiovascular, metabolic, respiratory, oncological).

The AI integration demonstrates CRE's HTTP Client capability for LLM calls with the added dimension of confidentiality -- the AI processes sensitive health data that must remain private.

### Tertiary Track: DeFi / Tokenization

**Why Kosyn AI qualifies (stretch):** The Health Data Marketplace angle introduces a DeFi element:
- Patients can monetize their health data by opting into research bounties.
- Researchers pay with tokens; patients receive tokens.
- The marketplace uses CRE for privacy-preserving data aggregation.

For the hackathon submission, this track qualification depends on whether the health data marketplace feature is implemented or only pitched as roadmap. If time allows, a simple bounty contract demonstrates the DeFi angle.

### Cross-Track Multiplier

The Convergence hackathon explicitly encourages multi-track submissions. Kosyn AI is designed to qualify for Privacy + AI at minimum, with DeFi as a stretch. This multi-track eligibility increases the probability of placing in at least one prize category.

### Judging Criteria Alignment

| Criterion | How Kosyn AI Addresses It |
|-----------|--------------------------|
| **CRE Capability Depth** | Uses 7+ CRE capabilities (Confidential HTTP, HTTP Client, Vault DON, EVM Read, EVM Write, Log Trigger, HTTP Trigger, Cron Trigger). More than any other product concept. |
| **Technical Execution** | Simulation with `--broadcast` produces verifiable on-chain transactions on Sepolia. Smart contracts are deployed and functional. |
| **Real-World Impact** | Addresses a $4.4T industry problem (healthcare EHR fragmentation) with a solution that is impossible without CRE's unique capabilities. |
| **Demo Quality** | Clear, step-by-step 5-minute demo showing upload, access, denial, revocation, and audit trail. Each step maps to a CRE capability. |
| **Business Viability** | SaaS model with clear revenue streams. Gabriel's existing Kosyn AI product provides domain credibility. |
| **ACE Policy Creativity** | Six distinct compliance policies (allowlist, time window, emergency override, geographic restriction, rate limit, audit) -- not just an empty policy engine. |
