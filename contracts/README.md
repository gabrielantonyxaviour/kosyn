# Kosyn AI — Smart Contracts

HIPAA-compliant Electronic Health Record contracts on Avalanche Fuji. Built with Foundry.

## Contracts

| Contract | Description |
|---|---|
| `HealthRecordRegistry.sol` | Central registry. Extends ReceiverTemplate to receive CRE reports. Handles record upload (op 0x00), access grant (op 0x01), denial (op 0x02). Calls PolicyEngine + HIPAAComplianceRegistry on every access attempt. |
| `PatientConsent.sol` | Time-bounded consent management. `grantAccess(provider, recordType, duration)`, `revokeAccess(provider)`. Emits `ConsentUpdated` events consumed by CRE Log Trigger. |
| `ProviderRegistry.sol` | Verified healthcare provider registry. CRE provider-registration workflow hashes license numbers (no raw PII on-chain). |
| `PatientRegistry.sol` | On-chain patient identity. Stores IPFS CID of AES-256-GCM encrypted profile blob + SHA-256 hash. DID: `did:pkh:eip155:43113:{address}`. |
| `HIPAAComplianceRegistry.sol` | On-chain HIPAA attestation. Bitmask per access event across 4 §164.312 safeguards. Only authorized registrars (HealthRecordRegistry) can write. |
| `KosynUSD.sol` | ERC-20 stablecoin (6 decimals). Minted by CRE payment-mint workflow after Stripe verification (op 0x04). |
| `DataMarketplace.sol` | KUSD-powered research data queries. CRE data-marketplace workflow distributes KUSD to contributors (op 0x05). |
| `ace/PolicyEngine.sol` | Composes 4 HIPAA policies via IPolicy interface. `evaluate(caller, data)` runs all policies sequentially. |
| `ace/ConsentExpiryPolicy.sol` | HIPAA §164.312(a)(1). Checks consent `expiresAt` has not passed. |
| `ace/MinimumNecessaryPolicy.sol` | HIPAA §164.514(d). Verifies requested recordType matches consented recordType (or 0xFF emergency override). |
| `ace/ProviderAllowlistPolicy.sol` | Checks requesting provider is on patient's explicit allowlist. |
| `ace/AuditPolicy.sol` | Logs every access attempt with full context. Writes to HIPAAComplianceRegistry. |

## ACE PolicyEngine — HIPAA §164.312 Safeguard Bitmask

The `HIPAAComplianceRegistry` records a bitmask per access event:

| Flag | Hex | HIPAA Safeguard |
|---|---|---|
| `SAFEGUARD_ACCESS_CONTROL` | `0x01` | §164.312(a)(1) — Unique user ID, automatic logoff |
| `SAFEGUARD_CONSENT_EXPIRY` | `0x02` | §164.312(a)(1) — Access based on time-bounded consent |
| `SAFEGUARD_MIN_NECESSARY` | `0x04` | §164.514(d) — Minimum necessary standard |
| `SAFEGUARD_AUDIT_TRAIL` | `0x08` | §164.312(b) — Audit controls |

## Deployment

Target chain: **Avalanche Fuji** (chain ID 43113)

```bash
cd contracts
forge install
forge build

# Deploy all contracts (wires them together, sets registrar auth)
forge script script/Deploy.s.sol --broadcast --rpc-url $NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL --private-key $PRIVATE_KEY

# After deploy: copy contract addresses into frontend/.env.local
```

## Tests

```bash
forge test
forge test -vvv        # verbose
forge snapshot         # gas snapshots
```

## CRE Operation Codes

| Op | Hex | Handler |
|---|---|---|
| Record Upload | `0x00` | `HealthRecordRegistry.receiveRecord()` |
| Access Grant | `0x01` | `HealthRecordRegistry.receiveAccessGrant()` |
| Access Denial | `0x02` | `HealthRecordRegistry.receiveAccessDenial()` |
| Provider Registration | `0x03` | `ProviderRegistry.receiveRegistration()` |
| KUSD Mint | `0x04` | `KosynUSD.mint()` via CRE |
| KUSD Distribution | `0x05` | `DataMarketplace.distributeRewards()` |
