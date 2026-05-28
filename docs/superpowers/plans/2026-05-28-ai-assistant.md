# AI 智能助理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered history search assistant into Tipi with a floating bubble entry point, Chrome Side Panel chat UI, and LangGraph-powered self-correction agent.

**Architecture:** The AI agent runs in the background service worker via LangGraph.js. A Shadow-DOM-injected floating bubble on every page triggers the Chrome native Side Panel. The Side Panel establishes a `browser.runtime.connect` long-lived port for bidirectional streaming. All LLM calls go through `@langchain/openai` ChatOpenAI pointed at DeepSeek's API. History search reuses the existing `searchRecords()` function.

**Tech Stack:** React 19, WXT, LangGraph.js, @langchain/openai (DeepSeek), zod, Chrome Side Panel API, chrome.storage.local

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install AI-related packages**

Run: `npm install @langchain/core @langchain/langgraph @langchain/openai zod`

Expected: Packages added to package.json and node_modules.

- [ ] **Step 2: Verify install**

Run: `npm ls @langchain/core @langchain/langgraph @langchain/openai zod`

Expected: All four packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add langchain and zod dependencies for AI agent

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Define AI types

**Files:**
- Create: `src/lib/agent/types.ts`
- Modify: `src/types/tipi.ts`

- [ ] **Step 1: Create agent communication types**

Write `src/lib/agent/types.ts`:

```typescript
import type { SearchResult } from "@/types/tipi";

export type AgentChatRequest = {
  type: "USER_MESSAGE";
  payload: {
    text: string;
  };
};

export type AgentStreamEvent =
  | { type: "STATUS"; payload: { message: string } }
  | { type: "TOOL_START"; payload: { toolName: string; query: string } }
  | { type: "TOOL_END"; payload: { toolName: string; results: SearchResult[] } }
  | { type: "TOKEN"; payload: { text: string } }
  | { type: "ERROR"; payload: { message: string; code?: number } }
  | { type: "DONE"; payload: Record<string, never> };

export type AiSettings = {
  deepseekApiKey: string;
  deepseekBaseUrl: string;
};

export const AI_SETTINGS_STORAGE_KEY = "tipi.ai-settings";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  deepseekApiKey: "",
  deepseekBaseUrl: "https://api.deepseek.com/v1",
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolResults?: SearchResult[];
  timestamp: number;
};

export type ChatSession = {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};
```

- [ ] **Step 2: Add AI message types to TipiMessage**

In `src/types/tipi.ts`, add to the `TipiMessage` union type:

```typescript
  | {
      type: "tipi.open-side-panel";
    }
  | {
      type: "tipi.get-ai-settings";
    }
```

The full union should now end with:

```typescript
export type TipiMessage =
  | {
      type: "tipi.toggle-overlay";
    }
  | {
      type: "tipi.search";
      query: string;
    }
  | {
      type: "tipi.sync-history";
    }
  | {
      type: "tipi.get-stats";
    }
  | {
      type: "tipi.get-open-search-shortcut";
    }
  | {
      type: "tipi.clear-data";
    }
  | {
      type: "tipi.open-url";
      url: string;
      recordId: number;
      openInNewTab?: boolean;
    }
  | {
      type: "tipi.open-side-panel";
    }
  | {
      type: "tipi.get-ai-settings";
    };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: No new type errors from our additions.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent/types.ts src/types/tipi.ts
git commit -m "feat(ai): add agent communication types and message protocol

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Add AI settings to existing settings system

**Files:**
- Modify: `src/lib/settings/tipi-settings.ts`

- [ ] **Step 1: Add AI settings storage helpers**

In `src/lib/settings/tipi-settings.ts`, add these exports after the existing code:

```typescript
import type { AiSettings } from "@/lib/agent/types";
import { AI_SETTINGS_STORAGE_KEY, DEFAULT_AI_SETTINGS } from "@/lib/agent/types";

export async function getAiSettings(): Promise<AiSettings> {
  const stored = await browser.storage.local.get(AI_SETTINGS_STORAGE_KEY);
  const value = stored[AI_SETTINGS_STORAGE_KEY];

  if (!value || typeof value !== "object") {
    return DEFAULT_AI_SETTINGS;
  }

  return {
    deepseekApiKey:
      typeof (value as Record<string, unknown>).deepseekApiKey === "string"
        ? (value as Record<string, unknown>).deepseekApiKey
        : "",
    deepseekBaseUrl:
      typeof (value as Record<string, unknown>).deepseekBaseUrl === "string"
        ? (value as Record<string, unknown>).deepseekBaseUrl
        : DEFAULT_AI_SETTINGS.deepseekBaseUrl,
  } as AiSettings;
}

