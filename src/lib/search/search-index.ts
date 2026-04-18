import {
  getAllHistoryRecords,
  touchHistoryRecordById
} from "@/lib/storage/history-db";
import { hashUrl } from "@/lib/utils/string";
import type { HistoryRecord, SearchResult } from "@/types/tipi";

const recordsById = new Map<number, HistoryRecord>();

function scoreRecord(record: HistoryRecord, query: string) {
  let score = 0;

  if (record.normalizedTitle.startsWith(query)) {
    score += 50;
  } else if (record.normalizedTitle.includes(query)) {
    score += 30;
  }

  if (record.normalizedHostname.includes(query)) {
    score += 24;
  }

  if (record.normalizedUrl.includes(query)) {
    score += 16;
  }

  score += Math.min(record.visitCount, 20);
  score += Math.max(0, 10 - Math.floor((Date.now() - record.lastVisitedAt) / 86400000));

  if (record.lastOpenedByTipiAt) {
    score += 12;
  }

  return score;
}

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

export async function searchRecords(query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();

  if (recordsById.size === 0) {
    await rebuildSearchIndex();
  }

  const records = Array.from(recordsById.values());

  if (!normalized) {
    return records
      .sort((left, right) => right.lastVisitedAt - left.lastVisitedAt)
      .slice(0, 10)
      .map((record) => ({
        ...record,
        score: 0
      }));
  }

  return records
    .filter((record) => {
      return (
        record.normalizedTitle.includes(normalized) ||
        record.normalizedHostname.includes(normalized) ||
        record.normalizedUrl.includes(normalized)
      );
    })
    .map((record) => ({
      ...record,
      score: scoreRecord(record, normalized)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);
}

export async function touchSearchRecord(recordId: number) {
  const updated = await touchHistoryRecordById(recordId, Date.now());

  if (!updated) {
    return;
  }

  recordsById.set(updated.id, updated);
}
