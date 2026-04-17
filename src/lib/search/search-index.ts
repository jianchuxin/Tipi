import { Index } from "flexsearch";
import {
  getAllHistoryRecords,
  touchHistoryRecordById
} from "@/lib/storage/history-db";
import type { HistoryRecord, SearchResult } from "@/types/tipi";

const searchIndex = new Index({
  tokenize: "forward"
});

const recordsById = new Map<number, HistoryRecord>();

function buildSearchText(record: HistoryRecord) {
  return [
    record.normalizedTitle,
    record.normalizedHostname,
    record.normalizedUrl
  ].join(" ");
}

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
  searchIndex.clear();
  recordsById.clear();
}

export async function rebuildSearchIndex(records?: HistoryRecord[]) {
  clearSearchIndex();

  const source = records ?? (await getAllHistoryRecords());

  for (const record of source) {
    recordsById.set(record.id, record);
    searchIndex.add(record.id, buildSearchText(record));
  }
}

export async function searchRecords(query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  if (recordsById.size === 0) {
    await rebuildSearchIndex();
  }

  const hits = (searchIndex.search(normalized, 20) as number[]) ?? [];

  return hits
    .map((id) => recordsById.get(id))
    .filter((record): record is HistoryRecord => Boolean(record))
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

