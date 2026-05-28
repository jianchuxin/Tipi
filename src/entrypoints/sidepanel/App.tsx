import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { HistoryCard } from "./components/HistoryCard";
import { ApiKeyGuide } from "./components/ApiKeyGuide";
import type { AgentStreamEvent } from "@/lib/agent/types";
import type { SearchResult } from "@/types/tipi";

type UIMessage = {
  id: string;
  role: "user" | "assistant" | "status" | "tool-results" | "error";
  content: string;
  toolResults?: SearchResult[];
};

export default function SidePanelApp() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const portRef = useRef<browser.runtime.Port | null>(null);
  const streamingContentRef = useRef("");

  useEffect(() => {
    async function checkApiKey() {
      try {
        const settings = await browser.runtime.sendMessage({
          type: "tipi.get-ai-settings",
        });
        if (!settings?.deepseekApiKey) {
          setNeedsApiKey(true);
        }
      } catch {
        setNeedsApiKey(true);
      } finally {
        setIsCheckingApiKey(false);
      }
    }

    void checkApiKey();
  }, []);

  function connectPort() {
    portRef.current = browser.runtime.connect({ name: "tipi-agent-stream" });

    portRef.current.onMessage.addListener((event: AgentStreamEvent) => {
      switch (event.type) {
        case "STATUS": {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "status", content: event.payload.message },
          ]);
          break;
        }
        case "TOOL_START":
          break;
        case "TOOL_END": {
          if (event.payload.results.length > 0) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "tool-results",
                content: `找到 ${event.payload.results.length} 条相关历史记录：`,
                toolResults: event.payload.results,
              },
            ]);
          }
          break;
        }
        case "TOKEN": {
          streamingContentRef.current += event.payload.text;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, content: streamingContentRef.current },
              ];
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: streamingContentRef.current,
              },
            ];
          });
          break;
        }
        case "ERROR": {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "error",
              content: event.payload.message,
            },
          ]);
          if (event.payload.code === 401) {
            setNeedsApiKey(true);
          }
          setIsStreaming(false);
          break;
        }
        case "DONE": {
          setIsStreaming(false);
          streamingContentRef.current = "";
          break;
        }
      }
    });

    portRef.current.onDisconnect.addListener(() => {
      setIsStreaming(false);
    });
  }

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    if (!portRef.current) {
      connectPort();
    }

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setInputValue("");
    setIsStreaming(true);
    streamingContentRef.current = "";

    portRef.current!.postMessage({
      type: "USER_MESSAGE",
      payload: { text },
    });
  }, [inputValue, isStreaming]);

  function handleClear() {
    setMessages([]);
    streamingContentRef.current = "";
  }

  if (isCheckingApiKey) {
    return (
      <div
        className="journal-canvas flex min-h-screen items-center justify-center"
        style={{ fontSize: "16px", lineHeight: "1.5" }}
      >
        <p style={{ color: "var(--color-muted)" }}>加载中...</p>
      </div>
    );
  }

  if (needsApiKey) {
    return <ApiKeyGuide />;
  }

  return (
    <div
      className="journal-canvas flex h-screen flex-col"
      style={{ fontSize: "16px", lineHeight: "1.5" }}
    >
      <ChatHeader onClear={handleClear} />
      <MessageList>
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div className="mb-3 flex justify-end" key={msg.id}>
                <div
                  className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5"
                  style={{
                    backgroundColor: "var(--color-surface-low)",
                    color: "var(--color-ink)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === "assistant") {
            return (
              <div className="mb-3 flex justify-start" key={msg.id}>
                <div
                  className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    color: "var(--color-ink)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === "tool-results" && msg.toolResults) {
            return (
              <div className="mb-3" key={msg.id}>
                <p
                  className="mb-2 text-[12px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  {msg.content}
                </p>
                {msg.toolResults.map((result) => (
                  <HistoryCard key={result.id} result={result} />
                ))}
              </div>
            );
          }

          if (msg.role === "status") {
            return (
              <div className="mb-2 flex justify-center" key={msg.id}>
                <span
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={{
                    backgroundColor: "var(--color-surface-low)",
                    color: "var(--color-muted)",
                  }}
                >
                  {msg.content}
                </span>
              </div>
            );
          }

          if (msg.role === "error") {
            return (
              <div className="mb-3 flex justify-center" key={msg.id}>
                <div
                  className="max-w-[90%] rounded-xl px-4 py-2.5 text-[13px]"
                  style={{
                    backgroundColor: "rgba(220,80,60,0.1)",
                    color: "var(--color-secondary, #c44)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          return null;
        })}
      </MessageList>
      <ChatInput
        disabled={isStreaming}
        onChange={setInputValue}
        onSend={handleSend}
        value={inputValue}
      />
    </div>
  );
}
