"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Lock, Timer, Plus, MessageSquare, X } from "lucide-react";
import { useAiSession } from "@/hooks/use-ai-session";
import { triggerWorkflow } from "@/lib/cre";
import { CreFeed } from "@/components/cre-feed";
import { useCreLogs, truncHash, FUJI_EXPLORER } from "@/hooks/use-cre-logs";
import { NillionProofBadge } from "@/components/nillion-proof-badge";
import { MarkdownContent } from "@/components/markdown-content";
import type {
  AiConversation,
  ConversationMessage,
} from "@/lib/ai-conversations";

const SESSION_DURATION_MINUTES = 30;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function maskContent(text: string): string {
  return text.replace(/\S/g, "•");
}

function generateTitle(messages: ConversationMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text = firstUser.content.slice(0, 40);
  return text.length < firstUser.content.length ? `${text}...` : text;
}

export function PatientAiChat({ patientAddress }: { patientAddress: string }) {
  const { state, session, timeRemaining, authorize } =
    useAiSession(patientAddress);

  const [conversationsList, setConversationsList] = useState<AiConversation[]>(
    [],
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCre, setShowCre] = useState(false);
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLocked = state !== "active";

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ai-conversations?patientAddress=${patientAddress}`,
      );
      if (res.ok) {
        const data = (await res.json()) as AiConversation[];
        setConversationsList(data);
      }
    } catch {
      // ignore
    }
  }, [patientAddress]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (state === "active") {
      setShowCre(false);
      fetchConversations();
    }
  }, [state, fetchConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const saveMessages = useCallback(
    async (convId: string, msgs: ConversationMessage[]) => {
      const title = generateTitle(msgs);
      await fetch("/api/ai-conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId, messages: msgs, title }),
      });
    },
    [],
  );

  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/ai-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientAddress }),
      });
      if (res.ok) {
        const conv = (await res.json()) as AiConversation;
        setActiveConvId(conv.id);
        setMessages([]);
        await fetchConversations();
      }
    } catch {
      // ignore
    }
  };

  const handleOpenConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-conversations?id=${id}`);
      if (res.ok) {
        const conv = (await res.json()) as AiConversation;
        setActiveConvId(conv.id);
        setMessages(conv.messages);
      }
    } catch {
      // ignore
    }
  };

  const handleCloseConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    fetchConversations();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !session || !activeConvId) return;

    const userMessage = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const history = [...messages];
    const newMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: session.sessionToken,
          message: userMessage,
          history: history.slice(-20),
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let proof: ConversationMessage["proof"] | undefined;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as {
              type: string;
              content?: string;
              proof?: ConversationMessage["proof"];
            };
            if (chunk.type === "text" && chunk.content) {
              assistantContent += chunk.content;
              const ac = assistantContent;
              setMessages(() => [
                ...newMessages,
                { role: "assistant", content: ac },
              ]);
            }
            if (chunk.type === "done") {
              if (chunk.proof) proof = chunk.proof;
              break outer;
            }
            if (chunk.type === "error") {
              assistantContent =
                "Sorry, I encountered an error. Please try again.";
              break outer;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      const finalMessages: ConversationMessage[] = [
        ...newMessages,
        { role: "assistant", content: assistantContent, proof },
      ];
      setMessages(finalMessages);
      await saveMessages(activeConvId, finalMessages);
      await fetchConversations();
    } catch {
      const fallback =
        "I'm running in demo mode. In production, this connects to Nillion nilAI with your encrypted health records.";
      const finalMessages: ConversationMessage[] = [
        ...newMessages,
        { role: "assistant", content: fallback },
      ];
      setMessages(finalMessages);
      await saveMessages(activeConvId, finalMessages);
      await fetchConversations();
    }

    setIsStreaming(false);
  };

  const handleAttest = async () => {
    setShowCre(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");
    pushLog("INFO", "Attesting AI session on-chain...");

    const result = await triggerWorkflow("patient-ai-attest", {
      patientAddress,
      sessionSummary: `${messages.length} messages exchanged`,
    });

    if (result.success) {
      if (result.txHash) {
        pushLog(
          "OK",
          `Attestation recorded`,
          `${FUJI_EXPLORER}/${result.txHash}`,
        );
      } else {
        pushLog("OK", "Attestation recorded");
      }
      pushLog("OK", "Workflow complete");
    } else {
      pushLog("ERR", result.error ?? "Attestation workflow failed");
    }
  };

  const handleAuthorize = () => {
    authorize(SESSION_DURATION_MINUTES);
  };

  // Timer badge shared across views
  const timerBadge =
    state === "active" ? (
      <Badge
        variant="outline"
        className={`text-xs flex items-center gap-1 ${
          timeRemaining < 60
            ? "border-red-500/50 text-red-400"
            : timeRemaining < 300
              ? "border-amber-500/50 text-amber-400"
              : "border-emerald-500/50 text-emerald-400"
        }`}
      >
        <Timer className="h-3 w-3" />
        {formatTime(timeRemaining)}
      </Badge>
    ) : state === "expired" ? (
      <Badge
        variant="outline"
        className="text-xs flex items-center gap-1 border-red-500/50 text-red-400"
      >
        <Timer className="h-3 w-3" />
        00:00
      </Badge>
    ) : state === "authorizing" ? (
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    ) : null;

  // Auth button block shared across views
  const authBlock = isLocked ? (
    <div className="border-t border-border p-3 space-y-2 shrink-0">
      <Button className="w-full" onClick={handleAuthorize}>
        <Lock className="h-4 w-4 mr-2" />
        Authorize Access
      </Button>
      {state === "expired" && !showCre && (
        <Button variant="outline" className="w-full" onClick={handleAttest}>
          Attest with Chainlink CRE
        </Button>
      )}
      {showCre && <CreFeed workflow="patient-ai-attest" logs={creLogs} />}
    </div>
  ) : null;

  // -- Conversation list view --
  if (!activeConvId) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <Image
            src="/kosyn-no-bg.png"
            alt="Kosyn AI"
            width={16}
            height={16}
            className="opacity-70 invert dark:invert-0"
          />
          <h2 className="text-sm font-medium text-muted-foreground">
            Kosyn AI
          </h2>
        </div>
        <div className="rounded-lg border border-border flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-border">
            <p className="text-sm font-medium">Conversations</p>
            <div className="ml-auto flex items-center gap-2">
              {timerBadge}
              {state === "active" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNewConversation}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            <div className="p-4 space-y-1">
              {conversationsList.length === 0 && state === "active" && (
                <div className="py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleNewConversation}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Start a conversation
                  </Button>
                </div>
              )}
              {conversationsList.length === 0 && isLocked && (
                <div className="py-8 text-center">
                  <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Authorize access to chat with Kosyn AI
                  </p>
                </div>
              )}
              {conversationsList.map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const preview = lastMsg
                  ? isLocked
                    ? maskContent(lastMsg.content.slice(0, 50))
                    : lastMsg.content.slice(0, 50)
                  : "Empty conversation";
                return (
                  <button
                    key={conv.id}
                    onClick={() =>
                      state === "active"
                        ? handleOpenConversation(conv.id)
                        : undefined
                    }
                    disabled={isLocked}
                    className="w-full text-left rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-medium truncate">
                      {isLocked ? maskContent(conv.title) : conv.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {preview}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {authBlock}
          <div className="px-3 pb-3 shrink-0">
            <NillionPoweredBy />
          </div>
        </div>
      </div>
    );
  }

  // -- Chat view --
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Image
          src="/kosyn-no-bg.png"
          alt="Kosyn AI"
          width={16}
          height={16}
          className="opacity-70 invert dark:invert-0"
        />
        <h2 className="text-sm font-medium text-muted-foreground">Kosyn AI</h2>
      </div>
      <div className="rounded-lg border border-border flex flex-col flex-1 min-h-0">
        {/* Chat header */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-border">
          <button
            onClick={handleCloseConversation}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Conversations
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <p className="text-sm font-medium truncate flex-1">
            {conversationsList.find((c) => c.id === activeConvId)?.title ||
              "New conversation"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {timerBadge}
            {state === "active" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCloseConversation}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 scrollbar-thin"
        >
          <div className="p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Start the conversation by typing below.
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant avatar */}
                  {!isUser && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                      <Image
                        src="/kosyn-no-bg.png"
                        alt="Kosyn AI"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover invert dark:invert-0"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 relative ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground border border-border rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          isUser
                            ? "text-primary-foreground/70"
                            : "text-emerald-400"
                        }`}
                      >
                        {isUser ? "You" : "Kosyn AI"}
                      </span>
                      {msg.proof && !isLocked && !isUser && (
                        <NillionProofBadge proof={msg.proof} />
                      )}
                    </div>
                    <div className="text-sm">
                      {isLocked ? (
                        <span className="text-muted-foreground select-none">
                          {maskContent(msg.content || "Thinking...")}
                        </span>
                      ) : msg.content ? (
                        isUser ? (
                          <span className="whitespace-pre-wrap">
                            {msg.content}
                          </span>
                        ) : (
                          <MarkdownContent content={msg.content} />
                        )
                      ) : (
                        <span className="inline-block w-1.5 h-4 bg-emerald-400/70 ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>
                  {/* User avatar */}
                  {isUser && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                      <img
                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${patientAddress}`}
                        alt="You"
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Input area */}
        {state === "active" ? (
          <div className="border-t border-border p-3 space-y-2">
            <div className="relative flex flex-col rounded-md border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring/40 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your health records, medications, or conditions..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="min-h-[52px] max-h-[160px] resize-none border-0 bg-transparent px-4 pt-3.5 pb-12 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
                rows={1}
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-25 disabled:bg-muted"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <NillionPoweredBy />
          </div>
        ) : (
          <div className="shrink-0">
            {authBlock}
            <div className="px-3 pb-3">
              <NillionPoweredBy />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NillionPoweredBy() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="text-[10px] text-muted-foreground/50">powered by</span>
      <span className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground/50">
        nillion
      </span>
      <span className="text-[10px] text-muted-foreground/50">zkLLM</span>
    </div>
  );
}