export async function updateAiSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getAiSettings();
  const next: AiSettings = { ...current, ...patch };

  await browser.storage.local.set({
    [AI_SETTINGS_STORAGE_KEY]: next,
  });

  return next;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings/tipi-settings.ts
git commit -m "feat(ai): add AI settings storage helpers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: LangGraph state and search tool

**Files:**
- Create: `src/lib/agent/state.ts`
- Create: `src/lib/agent/tools/historySearch.ts`

- [ ] **Step 1: Create LangGraph state definition**

Write `src/lib/agent/state.ts`:

```typescript
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import type { SearchResult } from "@/types/tipi";

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  foundResults: Annotation<SearchResult[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  currentQuery: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
});
```

- [ ] **Step 2: Create search tool**

Write `src/lib/agent/tools/historySearch.ts`:

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchRecords } from "@/lib/search/search-index";

export const tipiHistorySearchTool = tool(
  async ({ query }) => {
    try {
      const records = await searchRecords(query);
      return JSON.stringify(records);
    } catch (error) {
      return JSON.stringify({ error: "Local search failed", details: String(error) });
    }
  },
  {
    name: "tipi_history_search",
    description:
      "搜索用户的浏览器访问历史记录。返回包含 URL、标题、访问时间的数组。如果没有搜到，请考虑精简或更换关键词。",
    schema: z.object({
      query: z.string().describe("用于匹配历史记录的关键词或核心短语"),
    }),
  }
);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent/state.ts src/lib/agent/tools/historySearch.ts
git commit -m "feat(ai): add LangGraph state annotation and history search tool

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: LangGraph agent graph

**Files:**
- Create: `src/lib/agent/graph.ts`

- [ ] **Step 1: Create the compiled agent graph**

Write `src/lib/agent/graph.ts`:

```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import type { AIMessage } from "@langchain/core/messages";
import { AgentStateAnnotation } from "./state";
import { tipiHistorySearchTool } from "./tools/historySearch";
import type { AgentStreamEvent } from "./types";

export function createAgentGraph(
  apiKey: string,
  baseUrl: string,
  onStreamEvent: (event: AgentStreamEvent) => void
) {
  const model = new ChatOpenAI({
    modelName: "deepseek-chat",
    openAIApiKey: apiKey,
    configuration: { baseURL: baseUrl },
    temperature: 0.1,
    streaming: true,
  }).bindTools([tipiHistorySearchTool]);

  async function agentNode(state: typeof AgentStateAnnotation.State) {
    onStreamEvent({ type: "STATUS", payload: { message: "Tipi 助理正在思考..." } });
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  async function toolsNode(state: typeof AgentStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) return {};

    const toolCall = toolCalls[0];
    onStreamEvent({
      type: "TOOL_START",
      payload: { toolName: toolCall.name, query: toolCall.args.query as string },
    });

    const resultString = await tipiHistorySearchTool.invoke(toolCall);
    const results = JSON.parse(resultString);

    onStreamEvent({
      type: "TOOL_END",
      payload: { toolName: toolCall.name, results: Array.isArray(results) ? results : [] },
    });

    const resultList = Array.isArray(results) ? results : [];

    return {
      messages: [
        { role: "tool" as const, content: resultString, tool_call_id: toolCall.id ?? "" },
      ],
      foundResults: resultList,
      currentQuery: toolCall.args.query as string,
      retryCount: resultList.length === 0 ? state.retryCount + 1 : state.retryCount,
    };
  }

  function shouldContinue(state: typeof AgentStateAnnotation.State): "continue" | "end" {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return "end";
    }
    return "continue";
  }

  function evaluateResults(state: typeof AgentStateAnnotation.State): "respond" | "retry" {
    if (state.foundResults && state.foundResults.length > 0) {
      return "respond";
    }

    if (state.retryCount >= 2) {
      return "respond";
    }

    onStreamEvent({
      type: "STATUS",
      payload: {
        message: `未找到相关历史，正在自省并更换关键词重试... (尝试 ${state.retryCount + 1}/2)`,
      },
    });

    return "retry";
  }

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolsNode)
    .addEdge("__start__", "agent");

  workflow.addConditionalEdges("agent", shouldContinue, {
    continue: "tools",
    end: END,
  });

  workflow.addConditionalEdges("tools", evaluateResults, {
    respond: "agent",
    retry: "agent",
  });

  return workflow.compile();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent/graph.ts
git commit -m "feat(ai): add LangGraph agent with self-correction loop

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Chat store (conversation persistence)

**Files:**
- Create: `src/lib/chat/chat-store.ts`

- [ ] **Step 1: Create chat store**

Write `src/lib/chat/chat-store.ts`:

```typescript
import { browser } from "wxt/browser";
import type { ChatMessage, ChatSession } from "@/lib/agent/types";

