export interface AiSessionData {
  healthContext: string;
  expiresAt: number;
  patientAddress: string;
  createdAt: number;
}

// Module-level session store — persists across requests in dev server
export const sessions = new Map<string, AiSessionData>();

export function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}
