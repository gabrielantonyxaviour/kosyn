import {
  HTTPCapability,
  handler,
  type Runtime,
  type HTTPPayload,
  Runner,
  EVMClient,
  ConfidentialHTTPClient,
  HTTPClient,
  TxStatus,
  decodeJson,
  prepareReportRequest,
  bytesToHex,
  ok,
  text,
  consensusIdenticalAggregation,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { stringToBase64, parseClaudeResponse } from "../utils";

type Config = {
  receiverAddress: string;
  gasLimit: number;
  claudeServiceUrl: string;
  claudeModel: string;
};

/**
 * patient-ai-attest workflow
 *
 * HTTP Trigger -> Confidential HTTP (Claude Service — API key protected in TEE)
 *             -> HTTP Client (IPFS upload)
 *             -> EVM Write (recordType=4, AI session attestation)
 *
 * Generates a de-identified attestation of the patient's AI chat session
 * and anchors it on-chain via HealthRecordRegistry.
 */
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Record<string, never> => {
  const body = decodeJson(payload.input) as {
    patientAddress: string;
    sessionSummary: string;
  };

  runtime.log(
    `Processing AI session attestation for patient: ${body.patientAddress}`,
  );

  const claudeServiceUrl = runtime.config.claudeServiceUrl;
  const claudeModel = runtime.config.claudeModel;
  const claudeApiKey = runtime
    .getSecret({ id: "CLAUDE_SERVICE_API_KEY" })
    .result().value;
  const pinataJwt = runtime.getSecret({ id: "PINATA_JWT" }).result().value;

  // ConfidentialHTTP: Generate de-identified attestation via Claude Service (API key in TEE)
  const prompt = `You are a HIPAA compliance assistant. Generate a concise, de-identified attestation statement (1-2 sentences) for the following patient AI session. Remove any PHI. Output ONLY the attestation text.\n\nSession summary: ${body.sessionSummary}`;
  const claudeBody = JSON.stringify({ prompt, model: claudeModel });

  const confidentialHttp = new ConfidentialHTTPClient();
  const claudeResponse = confidentialHttp
    .sendRequest(runtime, {
      request: {
        url: `${claudeServiceUrl}/chat`,
        method: "POST",
        bodyString: claudeBody,
        multiHeaders: {
          "content-type": { values: ["application/json"] },
          "x-api-key": { values: [claudeApiKey] },
        },
      },
    })
    .result();

  if (!ok(claudeResponse)) {
    throw new Error("Claude Service attestation generation failed");
  }

  const attestationText = parseClaudeResponse(text(claudeResponse));
  runtime.log("Attestation text generated inside TEE");

  // HTTP Client: store attestation on IPFS via Pinata
  const ipfsBody = JSON.stringify({
    pinataContent: {
      attestation: attestationText,
      patient: body.patientAddress,
      sessionSummary: body.sessionSummary,
      timestamp: Math.floor(Date.now() / 1000),
    },
    pinataMetadata: {
      name: `kosyn-ai-attest-${body.patientAddress}-${Date.now()}`,
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
          body: stringToBase64(ipfsBody),
          cacheSettings: { store: true, maxAge: "60s" },
        })
        .result();
      return text(resp);
    },
    consensusIdenticalAggregation<string>(),
  );

  const uploadResponseText = doUpload().result();
  const parsed = JSON.parse(uploadResponseText) as { IpfsHash: string };
  const ipfsCid = parsed.IpfsHash;
  runtime.log(`Attestation stored on IPFS: ${ipfsCid}`);

  // EVM Write: recordType=4 (AI session attestation), same operation as record upload (0x00)
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const recordType = 4;

  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("string, uint8, uint256, address"),
    [ipfsCid, recordType, timestamp, body.patientAddress as `0x${string}`],
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
    runtime.log(`Attestation recorded on-chain. TX: ${txHash}`);
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
