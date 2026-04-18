import {
  getAllHistoryRecords,
  touchHistoryRecordById
} from "@/lib/storage/history-db";
import { hashUrl, normalizeText, tokenizeText } from "@/lib/utils/string";
import type { HistoryRecord, SearchResult } from "@/types/tipi";

const recordsById = new Map<number, HistoryRecord>();
const MAX_RESULTS = 12;

function tokenizeQuery(query: string) {
  return tokenizeText(query);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWordStarts(value: string, token: string) {
  if (!value || !token) {
    return 0;
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}`, "g");
  return value.match(pattern)?.length ?? 0;
}

function scoreRecency(timestamp: number) {
  const ageInDays = Math.max(0, (Date.now() - timestamp) / 86400000);

  if (ageInDays < 1) {
    return 24;
  }

  if (ageInDays < 3) {
    return 18;
  }

  if (ageInDays < 7) {
    return 12;
  }

  if (ageInDays < 30) {
    return 6;
  }

  return 0;
}

function scoreOpenedByTipi(timestamp: number | null) {
  if (!timestamp) {
    return 0;
  }

  const ageInDays = Math.max(0, (Date.now() - timestamp) / 86400000);

  if (ageInDays < 3) {
    return 18;
  }

  if (ageInDays < 14) {
    return 10;
  }

  return 4;
}

function scoreRecord(record: HistoryRecord, query: string, tokens: string[]) {
  let score = 0;
  const title = record.normalizedTitle;
  const hostname = record.normalizedHostname;
  const url = record.normalizedUrl;

  if (title === query) {
    score += 220;
  }

  if (hostname === query) {
    score += 200;
  }

  if (url === query) {
    score += 180;
  }

  if (title.startsWith(query)) {
    score += 120;
  } else if (countWordStarts(title, query) > 0) {
    score += 80;
  } else if (title.includes(query)) {
    score += 45;
  }

  if (hostname.startsWith(query)) {
    score += 95;
  } else if (countWordStarts(hostname, query) > 0) {
    score += 60;
  } else if (hostname.includes(query)) {
    score += 34;
  }

  if (url.startsWith(query)) {
    score += 60;
  } else if (url.includes(query)) {
    score += 24;
  }

  let matchedTokenCount = 0;

  for (const token of tokens) {
    const titleHasToken = title.includes(token);
    const hostnameHasToken = hostname.includes(token);
    const urlHasToken = url.includes(token);

    if (titleHasToken || hostnameHasToken || urlHasToken) {
      matchedTokenCount += 1;
    }

    if (title.startsWith(token)) {
      score += 38;
    } else if (countWordStarts(title, token) > 0) {
      score += 28;
    } else if (titleHasToken) {
      score += 14;
    }

    if (hostname.startsWith(token)) {
      score += 32;
    } else if (countWordStarts(hostname, token) > 0) {
      score += 20;
    } else if (hostnameHasToken) {
      score += 12;
    }

    if (urlHasToken) {
      score += 6;
    }
  }

  if (tokens.length > 1 && matchedTokenCount === tokens.length) {
    score += 36;
  }

  score += Math.min(record.visitCount, 25) * 1.8;
  score += Math.min(record.typedCount, 12) * 5;
  score += scoreRecency(record.lastVisitedAt);
  score += scoreOpenedByTipi(record.lastOpenedByTipiAt);

  if (record.title.trim().length > 0) {
    score += 8;
  }

  return Math.round(score);
}

function matchesRecord(record: HistoryRecord, tokens: string[]) {
  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => {
    return (
      record.normalizedTitle.includes(token) ||
      record.normalizedHostname.includes(token) ||
      record.normalizedUrl.includes(token)
    );
  });
}

function compareSearchResults(left: SearchResult, right: SearchResult) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if ((right.lastOpenedByTipiAt ?? 0) !== (left.lastOpenedByTipiAt ?? 0)) {
    return (right.lastOpenedByTipiAt ?? 0) - (left.lastOpenedByTipiAt ?? 0);
  }

  if (right.lastVisitedAt !== left.lastVisitedAt) {
    return right.lastVisitedAt - left.lastVisitedAt;
  }

  if (right.visitCount !== left.visitCount) {
    return right.visitCount - left.visitCount;
  }

  return right.typedCount - left.typedCount;
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
  const normalized = normalizeText(query);
  const tokens = tokenizeQuery(query);

  if (recordsById.size === 0) {
    await rebuildSearchIndex();
  }

  const records = Array.from(recordsById.values());

  if (!normalized) {
    return records
      .sort((left, right) => right.lastVisitedAt - left.lastVisitedAt)
      .slice(0, MAX_RESULTS)
      .map((record) => ({
        ...record,
        score: 0
      }));
  }

  return records
    .filter((record) => matchesRecord(record, tokens))
    .map((record) => ({
      ...record,
      score: scoreRecord(record, normalized, tokens)
    }))
    .sort(compareSearchResults)
    .slice(0, MAX_RESULTS);
}

export async function touchSearchRecord(recordId: number) {
  const updated = await touchHistoryRecordById(recordId, Date.now());

  if (!updated) {
    return;
  }

  recordsById.set(updated.id, updated);
}
