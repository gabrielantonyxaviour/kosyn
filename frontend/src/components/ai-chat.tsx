"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import Image from "next/image";
import { NillionProofBadge } from "@/components/nillion-proof-badge";
import { useActiveAccount } from "thirdweb/react";
import type { DemoRecord } from "@/app/api/demo/store";

interface Message {
  role: "user" | "assistant";
  content: string;
  proof?: { signature: string; model: string; timestamp: number };
}

interface AiChatProps {
  contextRecords?: DemoRecord[];
}

export function AiChat({ contextRecords = [] }: AiChatProps) {
  const account = useActiveAccount();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello, I'm your AI clinical assistant. I can help with SOAP notes, medical coding, drug interactions, and document generation. What would you like to work on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const history = messages
        .filter((m) => m.content)
        .map((m) => ({ role: m.role, content: m.content }));

      const contextString =
        contextRecords.length > 0
          ? contextRecords
              .map((r) => {
                const fields = r.formData
                  ? Object.entries(r.formData)
                      .map(([k, v]) => `  ${k}: ${v}`)
                      .join("\n")
                  : "  (no structured data)";
                return `[${r.recordType.toUpperCase()} — ${r.label || `Record #${r.id}`}]\n${fields}`;
              })
              .join("\n\n")
          : undefined;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          history,
          context: contextString,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let proof: Message["proof"] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as {
              type: string;
              content?: string;
              proof?: Message["proof"];
            };

            if (event.type === "text" && event.content) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.content,
                };
                return updated;
              });
            }

            if (event.type === "done" && event.proof) {
              proof = event.proof;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  proof,
                };
                return updated;
              });
            }

            if (event.type === "error") {
              throw new Error(event.content ?? "AI error");
            }
          } catch {
            // skip parse errors
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "I'm running in demo mode. In production, this connects to Nillion nilAI for private clinical assistance. Try asking about a SOAP note or medical codes!",
        };
        return updated;
      });
    }

    setIsStreaming(false);
  };

  return (
    <div className="rounded-lg border border-border flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Image
          src="/kosyn-no-bg.png"
          alt="KosynGPT"
          width={20}
          height={20}
          className="opacity-70 invert dark:invert-0"
        />
        <p className="text-sm font-medium text-muted-foreground">KosynGPT</p>
      </div>
      <div className="flex flex-col flex-1 gap-3 px-4 pb-4">
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="space-y-3 pr-4">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  {isUser ? (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                      <img
                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${account?.address ?? "default"}`}
                        alt="You"
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden mt-1">
                      <Image
                        src="/kosyn-no-bg.png"
                        alt="KosynGPT"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover invert dark:invert-0"
                      />
                    </div>
                  )}
                  {isUser ? (
                    <div className="rounded-lg rounded-br-sm px-3 py-2 text-sm max-w-[70%] bg-primary text-primary-foreground">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="rounded-lg rounded-bl-sm px-3 py-2 text-sm max-w-[70%] bg-muted text-foreground border border-border space-y-1.5">
                      <div>
                        {msg.content || (
                          <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse" />
                        )}
                      </div>
                      {msg.proof && <NillionProofBadge proof={msg.proof} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about SOAP notes, medical codes, drug interactions..."
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
        {contextRecords.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {contextRecords.length} patient record
            {contextRecords.length > 1 ? "s" : ""} attached as context
          </p>
        )}
      </div>
    </div>
  );
}
