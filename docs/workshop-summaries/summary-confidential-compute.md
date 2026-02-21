# Chainlink Confidential Compute: Combined Workshop Summary

**Workshops:** "Making Confidential HTTP Requests with CRE" (Workshop 06) + "Making Private Transactions with Confidential Compute" (Workshop 07)
**Event:** Chainlink Convergence Hackathon
**Presenters:** Harry (DevRel Lead, Chainlabs), Frank (Demo Engineer)
**Privacy Track Prize Pool:** $16,000

---

## 1. Overview

These two workshops cover the two primary capabilities of **Chainlink Confidential Compute**, announced at SmartCon in November 2024 in New York. Confidential Compute unlocks a new class of "private smart contracts" powered by CRE (Chainlink Runtime Environment).

| Workshop | Capability | What It Enables |
|----------|-----------|-----------------|
| **06 - Confidential HTTP Requests** | Private API calls from CRE workflows | Secrets (API keys, credentials) and API responses stay encrypted and invisible to CRE nodes, the DON, and the blockchain |
| **07 - Private Transactions** | Private token movements via vault contract + off-chain enclave | Token balances, transfer amounts, sender/receiver addresses remain private while maintaining compliance and auditability |

Both capabilities share the same underlying infrastructure: **Trusted Execution Environments (TEEs/enclaves)**, **threshold encryption via Vault DON**, and **Chainlink's Decentralized Oracle Network**.

---

## 2. Confidential HTTP Requests

### What Problem It Solves

Standard CRE HTTP calls expose request parameters and responses to every node in the DON. Confidential HTTP solves three problems:

1. **Credential Security** -- API keys/secrets never leave the enclave in plaintext
2. **Request Privacy** -- Request body parameters remain confidential
3. **Response Privacy** -- API responses can be AES-GCM encrypted before CRE nodes see them

### How It Works

1. CRE workflow nodes reach **quorum** on the request parameters
2. The **Confidential HTTP DON** fetches encrypted secrets from the **Vault DON**
3. Secrets are decrypted **only inside the enclave** (TEE)
4. The HTTP request is executed from within the enclave
5. If response encryption is enabled, the response is AES-GCM encrypted inside the enclave before being returned to CRE
6. CRE receives either plaintext or encrypted response depending on configuration
7. Encrypted responses are forwarded to an off-chain system that holds the decryption key

### Key Difference from Regular HTTP

| Aspect | Regular HTTP | Confidential HTTP |
|--------|-------------|-------------------|
| API calls per request | One per node in DON | **One total** (from enclave) |
| Secrets visibility | Visible to DON nodes | **Never visible** -- threshold encrypted |
| Response privacy | Visible to all nodes | **Optionally encrypted** with AES-GCM |
| Use case | Non-sensitive public APIs | Sensitive data, regulatory compliance |

### Vault DON and Threshold Encryption

The Vault DON is the secret storage layer:
- Secrets (API keys, AES keys) are split into **shares** via threshold encryption
- Each share is stored on a **different node operator** in the DON
- Shares are only recombined **inside the enclave** at execution time
- After use, the recombined secret is **discarded** -- CRE never sees it

### AES-GCM Response Encryption

When response encryption is enabled:
- The enclave encrypts the API response using the AES-GCM key stored in the Vault DON
- The encrypted output format: `[12-byte nonce] + [ciphertext + authentication tag]`
- To decrypt: split the first 12 bytes as nonce, use the rest as ciphertext+tag, combine with the AES key

### Reserved Secret Key Names

- `my_api_key` -- stores the API credential in the Vault DON
- `SAN_MARINO_AES_GCM_ENCRYPTION_KEY` -- reserved key name that triggers automatic response encryption when `encrypt_output` is set to `true`

---

## 3. Private Transactions

### What Problem It Solves

On-chain token transfers are fully transparent -- balances, amounts, sender/receiver addresses are all public. Financial institutions and compliance-sensitive applications need:

- **Private balances** -- token holdings not visible on-chain
- **Private transfer amounts** -- transaction values hidden
- **Private sender/receiver addresses** -- identity protection via shielded addresses
- **Compliance controls** -- all of the above while maintaining auditability

### Architecture: Two Realms

Private transactions create a dual-realm model:

