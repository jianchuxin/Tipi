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
