"use client";

import {
  createThirdwebClient,
  defineChain,
  type ThirdwebClient,
} from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";

let _client: ThirdwebClient | null = null;

export const chain = defineChain({
  id: 43113,
  rpc:
    process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ||
    "https://api.avax-test.network/ext/bc/C/rpc",
}); // Avalanche Fuji

export function getClient(): ThirdwebClient {
  if (!_client) {
    _client = createThirdwebClient({
      clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "placeholder",
    });
  }
  return _client;
}

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "placeholder",
});

export const patientWallet = inAppWallet({
  auth: {
    options: ["email", "google", "apple", "passkey"],
  },
  smartAccount: {
    chain,
    sponsorGas: true,
  },
});

export const providerWallet = createWallet("io.metamask");
