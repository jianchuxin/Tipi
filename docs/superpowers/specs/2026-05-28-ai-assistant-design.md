# Tipi AI 智能助理 — 设计文档

## 概述

在 Tipi 浏览器插件中新增 AI 智能助理模块。用户通过自然语言提问，AI 自动检索浏览历史并给出答案。功能以 Chrome 原生 Side Panel 为载体，悬浮球为入口，完全基于用户私有的 DeepSeek API Key 运行。

### 设计原则

- **隐私至上**：API Key 存于 chrome.storage.local，请求直连 DeepSeek 官方接口
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
 │  │  lib/ai/                                                      │   │
 │  │  - agent.ts        LangGraph 状态图 (Agent → Tool → Reflect)  │   │
 │  │  - deepseek.ts     DeepSeek API 客户端 (streaming)            │   │
 │  │  - prompts.ts      System Prompt                              │   │
 │  │  - tools.ts        search_history 工具定义                    │   │
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
| `src/lib/ai/agent.ts` | LangGraph 状态图 |
| `src/lib/ai/deepseek.ts` | DeepSeek 流式 API 调用 |
| `src/lib/ai/prompts.ts` | System Prompt 模板 |
| `src/lib/ai/tools.ts` | LangGraph 工具定义 |
| `src/lib/chat/chat-store.ts` | 对话 CRUD |
| `src/types/tipi.ts` | 新增消息类型 |

---

## 数据流

```
用户输入 → Side Panel tipi.chat.send → Background
  → lib/chat/chat-store (读取历史)
  → lib/ai/agent.ts (LangGraph 状态图)
      ├─ Agent Node: System Prompt + 上下文 → DeepSeek API
      │   ├─ 模型直接回答 → Respond Node
      │   └─ 模型决定调用 search_history 工具 → Tool Node
      │         → searchRecords() (复用现有搜索)
      │         ├─ 有结果 → Agent Node (基于结果生成回答)
      │         └─ 空结果 → Reflection Node (换关键词重试, 最多 2 次)
      │               ├─ 找到 → Agent Node
      │               └─ 仍为空 → Respond Node (告知未找到)
  → 流式 chunk 逐个发送到 Side Panel (tipi.chat.stream)
  → 流结束 → chat-store 持久化对话
```

---

## UI 规范

### 悬浮球
- 位置：`fixed; right: 24px; bottom: 80px`
- 样式：纸张色系圆形按钮，Shadow DOM 隔离
- 交互：hover scale(1.05)，click → 打开 Side Panel
- 受限页面自动隐藏

### Side Panel (原生)
- 宽度：Chrome 默认 (~360px)
- 组件布局：Header → MessageList → ChatInput (固定底部)
- 未配置 API Key 时显示 ApiKeyGuide
- 消息样式：
  - 用户消息：靠右，浅色背景
  - AI 消息：靠左，Markdown 流式渲染
  - 历史卡片：独立卡片（favicon + 标题 + URL + 时间），可点击跳转

### 键盘交互
- Option+I (Mac) / Alt+I (Win)：唤醒 Side Panel
- Enter：发送消息
- Shift+Enter：换行
- Esc：关闭 Side Panel

---

## API Key 管理

- 存储：`chrome.storage.local`，key 为 `tipi.ai-settings`
- 配置入口：Options 页新增 "AI 助理" 区域
- 未配置时：Side Panel 显示引导页，提示前往 Options 配置
- 请求端点：`https://api.deepseek.com`（支持用户自定义 Base URL）
- 错误处理：
  - 401/402 → 提示 "API Key 无效或余额不足"
  - Network Error → 停止流式，显示重试按钮

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

- `langgraph` + `@langchain/core`：状态图编排
- `marked` 或手写 Markdown 解析器：AI 回复渲染
- DeepSeek Chat API：流式 LLM 调用

---

## 验收标准

1. 首字响应时间 < 800ms（正常网络）
2. Shadow DOM 样式在任何宿主网站下不受污染
3. 自省重试循环可通过 console.log 验证 Agent → Tool → Reflection → Retry → Respond 流程
4. API Key 配置后可正常对话，未配置时显示引导
5. 对话历史关闭 Side Panel 后重新打开可恢复
