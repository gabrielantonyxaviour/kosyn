#!/usr/bin/env node
/**
 * Generate a P-256 ECDH keypair for the CRE marketplace key escrow system.
 *
 * Usage:
 *   node frontend/scripts/gen-marketplace-keypair.mjs
 *
 * Copy the output into .env.local:
 *   NEXT_PUBLIC_CRE_MARKETPLACE_PUBKEY=<base64 JWK of public key>
 *   CRE_MARKETPLACE_PRIVATE_KEY=<base64 JWK of private key>
 *
 * The private key must also be set as a CRE secrets vault secret named
 * CRE_MARKETPLACE_PRIVATE_KEY in workflows/secrets.yaml.
 */

const { subtle } = globalThis.crypto;

const keypair = await subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveKey"],
);

const pubJwk = await subtle.exportKey("jwk", keypair.publicKey);
const privJwk = await subtle.exportKey("jwk", keypair.privateKey);

const pubB64 = Buffer.from(JSON.stringify(pubJwk)).toString("base64");
const privB64 = Buffer.from(JSON.stringify(privJwk)).toString("base64");

console.log("# Paste into frontend/.env.local:");
console.log(`NEXT_PUBLIC_CRE_MARKETPLACE_PUBKEY=${pubB64}`);
console.log(`CRE_MARKETPLACE_PRIVATE_KEY=${privB64}`);
console.log("");
console.log("# Also set CRE_MARKETPLACE_PRIVATE_KEY in workflows/secrets.yaml");
console.log("# under the data-aggregation workflow secret.");
