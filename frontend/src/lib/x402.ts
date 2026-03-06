export async function verifyX402Payment(
  txHash: string,
  expectedRecipient: string,
  minAmount: bigint,
): Promise<{ valid: boolean; queryId?: number; error?: string }> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ||
    "https://api.avax-test.network/ext/bc/C/rpc";

  const receiptResp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const receiptJson = await receiptResp.json();
  const receipt = receiptJson.result;

  if (!receipt) return { valid: false, error: "Transaction not found" };
  if (receipt.status !== "0x1")
    return { valid: false, error: "Transaction failed" };
  if (receipt.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { valid: false, error: "Wrong recipient" };
  }

  // Find the QuerySubmitted log from DataMarketplace.
  // KUSD payment is an ERC-20 transferFrom — tx.value is always 0.
  // The actual payment amount is in the QuerySubmitted event log data:
  //   topics[1] = queryId (indexed uint256)
  //   topics[2] = requester (indexed address)
  //   data      = payment amount (non-indexed uint256, first 32 bytes)
  const queryLog = receipt.logs?.find(
    (log: { address: string }) =>
      log.address?.toLowerCase() === expectedRecipient.toLowerCase(),
  );

  if (!queryLog) {
    return {
      valid: false,
      error: "No QuerySubmitted event found in transaction",
    };
  }

  const paymentAmount = BigInt(queryLog.data || "0x0");
  if (paymentAmount < minAmount) {
    return {
      valid: false,
      error: `Insufficient payment: got ${paymentAmount}, need ${minAmount}`,
    };
  }

  const queryId = parseInt(queryLog.topics?.[1] || "0x0", 16);

  return { valid: true, queryId };
}
