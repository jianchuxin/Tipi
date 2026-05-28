# Tipi AI 智能助理 — 设计文档

## 概述

在 Tipi 浏览器插件中新增 AI 智能助理模块。用户通过自然语言提问，AI 自动检索浏览历史并给出答案。功能以 Chrome 原生 Side Panel 为载体，悬浮球为入口，完全基于用户私有的 DeepSeek API Key 运行。

### 设计原则

- **隐私至上**：API Key 存于 chrome.storage.local，请求通过 `@langchain/openai` (ChatOpenAI) 直连 DeepSeek 官方接口
- **入口轻量**：悬浮球通过 Shadow DOM 注入，点击打开 Chrome Side Panel
- **键盘优先**：支持 Option+I 唤醒、Esc 关闭、Enter 发送、Shift+Enter 换行
- **与现有搜索独立共存**：Option+K 搜索覆盖层保持不变，AI 侧边栏是独立功能

---

## 架构

```
Content Script (ai-bubble)     Side Panel (sidepanel)     Options Page (新增 AI 区域)
        │                              │                           │
        ▼                              ▼                           ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │                         Background (消息路由)                        │
 │  ┌──────────────────────────────────────────────────────────────┐   │
 │  │  lib/agent/                                                    │   │
 │  │  - types.ts         通信协议与事件类型定义                      │   │
 │  │  - state.ts         LangGraph.js Annotation 状态通道          │   │
 │  │  - graph.ts         状态机图逻辑编译 (Nodes & Edges)           │   │
 │  │  - tools/historySearch.ts  封装 searchRecords 的工具定义       │   │
 │  ├──────────────────────────────────────────────────────────────┤   │
 │  │  lib/chat/                                                     │   │
 │  │  - chat-store.ts   对话持久化 (chrome.storage.local)           │   │
 │  └──────────────────────────────────────────────────────────────┘   │
 └─────────────────────────────────────────────────────────────────────┘
```

### 新增文件清单

| 路径 | 职责 |
|------|------|
| `src/entrypoints/ai-bubble.content/index.tsx` | 悬浮球 content script (Shadow DOM) |
| `src/entrypoints/ai-bubble.content/App.tsx` | 悬浮球 React 组件 |
| `src/entrypoints/sidepanel/` | Side Panel 页面 (HTML + React) |
| `src/entrypoints/sidepanel/App.tsx` | 聊天 UI 主组件 |
| `src/entrypoints/sidepanel/components/ChatHeader.tsx` | 顶栏 |
| `src/entrypoints/sidepanel/components/MessageList.tsx` | 消息列表 |
| `src/entrypoints/sidepanel/components/ChatInput.tsx` | 输入框 |
| `src/entrypoints/sidepanel/components/HistoryCard.tsx` | 历史记录卡片 |
| `src/entrypoints/sidepanel/components/ApiKeyGuide.tsx` | 引导配置页 |
| `src/lib/agent/types.ts` | 通信协议类型 (AgentStreamEvent 等) |
| `src/lib/agent/state.ts` | LangGraph.js 状态 Annotation 定义 |
| `src/lib/agent/graph.ts` | LangGraph 状态图 (Agent → Tool → Reflect) |
| `src/lib/agent/tools/historySearch.ts` | tipi_history_search 工具 (封装 searchRecords) |
| `src/lib/chat/chat-store.ts` | 对话 CRUD |
| `src/types/tipi.ts` | 新增 AI 相关消息类型和 Settings 字段 |

---

## 通信协议

Side Panel 与 Background 之间通过 `browser.runtime.connect` 建立名为 `tipi-agent-stream` 的长连接管道，以支持流式事件推送。

### Side Panel → Background (请求)

```typescript
interface AgentChatRequest {
  type: "USER_MESSAGE";
  payload: {
    text: string;  // 用户输入的自然语言
  };
}
```

### Background → Side Panel (流式事件)

```typescript
type AgentStreamEvent =
  | { type: "STATUS"; payload: { message: string } }                         // 状态提示
  | { type: "TOOL_START"; payload: { toolName: string; query: string } }      // 工具开始执行
  | { type: "TOOL_END"; payload: { toolName: string; results: SearchResult[] } }  // 工具结束 + 命中结果
  | { type: "TOKEN"; payload: { text: string } }                              // 流式文本增量
  | { type: "ERROR"; payload: { message: string; code?: number } }           // 错误
  | { type: "DONE"; payload: {} };                                            // 对话结束
```

---

## LangGraph 状态定义

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

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

---

## 数据流

