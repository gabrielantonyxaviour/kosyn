export interface AiSessionData {
  healthContext: string;
  expiresAt: number;
  patientAddress: string;
  createdAt: number;
}

// Use globalThis so the Map survives HMR / module re-evaluation in dev
const g = globalThis as unknown as {
  __aiSessions?: Map<string, AiSessionData>;
};
if (!g.__aiSessions) g.__aiSessions = new Map();
export const sessions = g.__aiSessions;

export function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}