```
PUBLIC REALM (on-chain)          PRIVATE REALM (off-chain enclave)
+------------------+             +---------------------------+
| ERC-20 Token     |             | Secure Enclave            |
| (normal balance) |             | - Private balances        |
|                  |  deposit    | - Private transfers       |
|    User Wallet ------------>   | - Shielded addresses      |
|                  |             | - Transaction history      |
|                  |  withdraw   |                           |
|    User Wallet <------------ | (ticket-based withdrawal) |
+------------------+             +---------------------------+
         ^                                  ^
         |                                  |
    Vault Contract              Off-chain API (enclave)
    (entry/exit point)          (balance + transfer logic)
```

**Tokens can exist in either realm but not both simultaneously.** The Vault contract is the bridge.

### On-Chain Components

Three smart contracts:

1. **Vault Contract** -- Entry/exit point for private tokens. Deployed and verified by Chainlink. Key functions:
   - `deposit(token, amount)` -- Move tokens from public to private realm
   - `withdrawWithTicket(ticket, amount, token)` -- Move tokens from private to public realm (requires cryptographic ticket from enclave)

2. **ERC-20 Token Contract** -- Standard token (inherits ERC20 + ERC20Permit from OpenZeppelin). Must be registered with the Vault.

3. **Policy Engine (ACE)** -- Chainlink Automated Compliance Engine. Defines rules for token transfers (allow lists, rate limits, etc.). Every token registered in the Vault must have an ACE policy attached.

### Off-Chain Components

An API layer sitting in front of the secure enclave, using **EIP-712 signatures** for authentication. All requests must be signed with the user's wallet.

**API Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `retrieve_balances` | Get private balance for an address (per token) |
| `list_transactions` | List all private transactions for an address |
| `private_transfer` | Transfer tokens privately (address A to address B) |
| `withdraw` | Generate a withdrawal ticket to redeem tokens on-chain |
| `generate_shielded_address` | Create an unlinkable address mapped to your real address |

### Shielded Addresses

A critical privacy feature:
- Looks like a normal Ethereum address
- **Cannot be linked** to the original wallet address by external observers
- Generated via the off-chain enclave API
- The owner can receive tokens at the shielded address
- When withdrawing, the original account is used -- but the **amount withdrawn can differ** from what was transferred, breaking linkability
- Only the enclave knows the mapping between shielded and real addresses

### Withdrawal Ticket System

Tickets are cryptographic signatures issued by the enclave that authorize on-chain withdrawals:
- Generated by calling the `withdraw` API endpoint
- Must be passed to `withdrawWithTicket()` on the Vault contract
- The Vault contract validates the ticket against the enclave's authorization
- **One ticket per withdrawal** -- if lost, you cannot generate a duplicate for the same balance (it was already debited)
- Prevents unauthorized withdrawals -- only the enclave can issue valid tickets

---

## 4. Architecture Deep Dive

### Trusted Execution Environment (TEE)

Both capabilities rely on secure enclaves (TEEs):

- **Isolation** -- Code and data inside the enclave are invisible to the host system, CRE nodes, and external observers
- **Confidential HTTP:** The enclave executes the API call, handles secret recombination, and encrypts responses
- **Private Transactions:** The enclave maintains the private ledger, processes transfers, generates shielded addresses, and issues withdrawal tickets

### Encryption Model

```
Confidential HTTP:
  Secrets --> Threshold encrypted --> Shares on DON nodes
  Request --> Executed in enclave --> Response optionally AES-GCM encrypted

Private Transactions:
  Balances --> Stored in enclave database (never on-chain)
  Transfers --> Processed entirely off-chain in enclave
  Auth --> EIP-712 signed requests (wallet signature)
  Withdrawal --> Ticket = cryptographic proof from enclave
```

### Key Management

| Key Type | Storage | Purpose |
|----------|---------|---------|
| API secrets | Vault DON (threshold encrypted) | Authenticate to external APIs |
| AES-GCM key | Vault DON (threshold encrypted) | Encrypt API responses |
| Wallet private key | User's wallet (MetaMask etc.) | Sign EIP-712 requests for private tx API |
| Enclave signing key | Inside TEE | Issue withdrawal tickets |

---

## 5. Technical Walkthrough

### Confidential HTTP: Step-by-Step

1. **Setup environment:**
   - Get an API key (e.g., from api-ninjas.com)
   - Generate an AES-256-GCM key (32 bytes, hex-encoded)
   - Set both in `.env` file

