/**
 * Gas sponsorship smoke test
 * Wraps PRIVATE_KEY in a smartWallet (sponsorGas: true) and sends a 0-value tx on Fuji.
 * Success = Thirdweb paymaster is active for Avalanche Fuji.
 *
 * Run: node scripts/test-gas-sponsorship.mjs
 */
import { createThirdwebClient, prepareTransaction, sendTransaction, defineChain } from "thirdweb";
import { privateKeyToAccount, smartWallet } from "thirdweb/wallets";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
const envPath = resolve(__dirname, "../.env.local");
const env = {};
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq === -1 || line.startsWith("#")) continue;
  const key = line.slice(0, eq).trim();
  const val = line.slice(eq + 1).trim();
  if (key) env[key] = val;
}

const SECRET_KEY = env.THIRDWEB_SECRET_KEY;
const PRIVATE_KEY = env.PRIVATE_KEY;

if (!SECRET_KEY || !PRIVATE_KEY) {
  console.error("!! Missing THIRDWEB_SECRET_KEY or PRIVATE_KEY in .env.local");
  process.exit(1);
}

const chain = defineChain(43113); // Avalanche Fuji

const client = createThirdwebClient({ secretKey: SECRET_KEY });

const personalAccount = privateKeyToAccount({ client, privateKey: PRIVATE_KEY });
console.log("EOA (owner):", personalAccount.address);

const wallet = smartWallet({ chain, sponsorGas: true });

console.log("Connecting smart account...");
const account = await wallet.connect({ client, personalAccount });
console.log("Smart account:", account.address);

console.log("Sending 0-value tx to self (gas sponsored)...");
const tx = prepareTransaction({ to: account.address, value: 0n, chain, client });

try {
  const receipt = await sendTransaction({ account, transaction: tx });
  console.log("");
  console.log("Gas sponsorship is ACTIVE on Avalanche Fuji.");
  console.log("Tx hash:", receipt.transactionHash);
  console.log("Explorer: https://testnet.snowtrace.io/tx/" + receipt.transactionHash);
} catch (err) {
  console.error("");
  console.error("!! Transaction failed — gas sponsorship may not be enabled.");
  console.error("   Enable it at: https://thirdweb.com/dashboard -> your project -> Account Abstraction -> Sponsored Transactions");
  console.error("   Error:", err.message);
  process.exit(1);
}
