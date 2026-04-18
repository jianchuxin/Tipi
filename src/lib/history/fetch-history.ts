import { browser, type Browser } from "wxt/browser";
import { hashUrl, normalizeText, normalizeUrlForSearch } from "@/lib/utils/string";
import type { HistoryRecord } from "@/types/tipi";

type FetchRecentHistoryOptions = {
  maxResults: number;
  startTime: number;
};

export function mapHistoryItemToRecord(
  item: Browser.history.HistoryItem
): HistoryRecord | null {
  if (!item.url) {
    return null;
  }

  try {
    const hostname = new URL(item.url).hostname.replace(/^www\./, "");

    return {
      id: hashUrl(item.url),
      url: item.url,
      title: item.title?.trim() || "",
      normalizedTitle: normalizeText(item.title || ""),
      hostname,
      normalizedHostname: normalizeText(hostname),
      normalizedUrl: normalizeUrlForSearch(item.url),
      lastVisitedAt: item.lastVisitTime ?? Date.now(),
      visitCount: item.visitCount ?? 0,
      typedCount: item.typedCount ?? 0,
      lastOpenedByTipiAt: null
    };
  } catch {
    return null;
  }
}

export async function fetchRecentHistory(
  options: FetchRecentHistoryOptions
): Promise<HistoryRecord[]> {
  const items = await browser.history.search({
    text: "",
    startTime: options.startTime,
    maxResults: options.maxResults
  });

  return items
    .map((item) => mapHistoryItemToRecord(item))
    .filter((item): item is HistoryRecord => item !== null);
}