2. **Configure secrets YAML:**
   - Add `my_api_key` with your API credential
   - Add `SAN_MARINO_AES_GCM_ENCRYPTION_KEY` with your AES key

3. **Configure workflow:**
   - Set the API URL in config
   - Set schedule (e.g., 30 seconds for simulation)

4. **Write the workflow:**
   - Import `confidential_http_client`
   - Build request config with URL, headers, API key reference
   - Specify Vault DON secrets (API key + AES key)
   - Set `encrypt_output: true` for response encryption
   - Choose consensus mechanism
   - Execute request

5. **Simulate:**
   - Run `cre login` to authenticate CLI
   - Run `bun install` for dependencies
   - Simulate the workflow (no blockchain deployment needed)

6. **Decrypt response:**
   - Extract first 12 bytes as nonce
   - Remaining bytes = ciphertext + auth tag
   - Decrypt using: `AES-GCM-decrypt(key, nonce, ciphertext+tag)`

### Private Transactions: Step-by-Step

1. **Deploy contracts (Foundry scripts on Sepolia):**
   ```bash
   # Export env vars
   export PRIVATE_KEY=<your-key>
   export RPC_URL=<sepolia-rpc>

   # Install and build
   forge install
   forge build --via-ir

   # Run all-in-one setup (scripts 01-06):
   forge script script/SetupAll.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
   ```
   This deploys: ERC-20 token, Policy Engine (proxy + implementation), registers token with Vault, mints tokens, approves Vault, and deposits tokens.

2. **Check balance in private realm:**
   - Connect wallet to sandbox UI
   - Go to "Retrieve Balances" tab
   - Sign EIP-712 message with MetaMask
   - Submit -- see private balance per token

3. **Generate shielded address (for recipient):**
   - Switch to Account 2 in MetaMask
   - Go to "Generate Shielded Address" tab
   - Sign and submit
   - Save the returned shielded address

4. **Execute private transfer:**
   - Switch back to Account 1
   - Go to "Private Token Transfer" tab
   - Set recipient = shielded address (not real address)
   - Set token address and amount
   - Sign and submit
   - Verify: nothing visible on Etherscan

5. **Withdraw to public realm:**
   - Switch to Account 2
   - Go to "Withdraw Tokens" tab
   - Specify token and amount
   - Submit -- receive a **ticket** in the response
   - Go to Vault contract on Etherscan (verified, write functions)
   - Call `withdrawWithTicket(ticket, amount, token)`
   - Confirm on MetaMask
   - Verify: tokens now visible in Account 2 on Etherscan

---

## 6. Code Examples

### Confidential HTTP Workflow (CRE)

```javascript
// Import confidential HTTP client
import { ConfidentialHTTPClient } from "@chainlink/cre";

// Define Vault DON secrets
const vaultSecrets = {
  my_api_key: process.env.API_NINJAS_KEY,
  SAN_MARINO_AES_GCM_ENCRYPTION_KEY: process.env.AES_KEY
};

// Build request
const config = {
  url: "https://api.api-ninjas.com/v1/jokes",
  method: "GET",
  headers: {
    "X-Api-Key": "${vault:my_api_key}"  // Reference to Vault DON secret
  },
  vault_don_secrets: vaultSecrets,
  encrypt_output: true  // Enable AES-GCM encryption of response
};

// Execute confidential HTTP request
const response = await confidentialHTTPClient.fetchWithEncryptedResponse(config);

// Response is AES-GCM encrypted -- must decrypt off-chain
const encrypted = Buffer.from(response, 'base64');
const nonce = encrypted.slice(0, 12);           // First 12 bytes
const ciphertextAndTag = encrypted.slice(12);    // Rest
```

### AES-GCM Decryption (Node.js)

```javascript
import { createDecipheriv } from 'crypto';

function decryptResponse(encryptedHex, aesKeyHex) {
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = Buffer.from(aesKeyHex, 'hex');

  // Split: 12-byte nonce + ciphertext + 16-byte auth tag
  const nonce = encrypted.slice(0, 12);
  const authTag = encrypted.slice(-16);
  const ciphertext = encrypted.slice(12, -16);

  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
```

### Private Transaction API Scripts (TypeScript)

