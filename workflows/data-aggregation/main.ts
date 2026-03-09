import {
  HTTPCapability,
  handler,
  type Runtime,
  type HTTPPayload,
  Runner,
  EVMClient,
  HTTPClient,
  decodeJson,
  text,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import {
  aggregateDemographics,
  aggregateConditions,
  aggregateOutcomes,
  type AggregationRecord,
} from "./utils";
import { unwrapKeyFromMarketplace, decryptBlob } from "../utils";

type Config = {
  dataMarketplaceAddress: string;
  healthRecordRegistryAddress: string;
  pinataGatewayUrl: string;
};

type RequestPayload = {
  endpoint: "demographics" | "conditions" | "outcomes";
  queryId: number;
};

type EncryptedBlob = {
  v: 1;
  iv: number[];
  ct: number[];
  alg: "AES-256-GCM";
};

/**
 * data-aggregation workflow
 *
 * HTTP Trigger → EVM Read (contributors + keys) → IPFS fetch → AES decrypt → aggregate
 *
 * Called by /api/data/[endpoint] when CRE_DATA_AGGREGATION_URL is set.
 * Runs inside a CRE TEE — raw patient data never leaves the enclave.
 */
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Record<string, never> => {
  const body = decodeJson(payload.input) as RequestPayload;
  runtime.log(
    `data-aggregation: endpoint=${body.endpoint} queryId=${body.queryId}`,
  );

  // Load CRE private key from secrets vault
  const privKeyB64 = runtime
    .getSecret({ id: "CRE_MARKETPLACE_PRIVATE_KEY" })
    .result().value;

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );
  const httpClient = new HTTPClient();

  // --- Step 1: Get active contributors from DataMarketplace ---
  const getContributors = evmClient.callContract(
    runtime,
    {
      to: runtime.config.dataMarketplaceAddress as `0x${string}`,
      data: "0x806f5a5c", // getActiveContributors() selector
    },
    consensusIdenticalAggregation<string>(),
  );

  const contributorsRaw = getContributors().result();
  // ABI-decode address[] — skip first 64 bytes (offset + length), then 20-byte addresses
  const contributors: string[] = [];
  try {
    // contributorsRaw is hex-encoded ABI output
    const hex = contributorsRaw.startsWith("0x")
      ? contributorsRaw.slice(2)
      : contributorsRaw;
    const arrayLen = parseInt(hex.slice(64, 128), 16);
    for (let i = 0; i < arrayLen; i++) {
      const addrHex = hex.slice(128 + i * 64 + 24, 128 + i * 64 + 64);
      contributors.push(`0x${addrHex}`);
    }
  } catch {
    runtime.log("Failed to decode contributors list");
  }

  runtime.log(`Found ${contributors.length} active contributors`);

  const records: AggregationRecord[] = [];

  for (const patient of contributors) {
    // --- Step 2a: Get wrapped marketplace key ---
    const getKeySelector = "0x49d5fb72"; // getMarketplaceKey(address) selector
    const paddedAddr = patient.slice(2).padStart(64, "0");

    const getKey = evmClient.callContract(
      runtime,
      {
        to: runtime.config.dataMarketplaceAddress as `0x${string}`,
        data: `0x${getKeySelector.slice(2)}${paddedAddr}` as `0x${string}`,
      },
      consensusIdenticalAggregation<string>(),
    );

    const keyRaw = getKey().result();

    // Skip patients who haven't registered a marketplace key
    if (!keyRaw || keyRaw === "0x" || keyRaw.length < 10) {
      runtime.log(`Patient ${patient}: no marketplace key — skipping`);
      continue;
    }

    // Decode bytes from ABI: skip offset (32) + length (32) → raw bytes
    let wrappedBundle: string;
    try {
      const hex = keyRaw.startsWith("0x") ? keyRaw.slice(2) : keyRaw;
      const byteLen = parseInt(hex.slice(64, 128), 16);
      const bytesHex = hex.slice(128, 128 + byteLen * 2);
      // bytes on-chain are UTF-8 of the base64 bundle string
      const bytes = Uint8Array.from(
        bytesHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)),
      );
      wrappedBundle = new TextDecoder().decode(bytes);
    } catch {
      runtime.log(
        `Patient ${patient}: failed to decode wrapped key — skipping`,
      );
      continue;
    }

    // --- Step 2b: Unwrap the AES key (ECDH + AES-GCM via noble) ---
    let dataKey: Uint8Array;
    try {
      dataKey = unwrapKeyFromMarketplace(wrappedBundle, privKeyB64);
    } catch {
      runtime.log(`Patient ${patient}: key unwrap failed — skipping`);
      continue;
    }

    // --- Step 2c: Get record IDs from HealthRecordRegistry ---
    const getRecordsSelector = "0x3aabf8b6"; // getPatientRecords(address) selector
    const getRecords = evmClient.callContract(
      runtime,
      {
        to: runtime.config.healthRecordRegistryAddress as `0x${string}`,
        data: `0x${getRecordsSelector.slice(2)}${paddedAddr}` as `0x${string}`,
      },
      consensusIdenticalAggregation<string>(),
    );

    const recordsRaw = getRecords().result();
    const recordIds: number[] = [];
    try {
      const hex = recordsRaw.startsWith("0x")
        ? recordsRaw.slice(2)
        : recordsRaw;
      const arrayLen = parseInt(hex.slice(64, 128), 16);
      for (let i = 0; i < arrayLen; i++) {
        recordIds.push(
          parseInt(hex.slice(128 + i * 64, 128 + i * 64 + 64), 16),
        );
      }
    } catch {
      runtime.log(`Patient ${patient}: failed to decode record IDs`);
      continue;
    }

    // --- Step 2d-e: Fetch + decrypt each IPFS record ---
    for (const recordId of recordIds) {
      // Get record CID from registry
      const getRecordSelector = "0x8f90e575"; // getRecord(uint256) selector
      const paddedId = recordId.toString(16).padStart(64, "0");
      const getRecord = evmClient.callContract(
        runtime,
        {
          to: runtime.config.healthRecordRegistryAddress as `0x${string}`,
          data: `0x${getRecordSelector.slice(2)}${paddedId}` as `0x${string}`,
        },
        consensusIdenticalAggregation<string>(),
      );

      const recordRaw = getRecord().result();

      // Parse CID from ABI-decoded tuple (first string field)
      let ipfsCid: string;
      let recordType: string;
      try {
        // Simplified: extract first string from ABI tuple
        const hex = recordRaw.startsWith("0x") ? recordRaw.slice(2) : recordRaw;
        // tuple offset at position 0 → string offset at that offset
        const strOffset = parseInt(hex.slice(0, 64), 16) * 2;
        const strLen = parseInt(hex.slice(strOffset, strOffset + 64), 16);
        const strHex = hex.slice(strOffset + 64, strOffset + 64 + strLen * 2);
        ipfsCid = Buffer.from(strHex, "hex").toString("utf8");
        // recordType is the second uint8 in the tuple
        recordType = parseInt(hex.slice(64, 128), 16).toString();
      } catch {
        runtime.log(`Record ${recordId}: failed to parse CID — skipping`);
        continue;
      }

      if (!ipfsCid) continue;

      // Fetch encrypted blob from IPFS via Pinata gateway
      const fetchBlob = httpClient.sendRequest(
        runtime,
        (sender) => {
          const resp = sender
            .sendRequest({
              url: `${runtime.config.pinataGatewayUrl}/ipfs/${ipfsCid}`,
              method: "GET",
              // @ts-ignore
              headers: { "content-type": "application/json" },
            })
            .result();
          return text(resp);
        },
        consensusIdenticalAggregation<string>(),
      );

      const blobStr = fetchBlob().result();

      let formData: Record<string, string>;
      try {
        const blob = JSON.parse(blobStr) as EncryptedBlob;

        // Decrypt inside TEE
        const plaintextJson = decryptBlob(blob, dataKey);
        const parsed = JSON.parse(plaintextJson) as {
          formData?: Record<string, string>;
          templateType?: string;
        };
        if (!parsed.formData) continue;
        formData = parsed.formData;

        records.push({
          patientAddress: patient,
          recordType,
          templateType: parsed.templateType ?? "unknown",
          formData,
        });
      } catch {
        runtime.log(`Record ${recordId}: decrypt/parse failed — skipping`);
        continue;
      }
    }
  }

  runtime.log(`Aggregating ${records.length} decrypted records`);

  let result: unknown;
  if (body.endpoint === "demographics") {
    result = aggregateDemographics(records);
  } else if (body.endpoint === "conditions") {
    result = aggregateConditions(records);
  } else if (body.endpoint === "outcomes") {
    result = aggregateOutcomes(records);
  } else {
    result = { error: "Unknown endpoint" };
  }

  // Return result as HTTP response body (HTTP Trigger pattern)
  runtime.log(`Result: ${JSON.stringify(result)}`);

  // The CRE HTTP trigger returns the result via the payload response mechanism
  // The calling API route reads it from the workflow's HTTP response
  (payload as unknown as { response: unknown }).response = result;

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
