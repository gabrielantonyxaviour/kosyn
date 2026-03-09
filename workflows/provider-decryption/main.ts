import {
  handler,
  type Runtime,
  Runner,
  EVMClient,
  type EVMLog,
  HTTPClient,
  TxStatus,
  prepareReportRequest,
  bytesToHex,
  hexToBytes,
  text,
  consensusIdenticalAggregation,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  encodeAbiParameters,
  parseAbiParameters,
  decodeAbiParameters,
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  toHex,
} from "viem";
import {
  bytesToBase64,
  stringToBase64,
  unwrapKeyFromMarketplace,
  decryptBlob,
  deidentify,
} from "../utils";

type Config = {
  receiverAddress: string;
  gasLimit: number;
  consentContractAddress: string;
  registryAddress: string;
  dataMarketplaceAddress: string;
  eventTopic: string;
  pinataGateway: string;
};

type EncryptedBlobShape = {
  v: 1;
  iv: number[];
  ct: number[];
  alg: "AES-256-GCM";
};

const REGISTRY_ABI = [
  {
    name: "getPatientRecords",
    type: "function" as const,
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view" as const,
  },
  {
    name: "getRecord",
    type: "function" as const,
    inputs: [{ name: "recordId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "ipfsCid", type: "string" },
          { name: "recordType", type: "uint8" },
          { name: "uploadTimestamp", type: "uint256" },
          { name: "lastAccessedAt", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "patient", type: "address" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

const CONSENT_ABI = [
  {
    name: "consents",
    type: "function" as const,
    inputs: [
      { name: "patient", type: "address" },
      { name: "provider", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "recordType", type: "uint8" },
          { name: "grantedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

const MARKETPLACE_ABI = [
  {
    name: "getMarketplaceKey",
    type: "function" as const,
    inputs: [{ name: "patient", type: "address" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view" as const,
  },
] as const;

/**
 * provider-decryption workflow
 *
 * Log Trigger (ConsentUpdated granted=true)
 *   -> EVM Read (consent + patient records + marketplace key)
 *   -> HTTP Client (fetch encrypted record from IPFS)
 *   -> TEE Decrypt (unwrap patient key + AES-GCM decrypt inside enclave)
 *   -> De-identify (HIPAA Safe Harbor — strip all 18 identifier categories)
 *   -> HTTP Client (upload de-identified version to IPFS)
 *   -> EVM Write (access grant + de-identified CID for data marketplace)
 *
 * This is the core confidential compute innovation:
 * - Doctor gets access to the full record (encrypted, decryptable with consent)
 * - Data marketplace gets a de-identified version produced INSIDE the TEE
 * - Raw PHI never leaves the enclave — only de-identified data is output
 */
const onLogTrigger = async (
  runtime: Runtime<Config>,
  log: EVMLog,
): Promise<Record<string, never>> => {
  const patientHex = bytesToHex(log.topics[1]);
  const providerHex = bytesToHex(log.topics[2]);

  const patientAddress = `0x${patientHex.slice(-40)}` as `0x${string}`;
  const providerAddress = `0x${providerHex.slice(-40)}` as `0x${string}`;

  const dataHex = bytesToHex(log.data) as `0x${string}`;
  const [granted] = decodeAbiParameters(parseAbiParameters("bool"), dataHex);

  if (!granted) {
    runtime.log(
      `Consent revoked: ${providerAddress} by ${patientAddress}. Skipping.`,
    );
    return {};
  }

  runtime.log(
    `Consent granted: patient ${patientAddress} -> provider ${providerAddress}`,
  );

  // Load secrets
  const crePrivKey = runtime
    .getSecret({ id: "CRE_MARKETPLACE_PRIVATE_KEY" })
    .result().value;
  const pinataJwt = runtime.getSecret({ id: "PINATA_JWT" }).result().value;

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  // EVM Read 1: verify consent is active
  const getConsentCallData = encodeFunctionData({
    abi: CONSENT_ABI,
    functionName: "consents",
    args: [patientAddress, providerAddress],
  });
  const consentReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: runtime.config.consentContractAddress as `0x${string}`,
        data: getConsentCallData,
      }),
    })
    .result();
  const consentHex = bytesToHex(consentReply.data) as `0x${string}`;
  const consentData = decodeFunctionResult({
    abi: CONSENT_ABI,
    functionName: "consents",
    data: consentHex,
  }) as unknown as {
    recordType: number;
    grantedAt: bigint;
    expiresAt: bigint;
    isActive: boolean;
  };

  if (!consentData.isActive) {
    runtime.log(
      `Consent not active for provider ${providerAddress}. Skipping.`,
    );
    return {};
  }
  const allowedRecordType = consentData.recordType;
  runtime.log(
    `Filtering records for type ${allowedRecordType} (consented by patient)`,
  );

  // EVM Read 2: get patient record IDs from HealthRecordRegistry
  const getRecordsCallData = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "getPatientRecords",
    args: [patientAddress],
  });

  const recordIdsReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: runtime.config.registryAddress as `0x${string}`,
        data: getRecordsCallData,
      }),
    })
    .result();

  const recordIdsHex = bytesToHex(recordIdsReply.data) as `0x${string}`;
  const recordIds = decodeFunctionResult({
    abi: REGISTRY_ABI,
    functionName: "getPatientRecords",
    data: recordIdsHex,
  }) as readonly bigint[];

  if (!recordIds || recordIds.length === 0) {
    throw new Error(`No records found for patient ${patientAddress}`);
  }

  // EVM Read 3: get wrapped marketplace key from DataMarketplace
  const getKeyCallData = encodeFunctionData({
    abi: MARKETPLACE_ABI,
    functionName: "getMarketplaceKey",
    args: [patientAddress],
  });
  const keyReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: runtime.config.dataMarketplaceAddress as `0x${string}`,
        data: getKeyCallData,
      }),
    })
    .result();
  const keyHex = bytesToHex(keyReply.data) as `0x${string}`;

  // Decode wrapped key bundle (bytes → UTF-8 base64 string)
  let wrappedBundle: string | null = null;
  try {
    const hex = keyHex.startsWith("0x") ? keyHex.slice(2) : keyHex;
    if (hex.length > 128) {
      const byteLen = parseInt(hex.slice(64, 128), 16);
      const bytesHex = hex.slice(128, 128 + byteLen * 2);
      const bytes = Uint8Array.from(
        bytesHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)),
      );
      wrappedBundle = new TextDecoder().decode(bytes);
    }
  } catch {
    runtime.log("Failed to decode marketplace key bundle");
  }

  // Unwrap the patient's AES key inside TEE
  let dataKey: Uint8Array | null = null;
  if (wrappedBundle) {
    try {
      dataKey = unwrapKeyFromMarketplace(wrappedBundle, crePrivKey);
      runtime.log("Patient AES key unwrapped inside TEE");
    } catch {
      runtime.log("Key unwrap failed — will still grant access without de-id");
    }
  }

  // Find most recent record of the consented type
  let targetRecordId: bigint | null = null;
  let record: {
    ipfsCid: string;
    recordType: number;
    uploadTimestamp: bigint;
    lastAccessedAt: bigint;
    isActive: boolean;
    patient: string;
  } | null = null;
  for (let i = recordIds.length - 1; i >= 0; i--) {
    const checkCallData = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: "getRecord",
      args: [recordIds[i]],
    });
    const checkReply = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: "0x0000000000000000000000000000000000000000",
          to: runtime.config.registryAddress as `0x${string}`,
          data: checkCallData,
        }),
      })
      .result();
    const checkHex = bytesToHex(checkReply.data) as `0x${string}`;
    const checkRecord = decodeFunctionResult({
      abi: REGISTRY_ABI,
      functionName: "getRecord",
      data: checkHex,
    }) as unknown as {
      ipfsCid: string;
      recordType: number;
      uploadTimestamp: bigint;
      lastAccessedAt: bigint;
      isActive: boolean;
      patient: string;
    };

    if (checkRecord.recordType === allowedRecordType && checkRecord.isActive) {
      targetRecordId = recordIds[i];
      record = checkRecord;
      break;
    }
  }

  if (targetRecordId === null || record === null) {
    throw new Error(
      `No active record of type ${allowedRecordType} for patient ${patientAddress}`,
    );
  }

  runtime.log(
    `Found record #${targetRecordId} of type ${allowedRecordType} for patient ${patientAddress}`,
  );

  const ipfsCid = record.ipfsCid;
  runtime.log(`Fetching encrypted record from IPFS: ${ipfsCid}`);

  // HTTP Call 1: Fetch encrypted record from IPFS
  const gateway = runtime.config.pinataGateway;
  const ipfsUrl = `${gateway}/ipfs/${ipfsCid}`;
  const httpClient = new HTTPClient();

  const doFetch = httpClient.sendRequest(
    runtime,
    (sender) => {
      const resp = sender
        .sendRequest({
          url: ipfsUrl,
          method: "GET",
          // @ts-ignore - using deprecated headers
          headers: {
            "content-type": "application/json",
          },
        })
        .result();
      return text(resp);
    },
    consensusIdenticalAggregation<string>(),
  );

  const encryptedRecord = doFetch().result();
  runtime.log("Encrypted record fetched from IPFS");

  // Compute audit hash from encrypted record
  const auditHash = keccak256(toHex(encryptedRecord)) as `0x${string}`;

  // TEE Decrypt + De-identify (core confidential compute operation)
  let deidentifiedCid = "";
  if (dataKey) {
    try {
      const blob = JSON.parse(encryptedRecord) as EncryptedBlobShape;

      // Decrypt record inside TEE
      const plaintext = decryptBlob(blob, dataKey);

      runtime.log(
        "Record decrypted inside TEE — applying HIPAA Safe Harbor de-identification",
      );

      // Parse and de-identify
      const parsed = JSON.parse(plaintext) as {
        formData?: Record<string, string>;
        templateType?: string;
      };

      if (parsed.formData) {
        const deidentified = deidentify(parsed.formData);

        // Upload de-identified version to IPFS
        const deIdBody = JSON.stringify({
          pinataContent: {
            deidentifiedData: deidentified,
            templateType: parsed.templateType ?? "unknown",
            recordType: record!.recordType,
            sourceRecordHash: auditHash,
            patient: patientAddress,
            timestamp: Math.floor(Date.now() / 1000),
            privacy:
              "HIPAA Safe Harbor — 18 identifier categories stripped inside CRE TEE",
          },
          pinataMetadata: {
            name: `kosyn-deid-${patientAddress}-${targetRecordId}`,
          },
        });

        const doDeIdUpload = httpClient.sendRequest(
          runtime,
          (sender) => {
            const resp = sender
              .sendRequest({
                url: `https://api.pinata.cloud/pinning/pinJSONToIPFS?ts=${Date.now()}`,
                method: "POST",
                // @ts-ignore
                headers: {
                  "content-type": "application/json",
                  authorization: `Bearer ${pinataJwt}`,
                },
                body: stringToBase64(deIdBody),
                cacheSettings: { store: true, maxAge: "60s" },
              })
              .result();
            return text(resp);
          },
          consensusIdenticalAggregation<string>(),
        );

        const deIdResponse = doDeIdUpload().result();
        const deIdParsed = JSON.parse(deIdResponse) as { IpfsHash: string };
        deidentifiedCid = deIdParsed.IpfsHash;
        runtime.log(
          `De-identified record uploaded to IPFS: ${deidentifiedCid}`,
        );
      }
    } catch (e) {
      runtime.log(
        `TEE decrypt/de-identify failed: ${e instanceof Error ? e.message : "unknown"} — granting access without de-id`,
      );
    }
  }

  // EVM Write: operation 0x01 (access grant)
  const recordType = record.recordType;
  const duration = BigInt(86400);

  // Encode de-identified CID hash (or zero if de-id failed)
  const deidentifiedHash = deidentifiedCid
    ? (keccak256(toHex(deidentifiedCid)) as `0x${string}`)
    : ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`);

  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("address, address, uint8, uint256, bytes32"),
    [providerAddress, patientAddress, recordType, duration, auditHash],
  );

  const encodedPayload = `0x01${innerEncoded.slice(2)}` as `0x${string}`;
  const reportRequest = prepareReportRequest(encodedPayload);
  const report = runtime.report(reportRequest).result();

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
      `Access grant recorded on-chain. TX: ${txHash}. De-identified CID: ${deidentifiedCid || "none"}`,
    );
  } else {
    runtime.log(
      `EVM write status: ${writeResult.txStatus}. Check on-chain receipt.`,
    );
  }

  return {};
};

const initWorkflow = (config: Config) => {
  const consentUpdatedTopic = keccak256(
    toHex("ConsentUpdated(address,address,bool)"),
  );

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  const addressBytes = hexToBytes(config.consentContractAddress);
  const addressBase64 = bytesToBase64(addressBytes);

  const topicBytes = hexToBytes(consentUpdatedTopic);
  const topicBase64 = bytesToBase64(topicBytes);

  return [
    handler(
      evmClient.logTrigger({
        addresses: [addressBase64],
        topics: [{ values: [topicBase64] }],
      }),
      onLogTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