```typescript
// balances.ts -- Check private balance
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

// EIP-712 domain and types for authentication
const domain = { name: 'PrivateTokenVault', version: '1' };
const types = {
  BalanceRequest: [{ name: 'account', type: 'address' }]
};
const value = { account: wallet.address };

const signature = await wallet.signTypedData(domain, types, value);

const response = await fetch(`${SANDBOX_API_URL}/balances`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: wallet.address, signature })
});

const balances = await response.json();
// Returns: [{ token: "0x3406...984", balance: "1000000000000000000" }]
```

```typescript
// shielded-address.ts -- Generate shielded address
const shieldedResponse = await fetch(`${SANDBOX_API_URL}/shielded-address`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: wallet.address, signature })
});

const { address: shieldedAddress } = await shieldedResponse.json();
// Returns: { address: "0x0961..." } -- unlinkable to wallet.address
```

```typescript
// private-transfer.ts -- Transfer tokens privately
const transferPayload = {
  recipient: shieldedAddress,    // Use shielded address, not real address
  token: TOKEN_ADDRESS,
  amount: ethers.parseEther("1").toString(),
  signature: await wallet.signTypedData(domain, transferTypes, transferValue)
};

const transferResponse = await fetch(`${SANDBOX_API_URL}/transfer`, {
  method: 'POST',
  body: JSON.stringify(transferPayload)
});
// Returns: { transactionId: "..." } -- off-chain only, nothing on-chain
```

```typescript
// withdraw.ts -- Generate ticket and withdraw on-chain
const withdrawResponse = await fetch(`${SANDBOX_API_URL}/withdraw`, {
  method: 'POST',
  body: JSON.stringify({ token: TOKEN_ADDRESS, amount, signature })
});
const { ticket } = await withdrawResponse.json();

// Use ticket on-chain via Foundry or ethers.js
const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
const tx = await vault.withdrawWithTicket(ticket, amount, TOKEN_ADDRESS);
await tx.wait();
```

### Foundry Setup Script (Solidity)

```solidity
// script/SetupAll.s.sol
// Executes steps 01-06 in sequence:

// 1. Deploy ERC20 token
SimpleToken token = new SimpleToken("DemoToken", "DEMO");

// 2. Deploy Policy Engine (empty policy for demo)
PolicyEngine engine = new PolicyEngine();  // Proxy pattern

// 3. Mint tokens
token.mint(msg.sender, 100 ether);

// 4. Approve Vault to spend tokens
token.approve(VAULT_ADDRESS, type(uint256).max);

// 5. Register token + policy in Vault
vault.register(address(token), address(engine));

// 6. Deposit tokens into private realm
vault.deposit(address(token), 10 ether);
```

---

## 7. Use Cases

### Confidential HTTP Requests

| Use Case | How |
|----------|-----|
| **Private credit scoring** | Call credit bureau API with encrypted credentials, encrypt the score in response, forward to lending protocol |
| **Payment processing** | Pass credit card numbers through CRE workflow to payment API without CRE seeing card data |
| **KYC/AML verification** | Call identity verification APIs with PII kept encrypted end-to-end |
| **Private oracle queries** | Query price feeds or data providers with encrypted API keys, encrypt responses for selective disclosure |
| **Confidential AI inference** | Call AI model APIs with sensitive prompts, encrypt the output |
| **Private prediction markets** | Resolve outcomes using confidential API calls so the DON cannot front-run |

### Private Transactions

| Use Case | How |
|----------|-----|
| **Private DeFi** | Token swaps, LP positions, lending -- all with hidden amounts and addresses |
| **Sealed-bid auctions** | Bidders deposit to private realm, bids are shielded, winner withdraws |
| **Private treasury operations** | DAO treasury movements invisible to the public until withdrawal |
| **Private governance payouts** | Distribute incentives/grants without revealing recipient addresses or amounts |
| **Dark pool trading** | OTC and brokerage settlements with full privacy, compliance via ACE |
| **Private payroll** | Pay employees in tokens without publicly revealing salaries |
| **MEV protection** | Transactions happen off-chain in the enclave -- no mempool exposure |
| **Compliant stablecoin transfers** | Move regulated tokens privately while ACE enforces KYC/AML rules |

### Combined (Both Capabilities)

| Use Case | How |
|----------|-----|
| **Private DeFi with external data** | Confidential HTTP fetches price data, private transactions execute the trade |
| **Compliant cross-border payments** | Confidential HTTP for KYC check, private transaction for the actual transfer |
| **Insurance claims** | Confidential HTTP to verify claim with external system, private payout via vault |

