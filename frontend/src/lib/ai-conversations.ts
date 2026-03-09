export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  proof?: { signature: string; model: string; timestamp: number };
}

export interface AiConversation {
  id: string;
  patientAddress: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

// Use globalThis so the Map survives HMR / module re-evaluation in dev
const g = globalThis as unknown as {
  __aiConversations?: Map<string, AiConversation>;
};
if (!g.__aiConversations) g.__aiConversations = new Map();
export const conversations = g.__aiConversations;

export function getPatientConversations(
  patientAddress: string,
): AiConversation[] {
  return Array.from(conversations.values())
    .filter((c) => c.patientAddress === patientAddress)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
