import {
  HTTPCapability,
  handler,
  type Runtime,
  type HTTPPayload,
  Runner,
  EVMClient,
  HTTPClient,
  TxStatus,
  decodeJson,
  prepareReportRequest,
  bytesToHex,
  text,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { stringToBase64 } from "../utils";

type Config = {
  receiverAddress: string;
  gasLimit: number;
  pinataGateway: string;
};

/**
 * record-upload workflow
 *
 * HTTP Trigger -> HTTP Client (IPFS upload) -> EVM Write
 *
 * Encryption is performed CLIENT-SIDE (browser) using AES-256-GCM with a key
 * derived from the patient's passkey via WebAuthn PRF before this workflow runs.
 * This workflow receives an already-encrypted blob and handles on-chain logistics.
 */
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Record<string, never> => {
  const body = decodeJson(payload.input) as {
    patientAddress: string;
    recordType: number;
    encryptedData: string; // JSON-encoded EncryptedBlob from client-side AES-256-GCM
  };

  if (!body.patientAddress || !body.encryptedData) {
    throw new Error(
      `Missing required fields: patientAddress=${body.patientAddress}, encryptedData=${!!body.encryptedData}`,
    );
  }

  runtime.log(
    `Processing record upload for patient: ${body.patientAddress}, type: ${body.recordType}`,
  );

  const pinataJwt = runtime.getSecret({ id: "PINATA_JWT" }).result().value;

  // HTTP Call: upload encrypted blob to IPFS via Pinata (JWT Bearer auth)
  const pinataBody = JSON.stringify({
    pinataContent: {
      encrypted: body.encryptedData,
      patient: body.patientAddress,
      recordType: body.recordType,
      timestamp: Math.floor(Date.now() / 1000),
    },
    pinataMetadata: {
      name: `kosyn-record-${body.patientAddress}-${Date.now()}`,
    },
  });

  const httpClient = new HTTPClient();
  const doUpload = httpClient.sendRequest(
    runtime,
    (sender) => {
      const resp = sender
        .sendRequest({
          url: `https://api.pinata.cloud/pinning/pinJSONToIPFS?ts=${Date.now()}`,
          method: "POST",
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - using deprecated headers field for plain string auth
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${pinataJwt}`,
          },
          body: stringToBase64(pinataBody),
          cacheSettings: { store: true, maxAge: "60s" },
        })
        .result();
      return text(resp);
    },
    consensusIdenticalAggregation<string>(),
  );

  const ipfsResponseText = doUpload().result();
  const parsed = JSON.parse(ipfsResponseText) as { IpfsHash: string };
  const ipfsCid = parsed.IpfsHash;
  runtime.log(`Uploaded to IPFS: ${ipfsCid}`);

  // EVM Write: encode report (operation 0x00) and write to HealthRecordRegistry
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("string, uint8, uint256, address"),
    [ipfsCid, body.recordType, timestamp, body.patientAddress as `0x${string}`],
  );

  const encodedPayload = `0x00${innerEncoded.slice(2)}` as `0x${string}`;
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
    runtime.log(`Record uploaded on-chain. TX: ${txHash}`);
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
