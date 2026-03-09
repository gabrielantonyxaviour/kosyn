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
import {
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toHex,
} from "viem";
import { buildClinicalMessages } from "./claude-prompt";
import {
  stringToBase64,
  parseNillionResponseWithProof,
  decryptInTee,
} from "../utils";

type Config = {
  receiverAddress: string;
  gasLimit: number;
  nillionBaseUrl: string;
  nillionModel: string;
};

/**
 * consultation-processing workflow
 *
 * HTTP Trigger -> TEE Decrypt (encrypted transcript → plaintext inside enclave)
 *             -> Confidential HTTP (Nillion nilAI — API key protected in TEE)
 *             -> HTTP Client (IPFS upload)
 *             -> EVM Write
 *
 * The transcript is encrypted client-side (ECDH + AES-256-GCM) before being sent
 * to the CRE workflow. Decryption happens exclusively inside the TEE using the
 * CRE's private key — node operators never see plaintext transcript data.
 *
 * The Nillion API key is also protected via ConfidentialHTTP.
 * The raw transcript is NOT stored permanently — only its hash and the
 * AI-generated SOAP note are stored on IPFS.
 */
const onHttpTrigger = async (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Promise<Record<string, never>> => {
  const body = decodeJson(payload.input) as {
    patientAddress: string;
    encryptedTranscript: string;
    consultationId: string;
  };

  if (
    !body.patientAddress ||
    !body.encryptedTranscript ||
    !body.consultationId
  ) {
    throw new Error(
      `Missing required fields: patientAddress=${!!body.patientAddress}, encryptedTranscript=${!!body.encryptedTranscript}, consultationId=${!!body.consultationId}`,
    );
  }

  runtime.log(
    `Processing consultation ${body.consultationId} for patient: ${body.patientAddress}`,
  );

  // Capture secrets and config outside callbacks (required by CRE runtime)
  const nillionBaseUrl = runtime.config.nillionBaseUrl;
  const nillionModel = runtime.config.nillionModel;
  const nillionApiKey = runtime
    .getSecret({ id: "NILLION_API_KEY" })
    .result().value;
  const pinataJwt = runtime.getSecret({ id: "PINATA_JWT" }).result().value;
  const crePrivKey = runtime
    .getSecret({ id: "CRE_MARKETPLACE_PRIVATE_KEY" })
    .result().value;

  // Step 1: Decrypt transcript inside TEE
  // The transcript was encrypted client-side with ECDH (ephemeral key + CRE public key)
  // + AES-256-GCM. Only the CRE TEE can decrypt it using the private key.
  const transcript = decryptInTee(body.encryptedTranscript, crePrivKey);

  runtime.log(
    "Transcript decrypted inside TEE — plaintext never leaves enclave",
  );

  // Step 2: Confidential HTTP — AI analysis with Nillion nilAI inside TEE
  // The Nillion API key is injected as a secret — node operators never see it.
  // Response includes cryptographic proof that inference ran inside AMD SEV-SNP + NVIDIA CC enclave.
  const messages = buildClinicalMessages(transcript);
  const nillionBody = JSON.stringify({
    model: nillionModel,
    messages,
    temperature: 0.2,
    stream: false,
  });

  const confidentialHttp = new ConfidentialHTTPClient();
  const nillionResponse = confidentialHttp
    .sendRequest(runtime, {
      request: {
        url: `${nillionBaseUrl}/v1/chat/completions`,
        method: "POST",
        bodyString: nillionBody,
        multiHeaders: {
          "content-type": { values: ["application/json"] },
          authorization: { values: [`Bearer ${nillionApiKey}`] },
        },
      },
    })
    .result();

  if (!ok(nillionResponse)) {
    throw new Error("Nillion nilAI analysis failed");
  }

  const nillionRaw = text(nillionResponse);
  const { text: aiAnalysis, proof: nillionProof } =
    parseNillionResponseWithProof(nillionRaw);
  runtime.log("AI clinical analysis complete");

  // Hash the transcript for audit trail (raw transcript is never stored)
  const transcriptHash = keccak256(toHex(transcript));

  // Step 3: HTTP Client — upload to IPFS via Pinata
  const uploadBody = JSON.stringify({
    pinataContent: {
      transcriptHash,
      aiAnalysis,
      ...(nillionProof ? { nillionProof } : {}),
      consultationId: body.consultationId,
      patient: body.patientAddress,
      timestamp: Math.floor(Date.now() / 1000),
    },
    pinataMetadata: {
      name: `kosyn-consultation-${body.consultationId}`,
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
          // @ts-ignore - deprecated headers field for plain string auth
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${pinataJwt}`,
          },
          body: stringToBase64(uploadBody),
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
  runtime.log(`Consultation stored on IPFS: ${ipfsCid}`);

  // Step 4: EVM Write — operation 0x00 (record upload, recordType=1 for consultation)
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const recordType = 1;

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
    runtime.log(`Consultation recorded on-chain. TX: ${txHash}`);
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
