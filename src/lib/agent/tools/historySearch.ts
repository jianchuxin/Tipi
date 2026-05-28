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
