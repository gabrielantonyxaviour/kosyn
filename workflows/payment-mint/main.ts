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

/**
 * payment-mint workflow
 *
 * HTTP Trigger -> HTTP Client (verify Stripe payment) -> EVM Write (mint KUSD)
 */
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload,
): Record<string, never> => {
  const body = decodeJson(payload.input) as {
    stripePaymentId: string;
    amount: number;
    recipientAddress: string;
  };

  runtime.log(
    `Processing payment: ${body.stripePaymentId}, amount: ${body.amount}, recipient: ${body.recipientAddress}`,
  );

  // HTTP Call 1: Verify Stripe payment
  const stripeKey = runtime
    .getSecret({ id: "STRIPE_SECRET_KEY" })
    .result().value;
  const httpClient = new HTTPClient();

  const doVerify = httpClient.sendRequest(
    runtime,
    (sender) => {
      const resp = sender
        .sendRequest({
          url: `https://api.stripe.com/v1/payment_intents/${body.stripePaymentId}`,
          method: "GET",
          // @ts-ignore - deprecated headers field for plain string auth
          headers: {
            authorization: `Bearer ${stripeKey}`,
            "content-type": "application/json",
          },
        })
        .result();
      return JSON.stringify({
        statusCode: resp.statusCode,
        body: text(resp),
      });
    },
    consensusIdenticalAggregation<string>(),
  );

  let verified = false;
  const verifyResult = doVerify().result();
  const verifyParsed = JSON.parse(verifyResult) as {
    statusCode: number;
    body: string;
  };

  let verifiedAmount = 0;
  if (verifyParsed.statusCode === 200) {
    try {
      const paymentIntent = JSON.parse(verifyParsed.body) as {
        status: string;
        amount: number; // Stripe amount in cents
      };
      if (paymentIntent.status === "succeeded") {
        // Use Stripe's amount (cents → USD), never trust body.amount
        verifiedAmount = paymentIntent.amount / 100;
      }
      runtime.log(
        `Stripe verification: status=${paymentIntent.status}, amount=${verifiedAmount} USD`,
      );
    } catch {
      runtime.log("Stripe response parse error");
    }
  } else {
    runtime.log(`Stripe API returned ${verifyParsed.statusCode}`);
  }

  if (verifiedAmount <= 0) {
    runtime.log("Payment verification failed. Aborting mint.");
    return {};
  }

  // EVM Write: operation 0x04 (payment mint) to KosynUSD
  // KUSD has 6 decimals: 1 USD = 1_000_000 units
  const kusdAmount = BigInt(Math.round(verifiedAmount * 1_000_000));
  const stripePaymentIdHash = keccak256(toHex(body.stripePaymentId));

  const innerEncoded = encodeAbiParameters(
    parseAbiParameters("address, uint256, bytes32"),
    [
      body.recipientAddress as `0x${string}`,
      kusdAmount,
      stripePaymentIdHash as `0x${string}`,
    ],
  );

  const encodedPayload = `0x04${innerEncoded.slice(2)}` as `0x${string}`;
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
      `KUSD minted: ${kusdAmount} to ${body.recipientAddress}. TX: ${txHash}`,
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
