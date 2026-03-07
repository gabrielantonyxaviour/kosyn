/**
 * Server-side utility: query DataMarketplace on Fuji for opted-in contributors.
 * Uses raw JSON-RPC (same pattern as x402.ts) — no thirdweb, no client-side code.
 */

const MARKETPLACE = (
  process.env.NEXT_PUBLIC_DATA_MARKETPLACE ||
  "0x0000000000000000000000000000000000000000"
).toLowerCase();

const RPC_URL =
  process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";

// ABI-decode a dynamic address[] from an eth_call result.
// Layout: offset (32 bytes) | length (32 bytes) | address padded (32 bytes each)
function decodeAddressArray(hex: string): string[] {
  // strip 0x
  const data = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (data.length < 128) return [];

  // word at offset 0x20 = array length
  const lenHex = data.slice(64, 128);
  const len = parseInt(lenHex, 16);
  if (len === 0) return [];

  const result: string[] = [];
  for (let i = 0; i < len; i++) {
    const wordStart = 128 + i * 64;
    const wordHex = data.slice(wordStart, wordStart + 64);
    // address is the last 40 hex chars (20 bytes)
    const addr = "0x" + wordHex.slice(24).toLowerCase();
    result.push(addr);
  }
  return result;
}

/**
 * Returns lowercase addresses of all patients who have called
 * DataMarketplace.listData() and are currently active contributors.
 */
export async function getOnChainContributors(): Promise<string[]> {
  if (MARKETPLACE === "0x0000000000000000000000000000000000000000") {
    return [];
  }

  try {
    const resp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: MARKETPLACE,
            // getActiveContributors() selector = 0xbe4c1e1f
            data: "0xbe4c1e1f",
          },
          "latest",
        ],
      }),
    });

    const json = (await resp.json()) as { result?: string; error?: unknown };
    if (!json.result || json.result === "0x") return [];

    return decodeAddressArray(json.result);
  } catch {
    return [];
  }
}

/**
 * Convenience: returns a Set of lowercase contributor addresses.
 */
export async function getContributorSet(): Promise<Set<string>> {
  const contributors = await getOnChainContributors();
  return new Set(contributors.map((a) => a.toLowerCase()));
}
