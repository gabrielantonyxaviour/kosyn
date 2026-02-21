# Workshop 08: Build with Thirdweb

## Overview

- **Presenter:** Aman (Iman) Dell, Head of Solutions at Thirdweb
- **Host:** Sophia (Chainlink team)
- **Context:** Chainlink Convergence Hackathon workshop series (final workshop)
- **Topic:** Building web3 applications using Thirdweb's full-stack developer platform
- **Live Demo:** playground.thirdweb.com

---

## Thirdweb Platform

Thirdweb is a **full-stack web3 developer platform** providing pre-built components, SDKs, APIs, and infrastructure for building onchain applications. The platform operates on a "pick and choose" model -- developers can use the entire suite or select individual components as needed.

### Core Value Proposition
- Pre-built, pluggable React components (copy-paste integration)
- Lower-level SDKs and APIs for custom implementations
- Metered pricing model (pay for what you use)
- Free to start -- only requires an email to sign up
- Supports any EVM chain

### Platform Entry Point
1. Sign up at thirdweb.com
2. Create a project (generates API keys)
3. A **project wallet** (server wallet) is automatically created per project
4. Start integrating components or using APIs

---

## Integration with Chainlink

Thirdweb and Chainlink are **complementary layers** in a web3 stack:

| Layer | Chainlink | Thirdweb |
|-------|-----------|----------|
| **Data** | Price feeds, CCIP, VRF, Functions, Automation | -- |
| **Onchain Logic** | Smart contracts consuming Chainlink services | Contract deployment, token launchpad |
| **User-Facing** | -- | Connect button, wallets, bridge, checkout, payments |
| **Backend** | -- | Server wallets, gas sponsorship, transaction orchestration |
| **AI** | -- | Nebula (blockchain-native LLM) |

Chainlink provides the **onchain data and cross-chain infrastructure**, while Thirdweb provides the **application layer** (wallets, UX components, payments, backend orchestration). Together they cover the full stack for a hackathon submission.

---

## Technical Walkthrough

### 1. Connect Button (User Wallets)

A configurable authentication modal supporting multiple login methods.

**Supported Sign-in Methods:**
- Email, phone, social logins (Google, Apple, etc.)
- Farcaster, Discord (optional, can be toggled)
- Third-party EOA wallets (MetaMask, etc.)

**Features:**
- Fully customizable styling (title, icon, colors, theme)
- Built-in wallet management modal (send, receive, buy/top-up)
- Cross-chain token swaps within the wallet modal
- Fiat on-ramp support (credit/debit card to crypto)
- In-app wallets created automatically for social login users

**Code Example (React):**
```jsx
// Copy-paste the component from playground.thirdweb.com
// Configure login methods, styling, and supported wallets
// The component renders a full authentication + wallet modal
<ConnectButton
  loginMethods={["email", "google", "apple"]}
  wallets={["metamask", "walletconnect"]}
  theme={{ primaryColor: "#your-color" }}
  title="My Hackathon App"
/>
```

### 2. Server Wallets (Backend Wallets)

Wallets controlled by your application backend for automated/programmatic transactions.

**Key Characteristics:**
- Created per project (project wallet auto-generated)
- Can create additional server wallets
- Perform transactions across **any chain**
- Support multiple execution modes:
  - **EIP-7702** -- auto-detected, uses 7702 protocol for transaction execution
  - **EIP-4337** -- smart account abstraction (each wallet has an associated smart account)
  - **Traditional EOA** -- fund the wallet, send transactions directly

**Use Cases:**
- Execute transactions on behalf of users (backend-initiated)
- AI agent wallets (auto-execute mode)
- Payment processing (seller wallet for checkout)
- Gasless transaction sponsorship

**API Usage:**
```
// Write to a smart contract using server wallet
POST /api/server-wallet/write
{
  "contractAddress": "0x...",
  "functionName": "transfer",
  "args": [...],
  "executionMode": "7702"  // auto-detects and uses appropriate protocol
}
```

### 3. Bridge / Swap Widget

A pre-built widget for cross-chain token bridging and swapping.

**Features:**
- Bridge tokens between any supported EVM chains
- Swap between different tokens
- Configurable source and destination chains/tokens
- User connects their wallet (e.g., MetaMask) to execute

**Example Use Case:**
- App accepts USDC on Polygon
- User holds USDC on Base
- Bridge widget handles the cross-chain swap automatically

### 4. Checkout Widget

A payment component for accepting crypto (and fiat) payments for products/services.

**Configuration:**
- Select accepted token (e.g., USDC)
- Set price
- Set **seller address** (where funds are sent)
- Webhook notification on confirmed payment

**Payment Methods:**
- Crypto payments (any supported token/chain)
- Fiat on-ramp (credit/debit card converted to crypto, then sent to seller)

**Customization:**
- Product name, image, description
- Fully styled component

**Code Example (React):**
```jsx
<CheckoutWidget
  token="USDC"
  price={5}
  sellerAddress="0x..."
  productName="My Hackathon Product"
  productImage="/product.png"
  paymentMethods={["crypto", "fiat"]}
/>
```

### 5. Token Launchpad

Deploy ERC-20 tokens or ERC-721 NFT collections directly from the Thirdweb dashboard.

**Supported Standards:**
- ERC-20 (fungible tokens)
- ERC-721 (NFT collections)

**How it Works:**
- WYSIWYG wizard in the dashboard
- Deploys contract to any chain
- Deployer wallet = owner of the contract

