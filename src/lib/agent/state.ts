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
