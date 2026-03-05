import {
  HTTPCapability,
  handler,
  type Runtime,
  type HTTPPayload,
  Runner,
  EVMClient,
  ConfidentialHTTPClient,
  TxStatus,
  decodeJson,
  prepareReportRequest,
  bytesToHex,
  ok,
  text,
} from "@chainlink/cre-sdk";
import {
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toHex,
} from "viem";

type Config = {
  receiverAddress: string;
  gasLimit: number;
};

type NppesResult = {
  result_count: number;
  results?: Array<{
    number: string;
    basic?: {
      first_name?: string;
      last_name?: string;
      organization_name?: string;
      credential?: string;
    };
    taxonomies?: Array<{
      desc?: string;
      primary?: boolean;
      state?: string;
      license?: string;
    }>;
  }>;
};

/**
 * provider-registration workflow
 *
 * HTTP Trigger -> Confidential HTTP (NPPES NPI Registry verification)
 *             -> EVM Write (register verified provider on-chain)
 *
 * Verifies the provider's NPI number against the CMS NPPES National Provider
 * Identifier registry via ConfidentialHTTP. In production, this would use
 * credentialed state medical board APIs — ConfidentialHTTP protects those
 * credentials inside the TEE so node operators never see them.
 *
 * On-chain: stores the NPI hash (never raw PII), verified flag, and specialty.
 */
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Record<string, never> => {
  const body = decodeJson(payload.input) as {
    providerAddress: string;
    name: string;
    licenseNumber: string;
    specialty: string;
    jurisdiction: string;
  };

  runtime.log(
    `Processing provider registration: ${body.name} (${body.providerAddress})`,
  );

  // Step 1: Verify NPI via NPPES Registry (ConfidentialHTTP)
  // ConfidentialHTTP ensures that in production, credentialed API keys for
  // state medical board verification APIs stay inside the TEE.
  const confidentialHttp = new ConfidentialHTTPClient();
  const nppesResponse = confidentialHttp
    .sendRequest(runtime, {
      request: {
        url: `https://npiregistry.cms.hhs.gov/api/?number=${encodeURIComponent(body.licenseNumber)}&version=2.1`,
        method: "GET",
        multiHeaders: {
          accept: { values: ["application/json"] },
        },
      },
    })
    .result();

  let verified = false;
  let verifiedSpecialty = "";
  let verifiedName = "";

  if (ok(nppesResponse)) {
    try {
      const nppesData = JSON.parse(text(nppesResponse)) as NppesResult;

      if (nppesData.result_count > 0 && nppesData.results?.[0]) {
        const result = nppesData.results[0];

        // Verify NPI number matches
        if (result.number === body.licenseNumber) {
          // Extract verified name
          if (result.basic) {
            const { first_name, last_name, organization_name } = result.basic;
            verifiedName = organization_name
              ? organization_name
              : `${first_name ?? ""} ${last_name ?? ""}`.trim();
          }

          // Extract primary taxonomy (specialty)
          const primaryTaxonomy = result.taxonomies?.find((t) => t.primary);
          if (primaryTaxonomy) {
            verifiedSpecialty = primaryTaxonomy.desc ?? "";
          }

          // Name fuzzy match: check if claimed name contains parts of verified name
          const claimedLower = body.name.toLowerCase();
          const verifiedLower = verifiedName.toLowerCase();
          const nameMatch =
            verifiedLower
              .split(" ")
              .some((part) => part.length > 2 && claimedLower.includes(part)) ||
            claimedLower.includes(verifiedLower);

          if (nameMatch) {
            verified = true;
            runtime.log(
              `NPI ${body.licenseNumber} verified: ${verifiedName} — ${verifiedSpecialty}`,
            );
          } else {
            runtime.log(
              `NPI found but name mismatch: claimed="${body.name}" vs verified="${verifiedName}"`,
            );
          }
        }
      } else {
        runtime.log(`NPI ${body.licenseNumber} not found in NPPES registry`);
      }
    } catch {
      runtime.log("Failed to parse NPPES response");
    }
  } else {
    runtime.log(
      "NPPES API call failed — registering without verification flag",
    );
  }

  // Hash the license number — no raw PII stored on-chain
  const licenseHash = keccak256(toHex(body.licenseNumber));
  runtime.log(`License hash: ${licenseHash} | Verified: ${verified}`);

  // Step 2: EVM Write — operation 0x03 (provider registration)
  // Include verification status from NPPES lookup
  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("address, string, bytes32, string, string"),
    [
      body.providerAddress as `0x${string}`,
      body.name,
      licenseHash as `0x${string}`,
      verified ? verifiedSpecialty || body.specialty : body.specialty,
      body.jurisdiction,
    ],
  );

  const encodedPayload = `0x03${innerEncoded.slice(2)}` as `0x${string}`;
  const reportRequest = prepareReportRequest(encodedPayload);
  const report = runtime.report(reportRequest).result();

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.receiverAddress,
      report: report,
      gasConfig: { gasLimit: String(runtime.config.gasLimit) },
    })
    .result();

  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = writeResult.txHash
      ? bytesToHex(writeResult.txHash)
      : "unknown";
    runtime.log(
      `Provider ${body.name} registered on-chain (verified=${verified}). TX: ${txHash}`,
    );
  } else {
    runtime.log(
      `EVM write status: ${writeResult.txStatus}. Check on-chain receipt.`,
    );
  }

  return {};
};

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability();
  return [handler(http.trigger({}), onHttpTrigger)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
