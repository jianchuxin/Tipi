这是一份专门为代码编辑器（如 Cursor / Windsurf）中 AI 准备的**深入技术设计与核心代码蓝图文档（Technical Design & Code Blueprint）**。

这份文档侧重于**具体的底层代码实现结构、核心 TypeScript 类型定义、Chrome Extension 长连接通信协议以及 LangGraph.js 的状态图具体节点算法**。它能让编辑器 AI 直接生成契合你项目的高质量脚手架和核心逻辑。

你可以将其存为 `docs/tech-design-tipi-agent.md` 并直接投喂给你的编辑器 AI：

---

# Tipi Extension — AI Agent Detailed Technical Design & Code Blueprint

## 1. 目录结构变更映射 (File System Mapping)

请在 Tipi 现有的项目结构中，新增并实现以下文件和模块。保持模块化与类型安全：

```text
src/
├── entrypoints/
│   ├── overlay.content/
│   │   ├── components/
│   │   │   ├── FloatingBubble.tsx    # 悬浮球组件
│   │   │   ├── ChatWindow.tsx        # 对话面板组件
│   │   │   └── HistoryCard.tsx       # 渲染 Tipi 搜索命中历史记录的优雅卡片
│   │   ├── hooks/
│   │   │   └── useAgentChat.ts       # 处理 chrome.runtime.connect 长连接与流式状态的自定义 Hook
│   │   └── index.tsx                 # 挂载到 Shadow DOM 的入口
├── lib/
│   └── agent/
│       ├── types.ts                  # Agent 全局类型与通信协议定义
│       ├── state.ts                  # LangGraph.js 状态通道（State Channels）定义
│       ├── graph.ts                  # LangGraph.js 状态机图逻辑编译（Nodes & Edges）
│       └── tools/
│           └── historySearch.ts      # 封装 Tipi 本地 Flexsearch 索引的工具
└── background.ts                     # 修改此文件：接管长连接，生命周期管理，运行 Agent 状态机

```

---

## 2. 通信协议规范 (Chrome Runtime Connection Protocol)

由于 Agent 输出是流式（Streaming）的，前台与后台必须通过 `chrome.runtime.connect` 建立一条名为 `tipi-agent-stream` 的持久双向管道。

### 2.1 前台向后台发送 (Client to Server)

```typescript
interface AgentChatRequest {
  type: "USER_MESSAGE";
  payload: {
    text: string;     // 用户输入的自然语言
  };
}

```

### 2.2 后台向前台推送 (Server to Client / Stream Chunks)

后台需要流式推送不同类型的事件，前台根据 `event` 类型局部更新 UI：

```typescript
type AgentStreamEvent = 
  | { type: "STATUS"; payload: { message: string } }                       // 状态提示（如："正在分析意图..."，"未找到结果，正在自省重试..."）
  | { type: "TOOL_START"; payload: { toolName: string; query: string } }    // 工具开始执行（前端可展示加载动画）
  | { type: "TOOL_END"; payload: { toolName: string; results: any[] } }     // 工具执行完毕（包含 RAG 命中的历史记录卡片数据）
  | { type: "TOKEN"; payload: { text: string } }                            // 核心文本 Token 流（流式打字机效果）
  | { type: "ERROR"; payload: { message: string; code: number } }          // 错误边界处理
  | { type: "DONE"; payload: {} };                                          // Agent 运行结束标志

```

---

## 3. 核心代码蓝图实现 (Code Blueprints)

### 3.2 状态定义：`src/lib/agent/state.ts`

定义 LangGraph.js 的 `channels` 结构，确保状态在图节点中流转时的不可变性（Immutability）。

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

// 优雅利用 LangGraph.js 的 Annotation 声明状态机结构
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (x, y) => y, // 直接覆盖
    default: () => 0,
  }),
  foundResults: Annotation<any[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  currentQuery: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  })
});

```

### 3.3 工具封装：`src/lib/agent/tools/historySearch.ts`

包装 Tipi 现有的 `searchRecords` 核心确定性搜索算法。

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
// 假定 Tipi 现有的搜索函数路径如下
import { searchRecords } from "@/lib/search/search-index"; 

export const tipiHistorySearchTool = tool(
  async ({ query }) => {
    try {
      // 执行 Tipi 现有的确定性/模糊历史匹配
      const records = await searchRecords(query);
      return JSON.stringify(records);
    } catch (error) {
      return JSON.stringify({ error: "Local search failed", details: String(error) });
    }
  },
  {
    name: "tipi_history_search",
    description: "根据关键词搜索用户的浏览器访问历史记录。返回包含 URL、标题、访问时间的数组。如果没有搜到，请考虑精简或更换关键词。",
    schema: z.object({
      query: z.string().describe("用于匹配历史记录的关键词或核心短语"),
    }),
  }
);

```

### 3.4 状态机编排：`src/lib/agent/graph.ts`

实现带有**自省循环（Self-Correction Loop）**和**前台流式事件同步**的图结构。