const CHAT_SESSIONS_KEY = "tipi.chat-sessions";
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getSessions(): Promise<ChatSession[]> {
  const stored = await browser.storage.local.get(CHAT_SESSIONS_KEY);
  const sessions = stored[CHAT_SESSIONS_KEY];
  if (!Array.isArray(sessions)) return [];
  return sessions;
}

export async function getLatestSession(): Promise<ChatSession | null> {
  const sessions = await getSessions();
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
}

export async function createSession(): Promise<ChatSession> {
  const session: ChatSession = {
    id: generateId(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sessions = await getSessions();
  sessions.push(session);

  while (sessions.length > MAX_SESSIONS) {
    sessions.shift();
  }

  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: sessions });
  return session;
}

export async function saveMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const sessions = await getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;

  session.messages.push(message);

  while (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.shift();
  }

  session.updatedAt = Date.now();
  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: sessions });
}

export async function clearAllSessions(): Promise<void> {
  await browser.storage.local.remove(CHAT_SESSIONS_KEY);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await browser.storage.local.set({ [CHAT_SESSIONS_KEY]: filtered });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat/chat-store.ts
git commit -m "feat(ai): add chat session persistence layer

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Background port connection handling

**Files:**
- Modify: `src/entrypoints/background.ts`

- [ ] **Step 1: Add side panel opening and port handling to background.ts**

Add this import block near the top of `src/entrypoints/background.ts` (after existing imports):

```typescript
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgentGraph } from "@/lib/agent/graph";
import { getAiSettings } from "@/lib/settings/tipi-settings";
import { getLatestSession, createSession, saveMessageToSession } from "@/lib/chat/chat-store";
import type { AgentChatRequest, AgentStreamEvent, ChatMessage } from "@/lib/agent/types";
```

Add the `handleOpenSidePanel` handler before the `bootstrap` function:

```typescript
async function handleOpenSidePanel() {
  try {
    await (browser as unknown as { sidePanel: { open: () => Promise<void> } }).sidePanel.open();
  } catch (error) {
    console.warn("[Tipi] sidePanel.open failed, falling back to popup", error);
    await openPopupWindow();
  }
}
```

Add the `handleAgentStream` function before `bootstrap`:

```typescript
function handleAgentStream(port: Browser.runtime.Port) {
  let currentSessionId: string | null = null;

  port.onMessage.addListener(async (msg: AgentChatRequest) => {
    if (msg.type !== "USER_MESSAGE") return;

    try {
      const settings = await getAiSettings();

      if (!settings.deepseekApiKey) {
        port.postMessage({
          type: "ERROR",
          payload: { message: "未配置 DeepSeek API Key，请在 Tipi 设置页中填写。", code: 401 },
        } satisfies AgentStreamEvent);
        return;
      }

      let session = await getLatestSession();
      if (!session) {
        session = await createSession();
      }
      currentSessionId = session.id;

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: msg.payload.text,
        timestamp: Date.now(),
      };
      await saveMessageToSession(session.id, userMsg);

      const historyMessages = session.messages.map((m) => {
        if (m.role === "user") return new HumanMessage(m.content);
        return new AIMessage(m.content);
      });

      const app = createAgentGraph(
        settings.deepseekApiKey,
        settings.deepseekBaseUrl,
        (event: AgentStreamEvent) => {
          port.postMessage(event);
        }
      );

      const initialState = {
        messages: [...historyMessages, new HumanMessage(msg.payload.text)],
        retryCount: 0,
        foundResults: [] as import("@/types/tipi").SearchResult[],
        currentQuery: "",
      };

      let finalContent = "";

      // Use stream() to get per-state snapshots. The last state
      // contains the complete conversation, including the final AI response.
      const stream = await app.stream(initialState, { streamMode: "values" });

      let lastState: typeof initialState | null = null;
      for await (const chunk of stream) {
        lastState = chunk as typeof initialState;
      }

      // Extract the final AI message text from the last state
      if (lastState) {
        const msgs = lastState.messages;
        const lastMsg = msgs[msgs.length - 1];
        if (
          lastMsg &&
          typeof lastMsg === "object" &&
          "_getType" in lastMsg &&
          (lastMsg as { _getType: () => string })._getType() === "ai" &&
          !("tool_calls" in lastMsg && (lastMsg as { tool_calls?: unknown[] }).tool_calls?.length)
        ) {
          const content = (lastMsg as { content: string }).content;
          if (typeof content === "string") {
            finalContent = content;

            // Chunk the response into word-sized TOKEN events for a typing effect
            const words = content.split(/(\s+)/);
            for (const word of words) {
              port.postMessage({
                type: "TOKEN",
                payload: { text: word },
              } satisfies AgentStreamEvent);
            }
          }
        }
      }

      if (finalContent) {
        const assistantMsg: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: finalContent,
          timestamp: Date.now(),
        };
        await saveMessageToSession(session.id, assistantMsg);
      }

      port.postMessage({ type: "DONE", payload: {} } satisfies AgentStreamEvent);
    } catch (error) {
      port.postMessage({
        type: "ERROR",
        payload: {
          message: error instanceof Error ? error.message : "Agent 运行异常",
        },
      } satisfies AgentStreamEvent);
    }
  });

  port.onDisconnect.addListener(() => {
    currentSessionId = null;
  });
}
```

Inside the `main()` function of `defineBackground`, add these listeners alongside the existing ones:

```typescript
// Add after existing browser.runtime.onMessage.addListener block:

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== "tipi-agent-stream") return;
  handleAgentStream(port);
});
```

Inside the message handler (the existing `browser.runtime.onMessage.addListener`), add these cases to the switch statement (after the `tipi.open-url` case):

```typescript
              case "tipi.open-side-panel":
                await handleOpenSidePanel();
                sendResponse({ ok: true });
                return;
              case "tipi.get-ai-settings":
                sendResponse(await getAiSettings());
                return;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/background.ts
git commit -m "feat(ai): add background port connection and agent orchestration

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Manifest updates and keyboard shortcuts

**Files:**
- Modify: `wxt.config.ts`

- [ ] **Step 1: Add sidePanel permission, side_panel config, and AI shortcut to manifest**

In `wxt.config.ts`, make these changes:

Add `"sidePanel"` to the permissions array (after `"favicon"`):

```typescript
    permissions:
      browser !== "firefox"
        ? ["history", "storage", "tabs", "windows", "favicon", "sidePanel"]
        : ["history", "storage", "tabs", "windows"],
```

Add `side_panel` config inside the manifest callback (after the `action` block):

```typescript
    side_panel: browser !== "firefox"
      ? { default_path: "sidepanel.html" }
      : undefined,
```

Add the AI command in `commands` (after `"tipi.open-search"`):

```typescript
      "tipi.open-ai": {
        suggested_key: {
          default: "Alt+I",
          mac: "Option+I"
        },
        description: "Open Tipi AI assistant"
      }
```

The full `commands` object should look like:

```typescript
    commands: {
      "tipi.open-search": {
        suggested_key: {
          default: "Alt+K",
          mac: "Option+K"
        },
        description: "Open Tipi search"
      },
      "tipi.open-ai": {
        suggested_key: {
          default: "Alt+I",
          mac: "Option+I"
        },
        description: "Open Tipi AI assistant"
      }
    },
```

- [ ] **Step 2: Handle the new command in background.ts**

In `src/entrypoints/background.ts`, in the existing `browser.commands.onCommand.addListener`, add:

```typescript
    browser.commands.onCommand.addListener((command) => {
      if (command === "tipi.open-search") {
        void toggleOverlayInActiveTab();
        return;
      }

      if (command === "tipi.open-ai") {
        void handleOpenSidePanel();
      }
    });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add wxt.config.ts src/entrypoints/background.ts
git commit -m "feat(ai): add sidePanel manifest config and Option+I shortcut

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Floating bubble content script

**Files:**
- Create: `src/entrypoints/ai-bubble.content/index.tsx`
- Create: `src/entrypoints/ai-bubble.content/App.tsx`

- [ ] **Step 1: Create content script entry**

Write `src/entrypoints/ai-bubble.content/index.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import BubbleApp from "./App";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "tipi-ai-bubble",
      position: "inline",
      anchor: () => document.body ?? document.documentElement,
      append: "last",
      isolateEvents: true,
      onMount(_uiContainer, shadow) {
        const reset = document.createElement("style");
        reset.textContent = `
          :host{all:initial !important;background:transparent !important;
                width:0 !important;height:0 !important;
                pointer-events:none !important;overflow:visible !important}
          :host html,:host body{
                background:transparent !important;
                min-height:0 !important;min-width:0 !important;
                margin:0 !important;padding:0 !important}
        `;
        shadow.appendChild(reset);

        const app = document.createElement("div");
        app.className = "tipi-ai-bubble-app";
        _uiContainer.append(app);

        const root = createRoot(app);
        root.render(<BubbleApp />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
```

- [ ] **Step 2: Create bubble component**

Write `src/entrypoints/ai-bubble.content/App.tsx`:

```typescript
import { useState } from "react";
import { browser } from "wxt/browser";

export default function BubbleApp() {
  const [visible, setVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  async function handleClick() {
    try {
      await browser.runtime.sendMessage({ type: "tipi.open-side-panel" });
    } catch (error) {
      console.warn("[Tipi AI] failed to open side panel", error);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "80px",
        zIndex: 2147483646,
      }}
    >
      <button
        aria-label="Open Tipi AI Assistant"
        onClick={() => void handleClick()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "var(--color-surface, #f5f3ed)",
          color: "var(--color-primary, #8a9a5b)",
          boxShadow: isHovered
            ? "0 4px 16px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(0,0,0,0.1)",
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
        type="button"
      >
        <svg
          fill="none"
          height="22"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="22"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
          <path d="M8 13c.8.5 2.6 1 4-.5" />
          <circle cx="9" cy="9" fill="currentColor" r="1.2" stroke="none" />
          <circle cx="15" cy="9" fill="currentColor" r="1.2" stroke="none" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/ai-bubble.content/
git commit -m "feat(ai): add floating bubble content script with Shadow DOM

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Side Panel chat UI

**Files:**
- Create: `src/entrypoints/sidepanel/index.html`
- Create: `src/entrypoints/sidepanel/main.tsx`
- Create: `src/entrypoints/sidepanel/App.tsx`
- Create: `src/entrypoints/sidepanel/components/ChatHeader.tsx`
- Create: `src/entrypoints/sidepanel/components/MessageList.tsx`
- Create: `src/entrypoints/sidepanel/components/ChatInput.tsx`
- Create: `src/entrypoints/sidepanel/components/HistoryCard.tsx`
- Create: `src/entrypoints/sidepanel/components/ApiKeyGuide.tsx`

- [ ] **Step 1: Create HTML entry point**

Write `src/entrypoints/sidepanel/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tipi AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="./main.tsx" type="module"></script>
  </body>
</html>
```

- [ ] **Step 2: Create React entry**

Write `src/entrypoints/sidepanel/main.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import SidePanelApp from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<SidePanelApp />);
}
```

- [ ] **Step 3: Create ApiKeyGuide component**

Write `src/entrypoints/sidepanel/components/ApiKeyGuide.tsx`:

```typescript
export function ApiKeyGuide() {
  function handleOpenOptions() {
    const optionsUrl = chrome.runtime.getURL("options.html");
    chrome.tabs.create({ url: optionsUrl });
  }

  return (
    <div
      className="journal-canvas flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ fontSize: "16px", lineHeight: "1.5" }}
    >
      <svg
        fill="none"
        height="48"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        width="48"
      >
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
        <path d="M8 13c.8.5 2.6 1 4-.5" />
        <circle cx="9" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
        <circle cx="15" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
      </svg>
      <h2
        className="mt-6 font-[var(--font-display)] text-[1.3rem] font-bold tracking-[-0.03em]"
        style={{ color: "var(--color-ink)" }}
      >
        欢迎使用 Tipi AI 助理
      </h2>
      <p className="mt-3 max-w-xs text-[14px] leading-6" style={{ color: "var(--color-muted)" }}>
        使用您的 DeepSeek API Key，让 AI 帮您智能检索浏览历史。
      </p>
      <button
        className="journal-button-primary mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
        onClick={handleOpenOptions}
        type="button"
      >
        前往设置页配置 API Key
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create HistoryCard component**

Write `src/entrypoints/sidepanel/components/HistoryCard.tsx`:

```typescript
import type { SearchResult } from "@/types/tipi";
import { formatRelativeDate } from "@/lib/utils/format";

type HistoryCardProps = {
  result: SearchResult;
};

export function HistoryCard({ result }: HistoryCardProps) {
  function handleClick() {
    chrome.tabs.create({ url: result.url, active: true });
  }

  return (
    <button
      className="journal-card mb-2 block w-full p-3 text-left transition hover:shadow-md"
      onClick={handleClick}
      style={{ fontSize: "14px", lineHeight: "1.4" }}
      type="button"
    >
      <div className="flex items-start gap-3">
        {result.hostname ? (
          <img
            alt=""
            className="mt-0.5 h-4 w-4 shrink-0 rounded"
            src={`https://www.google.com/s2/favicons?domain=${result.hostname}&sz=32`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {result.title || result.url}
          </p>
          <p className="truncate text-[12px]" style={{ color: "var(--color-outline)" }}>
            {result.url}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
            {formatRelativeDate(result.lastVisitedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 5: Create ChatHeader component**

Write `src/entrypoints/sidepanel/components/ChatHeader.tsx`:

```typescript
type ChatHeaderProps = {
  onClear: () => void;
};

export function ChatHeader({ onClear }: ChatHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          fill="none"
          height="18"
          stroke="var(--color-primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="18"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
          <path d="M8 13c.8.5 2.6 1 4-.5" />
          <circle cx="9" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
          <circle cx="15" cy="9" fill="var(--color-primary)" r="1.2" stroke="none" />
        </svg>
        <span
          className="font-[var(--font-display)] text-[14px] font-bold tracking-[-0.03em]"
          style={{ color: "var(--color-ink)" }}
        >
          Tipi AI
        </span>
      </div>
      <button
        className="rounded-lg px-2 py-1 text-[12px] transition hover:bg-[color:var(--color-surface-low)]"
        onClick={onClear}
        style={{ color: "var(--color-muted)" }}
        type="button"
      >
        清除对话
      </button>
    </header>
  );
}
```

- [ ] **Step 6: Create MessageList component**

Write `src/entrypoints/sidepanel/components/MessageList.tsx`:

```typescript
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type MessageListProps = {
  children: ReactNode;
};

export function MessageList({ children }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [children]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ fontSize: "14px", lineHeight: "1.6" }}
    >
      {children}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 7: Create ChatInput component**

Write `src/entrypoints/sidepanel/components/ChatInput.tsx`:

```typescript
import type { KeyboardEvent, ChangeEvent } from "react";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        borderTop: "1px solid var(--color-line)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl border px-3 py-2 text-[14px] outline-none transition"
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="问 Tipi 关于你浏览历史的任何问题..."
          rows={1}
          style={{
            borderColor: "var(--color-line)",
            backgroundColor: "rgba(255,255,255,0.7)",
            color: "var(--color-ink)",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
          value={value}
        />
        <button
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!value.trim() || disabled}
          onClick={onSend}
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
          }}
          type="button"
        >
          发送
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create SidePanelApp (main component)**

Write `src/entrypoints/sidepanel/App.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import { HistoryCard } from "./components/HistoryCard";
import { ApiKeyGuide } from "./components/ApiKeyGuide";
import type { AgentStreamEvent, ChatSession } from "@/lib/agent/types";
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
```

- [ ] **Step 9: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add src/entrypoints/sidepanel/
git commit -m "feat(ai): add Side Panel chat UI with streaming support

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: Options page AI settings section

**Files:**
- Modify: `src/entrypoints/options/App.tsx`

- [ ] **Step 1: Add AI settings section to Options page**

In `src/entrypoints/options/App.tsx`, add imports:

```typescript
import { getAiSettings, updateAiSettings } from "@/lib/settings/tipi-settings";
import type { AiSettings } from "@/lib/agent/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/agent/types";
```

Add state in the `OptionsApp` component (after existing `shortcutLabel` state):

```typescript
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
```

Load AI settings in the useEffect:

```typescript
    void getAiSettings().then(setAiSettings);
```

Add a handler function (after `handleClear`):

```typescript
  async function handleAiSettingsChange(patch: Partial<AiSettings>) {
    try {
      const next = await updateAiSettings(patch);
      setAiSettings(next);
      setMessage("AI 设置已保存。");
    } catch (error) {
      console.error("[Tipi] AI settings update failed", error);
      setMessage("保存 AI 设置失败。");
    }
  }
```

Add the AI Settings section after the "Advanced Parameters" section (as a new `<section>` before the closing `</div>` of the main content):

```tsx
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2 className="font-[var(--font-display)] text-[1.8rem] font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
              AI 助理
            </h2>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(198,200,184,0.5),transparent)]" />
          </div>

          <div className="space-y-3">
            <SettingRow
              control={
                <input
                  className="w-64 rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[color:var(--color-primary)]"
                  onChange={(event) => {
                    const deepseekApiKey = event.target.value;
                    setAiSettings((prev) => ({ ...prev, deepseekApiKey }));
                  }}
                  onBlur={() => {
                    void handleAiSettingsChange({
                      deepseekApiKey: aiSettings.deepseekApiKey,
                    });
                  }}
                  placeholder="sk-..."
                  style={{
                    borderColor: "var(--color-line)",
                    backgroundColor: "rgba(255,255,255,0.76)",
                    color: "var(--color-ink)",
                  }}
                  type="password"
                  value={aiSettings.deepseekApiKey}
                />
              }
              description="输入你的 DeepSeek API Key。Key 存储在浏览器本地，请求直连 DeepSeek 官方，不经过任何中转。"
              title="DeepSeek API Key"
            />
            <SettingRow
              control={
                <input
                  className="w-64 rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[color:var(--color-primary)]"
                  onChange={(event) => {
                    const deepseekBaseUrl = event.target.value;
                    setAiSettings((prev) => ({ ...prev, deepseekBaseUrl }));
                  }}
                  onBlur={() => {
                    void handleAiSettingsChange({
                      deepseekBaseUrl: aiSettings.deepseekBaseUrl,
                    });
                  }}
                  placeholder="https://api.deepseek.com/v1"
                  style={{
                    borderColor: "var(--color-line)",
                    backgroundColor: "rgba(255,255,255,0.76)",
                    color: "var(--color-ink)",
                  }}
                  type="text"
                  value={aiSettings.deepseekBaseUrl}
                />
              }
              description="DeepSeek API 端点地址。如果你使用兼容代理，可以在这里修改。"
              title="API Base URL"
            />
          </div>
        </section>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/options/App.tsx
git commit -m "feat(ai): add API key configuration to Options page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: Build verification

**Files:** None (no new files)

- [ ] **Step 1: Build the extension**

Run: `npm run build`

Expected: Build succeeds with no errors. Output in `.output/` directory.

- [ ] **Step 2: Verify output contains all expected files**

Run: `ls .output/chrome-mv3/sidepanel.html .output/chrome-mv3/ai-bubble.html 2>/dev/null && echo "OK" || echo "Some files missing"`

- [ ] **Step 3: Commit (if any build artifacts need tracking)**

No commit needed if build passes cleanly. Otherwise fix issues and commit fixes.

---

## Plan Review Notes

- All files follow existing project patterns: Shadow DOM injection, message-passing through background, React + Tailwind in WXT entrypoints
- The `lib/agent/` module is testable in isolation (no browser APIs in state.ts or graph.ts except eventually calling searchRecords)
- Side Panel uses its own port connection; disconnection is handled gracefully
- The chat store reuses the existing `chrome.storage.local` pattern from tipi-settings
- Token streaming: LangGraph runs in `streamMode: "values"` for node-level events (STATUS, TOOL_START, TOOL_END). After the graph completes, the background extracts the final AI response and chunks it into TOKEN events word-by-word for the typing effect. True per-token LLM streaming via `streamMode: "messages"` can be added in a follow-up.
- retryCount is incremented in toolsNode when search results are empty, ensuring the self-correction loop terminates