---

## 8. Hackathon Ideas

### Tier 1: Straightforward Builds

1. **Private Token Swap Protocol** -- Build a DEX where swap amounts and counterparties are hidden. Use the Vault for token custody, shielded addresses for traders.

2. **Sealed-Bid NFT Auction** -- Bidders deposit via Vault, submit bids to shielded addresses. Winner revealed only at settlement. Losers withdraw privately.

3. **Private Payroll System** -- Employer deposits tokens, distributes to employee shielded addresses. Employees withdraw at will. ACE policy enforces payment schedules.

### Tier 2: Intermediate

4. **Confidential Lending Protocol** -- Confidential HTTP calls credit scoring API. Score determines loan terms. Private transaction moves collateral and loan tokens. Borrower's credit score never on-chain.

5. **Private Prediction Market** -- Confidential HTTP resolves outcomes from external APIs. Private transactions handle bet placement and payouts. No front-running possible.

6. **Compliant Dark Pool** -- Large trades matched off-chain. ACE policies enforce KYC/AML. Settlement via private transactions. Trade details never visible.

### Tier 3: Advanced

7. **Private Cross-Chain Bridge** -- Use CRE workflows + confidential HTTP to coordinate cross-chain transfers. Private transactions hide amounts on both chains.

8. **Confidential RWA Tokenization** -- Confidential HTTP fetches asset valuations from APIs. Private transactions handle compliant token issuance and transfers. ACE enforces accredited investor rules.

9. **Private DAO Treasury with Compliance** -- Treasury operations invisible. Confidential HTTP for regulatory reporting to authorities only. ACE enforces spending limits and multi-sig.

### Important Notes for Hackathon Submissions

- **Simulation is sufficient** -- You do NOT need to deploy workflows onto CRE. Simulated workflows in a video demo are a valid and encouraged submission.
- **Multi-track eligible** -- A project using private transactions in DeFi can submit to both the Privacy track ($16k) and the DeFi/Tokenization track.
- **ACE policy creativity matters** -- Don't just use an empty policy. Define meaningful compliance rules (allow lists, rate limits, geography restrictions) to stand out.

---

## 9. Key Insights

1. **CRE itself cannot see your secrets.** The Vault DON stores threshold-encrypted shares across nodes. Secrets are only recombined inside the TEE enclave and discarded after use. This is a fundamental architectural guarantee, not just a policy.

2. **Confidential HTTP makes exactly one API call**, not one per node. This is critical for APIs with rate limits, paid tiers, or non-idempotent operations (like payments). Regular HTTP calls once per DON node.

3. **Response encryption is optional but powerful.** Setting `encrypt_output: true` with the reserved AES key name causes the enclave to encrypt the response before CRE nodes see it. The intended pattern is: encrypt in enclave, forward ciphertext through CRE workflow, decrypt only in your backend.

4. **Private transactions are NOT zero-knowledge proofs.** The privacy comes from the off-chain enclave holding the state. The on-chain Vault contract only sees deposits and withdrawals -- not the private transfers between them. This is a different trust model than ZK-based privacy (like Tornado Cash or Aztec).

5. **Shielded addresses break the sender-receiver link.** Even when withdrawing, the amount withdrawn can differ from the amount transferred, making it impossible for external observers to correlate deposits with withdrawals.

6. **Tickets are single-use and critical.** The withdrawal ticket is a one-time cryptographic authorization from the enclave. If you lose it, the balance is still debited -- you cannot regenerate it. Applications must handle ticket storage carefully.

7. **ACE (Automated Compliance Engine) is mandatory for private transactions.** Every token registered in the Vault must have a policy. This is by design -- Chainlink is positioning this for institutional/regulatory use, not anonymous transfers.

8. **The enclave is the trust anchor.** Both features rely on TEEs. The security assumption is that the enclave hardware (e.g., Intel SGX, AMD SEV) correctly isolates execution. This is a hardware trust assumption, not a cryptographic one.

9. **Everything is CRE-native.** Both capabilities are CRE workflow capabilities. The private transaction APIs can be called from CRE workflows using the HTTP (or Confidential HTTP) capability, making it possible to build complex multi-step private workflows.

10. **Confidential Compute is still being built.** What's available for the hackathon is early access. The full vision includes general-purpose private compute (arbitrary computation inside enclaves), not just HTTP calls and token transfers.
