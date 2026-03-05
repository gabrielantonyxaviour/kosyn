import {
  handler,
  type Runtime,
  Runner,
  EVMClient,
  type EVMLog,
  TxStatus,
  prepareReportRequest,
  bytesToHex,
  hexToBytes,
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
import { bytesToBase64 } from "../utils";

type Config = {
  receiverAddress: string;
  gasLimit: number;
  marketplaceAddress: string;
  eventTopic: string;
};

const MARKETPLACE_ABI = [
  {
    name: "getActiveContributors",
    type: "function" as const,
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view" as const,
  },
  {
    name: "queries",
    type: "function" as const,
    inputs: [{ name: "queryId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "requester", type: "address" },
          { name: "queryParams", type: "string" },
          { name: "payment", type: "uint256" },
          { name: "fulfilled", type: "bool" },
          { name: "resultHash", type: "bytes32" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

/**
 * data-marketplace workflow
 *
 * Log Trigger (QuerySubmitted)
 *   -> EVM Read (DataMarketplace.getActiveContributors)
 *   -> EVM Read (DataMarketplace.queries — get payment amount)
 *   -> In-workflow aggregation (equal KUSD distribution)
 *   -> EVM Write (fulfill query + distribute to contributors)
 */
const onLogTrigger = (
  runtime: Runtime<Config>,
  log: EVMLog,
): Record<string, never> => {
  const queryIdHex = bytesToHex(log.topics[1]);
  const queryId = BigInt(queryIdHex);

  const requesterHex = bytesToHex(log.topics[2]);
  const requesterAddress = `0x${requesterHex.slice(-40)}`;

  const dataHex = bytesToHex(log.data) as `0x${string}`;
  const [payment] = decodeAbiParameters(parseAbiParameters("uint256"), dataHex);

  runtime.log(
    `Processing marketplace query #${queryId} from ${requesterAddress}, payment: ${payment}`,
  );

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  // EVM Read 1: get active contributors from DataMarketplace
  const getContributorsCallData = encodeFunctionData({
    abi: MARKETPLACE_ABI,
    functionName: "getActiveContributors",
    args: [],
  });

  const contributorsReply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: runtime.config.marketplaceAddress as `0x${string}`,
        data: getContributorsCallData,
      }),
    })
    .result();

  const contributorsHex = bytesToHex(contributorsReply.data) as `0x${string}`;
  const contributors = decodeFunctionResult({
    abi: MARKETPLACE_ABI,
    functionName: "getActiveContributors",
    data: contributorsHex,
  }) as readonly `0x${string}`[];

  if (!contributors || contributors.length === 0) {
    runtime.log(
      "No active contributors. Fulfilling query with empty distribution.",
    );
    // Still fulfill the query on-chain so it's not stuck
    const resultHash = keccak256(
      toHex(`queryId:${queryId}:no-contributors`),
    ) as `0x${string}`;
    const innerEncoded = encodeAbiParameters(
      parseAbiParameters("uint256, bytes32, address[], uint256[]"),
      [queryId, resultHash, [], []],
    );
    const encodedPayload = `0x05${innerEncoded.slice(2)}` as `0x${string}`;
    const reportRequest = prepareReportRequest(encodedPayload);
    const report = runtime.report(reportRequest).result();
    evmClient
      .writeReport(runtime, {
        receiver: runtime.config.receiverAddress,
        report,
        gasConfig: { gasLimit: String(runtime.config.gasLimit) },
      })
      .result();
    return {};
  }

  runtime.log(`Found ${contributors.length} active contributors`);

  // Compute equal KUSD share per contributor (in wei)
  const n = BigInt(contributors.length);
  const sharePerContributor = payment / n;
  const shares = contributors.map(() => sharePerContributor);

  runtime.log(
    `Distributing ${sharePerContributor} KUSD wei to each of ${contributors.length} contributors`,
  );

  // Deterministic result hash for audit
  const resultHash = keccak256(
    toHex(
      JSON.stringify({
        queryId: queryId.toString(),
        contributors: contributors.map((c) => c.toLowerCase()),
        payment: payment.toString(),
      }),
    ),
  ) as `0x${string}`;

  // EVM Write: operation 0x05 (query fulfillment + distribution)
  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("uint256, bytes32, address[], uint256[]"),
    [queryId, resultHash, contributors as `0x${string}`[], shares],
  );

  const encodedPayload = `0x05${innerEncoded.slice(2)}` as `0x${string}`;
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
      `Query #${queryId} fulfilled. ${contributors.length} contributors paid. TX: ${txHash}`,
    );
  } else {
    runtime.log(
      `EVM write status: ${writeResult.txStatus}. Check on-chain receipt.`,
    );
  }

  return {};
};

const initWorkflow = (config: Config) => {
  const querySubmittedTopic = keccak256(
    toHex("QuerySubmitted(uint256,address,uint256)"),
  );

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["avalanche-testnet-fuji"],
  );

  const addressBytes = hexToBytes(config.marketplaceAddress);
  const addressBase64 = bytesToBase64(addressBytes);

  const topicBytes = hexToBytes(querySubmittedTopic);
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