### 6. x402 (Agentic Commerce / API Paywalls)

Infrastructure for putting crypto paywalls on APIs using the x402 payment protocol.

**How it Works:**
- Server wallet acts as the payment facilitator on the backend
- Enables pay-per-request API access using crypto
- Relevant for agentic commerce (AI agents paying for API access)

### 7. Nebula AI (Blockchain LLM)

A blockchain-specialized LLM with agentic capabilities.

**Capabilities:**
- **Read** blockchain data (contract addresses, token info, transactions)
- **Write** to blockchain (encode and prepare transactions)
- **Execute** transactions (with connected wallet or auto-execute via server wallet)

**Interfaces:**
- Chat interface in Thirdweb dashboard
- **API** for programmatic integration into applications

**Demo Examples:**
```
User: "What is the address of USDC on Base?"
Nebula: [looks up Base chain] → returns smart contract address

User: "Show me the last two transactions on that contract"
Nebula: [fetches transactions] → returns transaction hashes and details

User: "Launch an ERC20 token called Hackathon Token on Base Sepolia"
Nebula: [encodes transaction] → presents connect button → executes deployment
```

**Auto-Execute Mode:**
- For AI agent use cases
- Server wallet acts as the agent wallet
- Transactions are initiated and sent automatically without manual approval
- Ideal for autonomous AI agents that need to transact onchain

---

## Key Features Summary

| Feature | Type | Description |
|---------|------|-------------|
| **In-App Wallets** | User-facing | Social login wallets (email, Google, etc.) with built-in send/receive/buy |
| **Server Wallets** | Backend | Programmatic wallets for backend transaction orchestration |
| **Gas Sponsorship** | Infrastructure | Metered service -- Thirdweb sponsors gas, bills monthly |
| **EIP-7702 Support** | Protocol | Auto-detected execution mode for server wallets |
| **EIP-4337 Support** | Protocol | Smart account abstraction for account abstraction flows |
| **Bridge/Swap** | Widget | Cross-chain token bridging and swapping |
| **Checkout** | Widget | Crypto + fiat payment acceptance with webhook notifications |
| **Token Launchpad** | Dashboard | Deploy ERC-20 and ERC-721 contracts via wizard |
| **x402** | Infrastructure | Crypto paywalls for APIs (agentic commerce) |
| **Nebula AI** | AI/API | Blockchain-native LLM that can read, write, and execute onchain |
| **Playground** | Dev Tool | Live interactive demos at playground.thirdweb.com |

---

## Hackathon Ideas: Thirdweb + Chainlink

| Idea | Chainlink Component | Thirdweb Component |
|------|---------------------|--------------------|
| **Dynamic NFT marketplace** | Price Feeds for dynamic pricing, VRF for randomized traits | Connect button, checkout widget, NFT deployment |
| **Cross-chain DeFi dashboard** | CCIP for cross-chain messaging, Price Feeds | Bridge widget, server wallets for backend ops, in-app wallets |
| **AI trading agent** | Price Feeds, Automation for triggers | Nebula AI for chain interaction, server wallet as agent wallet (auto-execute) |
| **Pay-per-query oracle API** | Functions for off-chain data retrieval | x402 paywall, server wallet as facilitator |
| **RWA tokenization platform** | Price Feeds for asset valuation, Proof of Reserve | Token launchpad for asset tokens, checkout for purchases, gas sponsorship |
| **Automated portfolio rebalancer** | Price Feeds + Automation | Server wallets for executing swaps, bridge widget for cross-chain rebalancing |
| **Agentic commerce marketplace** | CCIP for cross-chain settlement, Functions for external APIs | x402 for API paywalls, Nebula AI for autonomous agents, server wallets |
| **Gasless gaming platform** | VRF for randomness, Automation for game events | In-app wallets (social login), gas sponsorship, token launchpad for in-game currency |

---

## Key Insights

1. **Speed is the priority for hackathons.** Thirdweb's copy-paste components (connect button, checkout, bridge) can save hours of frontend development. Do not build wallet connection or payment flows from scratch.

2. **Two wallet types cover all use cases.** User wallets (in-app, social login) handle user-initiated actions. Server wallets handle backend-initiated actions. Together they cover every transaction workflow.

3. **Gas sponsorship removes a major friction point.** Thirdweb's metered gas sponsorship means you do not need to fund wallets or worry about gas tokens during development or demo. It is billed monthly based on usage.

4. **Nebula AI is a differentiator for AI+blockchain projects.** An LLM that can natively read, write, and execute blockchain transactions via API. Combined with server wallets in auto-execute mode, this enables fully autonomous AI agents.

5. **x402 is purpose-built for agentic commerce.** If your hackathon project involves AI agents paying for API access or services, x402 + server wallets is the infrastructure layer.

6. **EIP-7702 and EIP-4337 are abstracted away.** Server wallets auto-detect the appropriate execution mode. Developers do not need to manually handle protocol differences.

7. **The playground is the best starting point.** Visit playground.thirdweb.com to see live demos of every component, copy code snippets, and test integrations before adding them to your project.

---

## Resources

- **Playground:** playground.thirdweb.com
- **Dashboard:** thirdweb.com (sign up, create project, get API keys)
- **Presenter Contact:** @Amendell on X (DMs open)
- **Support:** In-dashboard support chat (mention you are at the hackathon)
