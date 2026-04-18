import {
  getAllHistoryRecords,
  touchHistoryRecordById
} from "@/lib/storage/history-db";
import { hashUrl } from "@/lib/utils/string";
import { DEFAULT_MAX_RESULTS, searchHistoryRecords } from "@/lib/search/ranking";
import type { HistoryRecord, SearchResult } from "@/types/tipi";

const recordsById = new Map<number, HistoryRecord>();

export function clearSearchIndex() {
  recordsById.clear();
}

export async function rebuildSearchIndex(records?: HistoryRecord[]) {
  clearSearchIndex();

  const source = records ?? (await getAllHistoryRecords());

  for (const record of source) {
    recordsById.set(record.id, record);
  }
}

export function upsertSearchRecords(records: HistoryRecord[]) {
  for (const record of records) {
    recordsById.set(record.id, record);
  }
}

export function removeSearchRecordsByUrls(urls: string[]) {
  for (const url of urls) {
    recordsById.delete(hashUrl(url));
  }
}

export async function searchRecords(
  query: string,
  maxResults = DEFAULT_MAX_RESULTS
): Promise<SearchResult[]> {
  if (recordsById.size === 0) {
    await rebuildSearchIndex();
  }

  return searchHistoryRecords(Array.from(recordsById.values()), query, maxResults);
}

export async function touchSearchRecord(recordId: number) {
  const updated = await touchHistoryRecordById(recordId, Date.now());

  if (!updated) {
    return;
  }

  recordsById.set(updated.id, updated);
}
