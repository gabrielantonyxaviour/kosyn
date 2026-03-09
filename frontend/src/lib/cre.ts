export interface CREResponse {
  success: boolean;
  txHash?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export async function triggerWorkflow(
  workflow: string,
  data: Record<string, unknown>,
): Promise<CREResponse> {
  const res = await fetch(`/api/cre/${workflow}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