```typescript
import { StateGraph, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { AgentStateAnnotation } from "./state";
import { tipiHistorySearchTool } from "./tools/historySearch";
import { AIMessage } from "@langchain/core/messages";

export function createAgentGraph(apiKey: string, onStreamEvent: (event: any) => void) {
  
  // 初始化 OpenAI 兼容的 DeepSeek 客户端
  const model = new ChatOpenAI({
    modelName: "deepseek-chat",
    openAIApiKey: apiKey,
    configuration: { baseURL: "https://api.deepseek.com/v1" },
    temperature: 0.1, // 低温度保证 Tool Calling 稳定性
    streaming: true,
  }).bindTools([tipiHistorySearchTool]);

  // 1. Agent 思考节点
  const agentNode = async (state: typeof AgentStateAnnotation.State) => {
    onStreamEvent({ type: "STATUS", payload: { message: "Tipi 助理正在思考..." } });
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  // 2. 自定义工具执行节点（拦截结果用于控制流转向）
  const toolsNode = async (state: typeof AgentStateAnnotation.State) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls;
    
    if (!toolCalls || toolCalls.length === 0) return {};

    const toolCall = toolCalls[0];
    onStreamEvent({ type: "TOOL_START", payload: { toolName: toolCall.name, query: toolCall.args.query } });

    // 执行 Tipi 本地检索
    const resultString = await tipiHistorySearchTool.invoke(toolCall);
    const results = JSON.parse(resultString);

    onStreamEvent({ type: "TOOL_END", payload: { toolName: toolCall.name, results } });

    // 将工具执行结果和解析后的对象写回 State
    return {
      messages: [{ role: "tool", content: resultString, tool_call_id: toolCall.id }],
      foundResults: results,
      currentQuery: toolCall.args.query
    };
  };

  // 3. 核心条件边逻辑：决定是继续调用工具、自省重试，还是总结回答
  const shouldContinue = (state: typeof AgentStateAnnotation.State) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // 如果 LLM 不需要调用工具，直接结束，进入最终回答流
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return "end";
    }

    return "continue";
  };

  const evaluateResults = (state: typeof AgentStateAnnotation.State) => {
    // 检查工具节点塞入的检索结果
    if (state.foundResults && state.foundResults.length > 0) {
      return "respond"; // 搜到结果了，流向 Agent 生成最终优雅总结
    }

    // 没搜到结果，检查是否达到重试上限 (2次)
    if (state.retryCount >= 2) {
      return "respond"; // 没招了，让 Agent 委婉拒绝
    }

    // 触发自省流程：给 State 增加重试计数，丢回给 Agent
    onStreamEvent({ type: "STATUS", payload: { message: `未找到相关历史，正在自省并更换关键词重试... (尝试 ${state.retryCount + 1}/2)` } });
    
    return "retry";
  };

  // 4. 构建并编排图拓扑
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolsNode)
    .addEdge("__start__", "agent");

  // 从 Agent 出发的条件边
  workflow.addConditionalEdges("agent", shouldContinue, {
    continue: "tools",
    end: END,
  });

  // 从 Tools 出发后，评估结果判定是否走回头路（有环控制流）
  workflow.addConditionalEdges("tools", evaluateResults, {
    respond: "agent",
    retry: "agent" // 导流回 agent，由于 state.retryCount 变化以及 tool 结果在历史中，DeepSeek 会自动反思重试
  });

  return workflow.compile();
}

```

### 3.5 后台管道接管：`src/background.ts`

在 Service Worker 中处理前台长连接，安全读取本地 `chrome.storage` 中的 API Key，驱动图状态机运行。

```typescript
import { createAgentGraph } from "./lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "tipi-agent-stream") return;

  port.onMessage.addListener(async (msg: any) => {
    if (msg.type === "START_AGENT_CHAT") {
      const userText = msg.payload.text;

      try {
        // 1. 从本地安全沙盒获取用户的 DeepSeek Key
        const storage = await chrome.storage.local.get("deepseek_api_key");
        const apiKey = storage.deepseek_api_key;

        if (!apiKey) {
          port.postMessage({ type: "ERROR", payload: { message: "未配置 DeepSeek API Key，请在 Tipi 设置页中填写。" } });
          return;
        }

        // 2. 编译并初始化带有流式回调的 LangGraph 实例
        const app = createAgentGraph(apiKey, (event) => {
          // 实时将底层状态变化和 Tool 命中结果推向 React 前端
          port.postMessage(event);
        });

        // 3. 以流形式驱动图状态机，同时捕获最后的文本 Token 流
        const initialState = {
          messages: [new HumanMessage(userText)],
          retryCount: 0,
          foundResults: [],
          currentQuery: ""
        };

        const eventStream = await app.stream(initialState, { streamMode: "values" });
        
        // 捕获 Agent 生成最终文本时的 tokens（流式打字机）
        for await (const chunk of eventStream) {
          const lastMsg = chunk.messages[chunk.messages.length - 1];
          if (lastMsg && lastMsg._getType() === "ai" && !lastMsg.tool_calls?.length) {
            // 解析出流式文本增量（注意处理不同 LangChain 版本的 chunk text 结构）
            if (chunk.opts?.events?.includes("token")) {
               port.postMessage({ type: "TOKEN", payload: { text: chunk.content } });
            }
          }
        }
        
        port.postMessage({ type: "DONE", payload: {} });

      } catch (err: any) {
        port.postMessage({ type: "ERROR", payload: { message: err.message || "Agent 运行异常" } });
      }
    }
  });
});

```

---

## 4. 💡 编辑器 AI 指导提示（Prompt Helper）

当你把这一份 Spec 连同上一份 PRD 发送给 Cursor 时，请附带这行指令：

> *"请严格参照上述技术设计，首先在 `src/lib/agent/` 下完整创建出类型定义文件 `types.ts` 和状态图文件 `state.ts` / `graph.ts`。实现完成后，我们再一起编写前台 React Hook 驱动悬浮球通信。确保类型 100% 严谨，不要使用 any 逃避声明。"*

这份技术 Spec 彻底规避了 Extension 常见的底层 CSP 报错，并设计了安全的环形状态路由。交给你的 AI，今天就可以写出完美的底层结构！祝开工大吉！