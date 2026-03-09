"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, Timer, X } from "lucide-react";
import { useAiSession } from "@/hooks/use-ai-session";
import { triggerWorkflow } from "@/lib/cre";
import { CreFeed } from "@/components/cre-feed";
import { NillionProofBadge } from "@/components/nillion-proof-badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  proof?: { signature: string; model: string; timestamp: number };
}

const WELCOME_MESSAGE =
  "Hello! I have access to your health records for this session. Ask me anything about your health data, medications, or conditions.";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
];

export function PatientAiChat({ patientAddress }: { patientAddress: string }) {
  const { state, session, timeRemaining, authorize, endSession } =
    useAiSession(patientAddress);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCre, setShowCre] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when a new session starts
  useEffect(() => {
    if (state === "active") {
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    }
  }, [state]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !session) return;

    const userMessage = input.trim();
    setInput("");
    const history = [...messages];
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

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
              proof?: { signature: string; model: string; timestamp: number };
            };
            if (chunk.type === "text" && chunk.content) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + chunk.content,
                };
                return updated;
              });
            }
            if (chunk.type === "done") {
              if (chunk.proof) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    proof: chunk.proof,
                  };
                  return updated;
                });
              }
              break outer;
            }
            if (chunk.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: "Sorry, I encountered an error. Please try again.",
                };
                return updated;
              });
              break outer;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "I'm running in demo mode. In production, this connects to Nillion nilAI with your encrypted health records.",
        };
        return updated;
      });
    }

    setIsStreaming(false);
  };

  const handleAttest = async () => {
    setShowCre(true);
    await triggerWorkflow("patient-ai-attest", {
      patientAddress,
      sessionSummary: `${messages.length} messages exchanged`,
    });
  };

  // LOCKED STATE
  if (state === "locked") {
    return (
      <div className="rounded-lg border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Image
            src="/kosyn-no-bg.png"
            alt="Kosyn AI"
            width={20}
            height={20}
            className="opacity-70 invert dark:invert-0"
          />
          <p className="text-sm font-medium">Kosyn AI</p>
          <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with Kosyn AI about your health records. Your data stays
          encrypted — only decrypted during your authorized session.
        </p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Session duration</p>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDuration(d.value)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                  selectedDuration === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={() => authorize(selectedDuration)}>
          Authorize Access
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Requires passkey authentication (Touch ID / Face ID)
        </p>
      </div>
    );
  }

  // AUTHORIZING STATE
  if (state === "authorizing") {
    return (
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image
            src="/kosyn-no-bg.png"
            alt="Kosyn AI"
            width={20}
            height={20}
            className="opacity-70 invert dark:invert-0"
          />
          <p className="text-sm font-medium">Kosyn AI</p>
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Authenticating and preparing your health context...
          </p>
        </div>
      </div>
    );
  }

  // EXPIRED STATE
  if (state === "expired") {
    return (
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Image
            src="/kosyn-no-bg.png"
            alt="Kosyn AI"
            width={20}
            height={20}
            className="opacity-70 invert dark:invert-0"
          />
          <p className="text-sm font-medium">Kosyn AI</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Your session has expired. Authorize again to continue chatting.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => authorize(selectedDuration)}
            className="flex-1"
          >
            Authorize Again
          </Button>
          {!showCre && (
            <Button variant="outline" onClick={handleAttest}>
              Attest with Chainlink CRE
            </Button>
          )}
        </div>
        {showCre && <CreFeed workflow="patient-ai-attest" isActive={true} />}
      </div>
    );
  }

  // ACTIVE STATE
  return (
    <div className="rounded-lg border border-border flex flex-col h-[520px]">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Image
          src="/kosyn-no-bg.png"
          alt="Kosyn AI"
          width={20}
          height={20}
          className="opacity-70 invert dark:invert-0"
        />
        <p className="text-sm font-medium">Kosyn AI</p>
        <div className="ml-auto flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={endSession}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col flex-1 gap-3 px-4 pb-4 min-h-0">
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="space-y-3 pr-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" ? (
                  <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-muted space-y-1.5">
                    {msg.content || (
                      <span className="animate-pulse text-muted-foreground">
                        Thinking...
                      </span>
                    )}
                    {msg.proof && <NillionProofBadge proof={msg.proof} />}
                  </div>
                ) : (
                  <p className="text-sm max-w-[85%] text-foreground px-1 py-1">
                    {msg.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health records, medications, or conditions..."
            className="min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
