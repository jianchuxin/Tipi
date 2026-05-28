import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { type AIMessage, ToolMessage } from "@langchain/core/messages";
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

    const toolMessage = await tipiHistorySearchTool.invoke(toolCall);
    const resultString = typeof toolMessage.content === "string" ? toolMessage.content : JSON.stringify(toolMessage.content);
    const results = JSON.parse(resultString);

    onStreamEvent({
      type: "TOOL_END",
      payload: { toolName: toolCall.name, results: Array.isArray(results) ? results : [] },
    });

    const resultList = Array.isArray(results) ? results : [];

    return {
      messages: [
        new ToolMessage({ content: resultString, tool_call_id: toolCall.id ?? "" }),
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