```
1. Side Panel 打开 → 建立长连接 browser.runtime.connect({ name: "tipi-agent-stream" })
2. 用户输入 → Side Panel 发送 { type: "USER_MESSAGE", payload: { text } }
3. Background 读取 API Key (chrome.storage.local)
   ├─ 未配置 → ERROR 事件 → Side Panel 显示引导
   └─ 已配置 → 继续
4. Background 编译 LangGraph 状态图，注入流式回调 onStreamEvent
5. 以 streamMode: "values" 驱动状态机，每个状态变化通过 port.postMessage 推送到 Side Panel

   图拓扑:
   __start__ → agent ──(无 tool_call)──→ END (流式输出)
                 │
                 └──(有 tool_call)──→ tools → evaluateResults
                                       │
                                       ├─ 有结果 → agent (生成回答)
                                       ├─ retryCount >= 2 → agent (委婉告知)
                                       └─ retryCount < 2 → agent (自省重试, retryCount+1)

6. Side Panel 根据事件类型局部更新 UI:
   - STATUS → 状态栏提示文字
   - TOOL_START → 显示搜索动画
   - TOOL_END → 渲染 HistoryCard 卡片
   - TOKEN → 打字机效果追加文本
   - ERROR → 错误卡片 + 重试按钮
   - DONE → 结束 loading 状态
7. DONE 事件到达后，Side Panel 断开连接，完整对话持久化到 chat-store
```

---

## UI 规范

### 悬浮球
- 位置：`fixed; right: 24px; bottom: 80px`
- 样式：纸张色系圆形按钮，Shadow DOM 隔离
- 交互：hover scale(1.05)，click → 发消息给 background 打开 Side Panel
- 受限页面 (chrome://) 自动隐藏

### Side Panel (Chrome 原生)
- 宽度：Chrome 默认 (~360px)
- 组件布局：ChatHeader → MessageList → ChatInput (固定底部)
- 未配置 API Key 时显示 ApiKeyGuide
- 消息样式：
  - 用户消息：靠右，浅色背景
  - AI 消息：靠左，Markdown 流式渲染（打字机效果）
  - HistoryCard：独立卡片（favicon + 标题 + URL + 时间），可点击跳转

### 键盘交互
- Option+I (Mac) / Alt+I (Win)：唤醒 Side Panel
- Enter：发送消息
- Shift+Enter：换行
- Esc：关闭 Side Panel

---

## API Key 管理

- 存储：`chrome.storage.local`，key 为 `tipi.ai-settings`
- 配置入口：Options 页新增 "AI 助理" 区域（DeepSeek API Key + 自定义 Base URL 可选）
- 未配置时：Side Panel 显示引导页，提示前往 Options 配置
- LLM 客户端：`@langchain/openai` 的 `ChatOpenAI`，baseURL 设为 `https://api.deepseek.com/v1`（或用户自定义）
- 模型：`deepseek-chat`，temperature 0.1（保证 tool calling 稳定性）
- 错误处理：
  - 401/402 → 提示 "API Key 无效或余额不足"
  - Network Error / Timeout (>10s) → 停止流式，显示错误卡片 + 重试按钮

---

## 边界情况

| 场景 | 处理 |
|------|------|
| 网络断开/超时 (>10s) | 停止流式，显示错误卡片 + 重试按钮 |
| API Key 无效/额度耗尽 | 提示检查 API Key 和余额 |
| 彻底无匹配历史 (2 次重试后) | 委婉回复未找到，建议扩大时间窗口 |
| 受限页面 (chrome://) | 悬浮球不显示，可通过快捷键或图标降级使用 |
| Side Panel 关闭 | 对话历史已持久化，下次打开恢复 |
| Firefox 不支持 Side Panel | 降级为 Popup 窗口 |

---

## 依赖

- `@langchain/core` + `@langchain/langgraph`：状态图编排
- `@langchain/openai`：OpenAI 兼容客户端 (ChatOpenAI → DeepSeek)
- `zod`：工具 schema 验证
- `marked` 或手写 Markdown 解析器：AI 回复渲染

---

## 验收标准

1. 首字响应时间 < 800ms（正常网络）
2. Shadow DOM 样式在任何宿主网站下不受污染
3. 自省重试循环可通过 console.log 验证 Agent → Tool → Reflection → Retry → Respond 流程
4. API Key 配置后可正常对话，未配置时显示引导
5. 对话历史关闭 Side Panel 后重新打开可恢复
6. 长连接事件流 TYPE 完整覆盖：STATUS → TOOL_START → TOOL_END → TOKEN → DONE
