import {
  getMetadataForRecords,
  getQueryEnvironmentIntent
} from "./metadata.ts";
import { normalizeText, tokenizeText } from "../utils/string.ts";
import type {
  HistoryRecord,
  SearchEnvironment,
  SearchMetadata,
  SearchResult
} from "../../types/tipi.ts";

export const DEFAULT_MAX_RESULTS = 12;

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

export function tokenizeQuery(query: string) {
  return tokenizeText(query);
}

function areCompatibleEnvironments(
  left: SearchEnvironment,
  right: SearchEnvironment
) {
  if (left === right) {
    return true;
  }

  return (
    (left === "live" && right === "prod") ||
    (left === "prod" && right === "live")
  );
}

function scoreEnvironmentIntent(
  metadata: SearchMetadata | undefined,
  environmentIntent: SearchEnvironment | null
) {
  if (!metadata || !environmentIntent) {
    return 0;
  }

  if (metadata.environment === environmentIntent) {
    return 160;
  }

  if (areCompatibleEnvironments(metadata.environment, environmentIntent)) {
    return 50;
  }

  if (metadata.environment === "unknown") {
    return -20;
  }

  return -120;
}

export function scoreRecord(record: HistoryRecord, query: string, tokens: string[]) {
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

function tokenMatchesMetadata(token: string, metadata: SearchMetadata | undefined) {
  const environmentIntent = getQueryEnvironmentIntent(token);

  if (!environmentIntent || !metadata) {
    return false;
  }

  return areCompatibleEnvironments(metadata.environment, environmentIntent);
}

export function matchesRecord(
  record: HistoryRecord,
  tokens: string[],
  metadata?: SearchMetadata
) {
  if (tokens.length === 0) {
    return false;
  }

  return tokens.every((token) => {
    return (
      record.normalizedTitle.includes(token) ||
      record.normalizedHostname.includes(token) ||
      record.normalizedUrl.includes(token) ||
      tokenMatchesMetadata(token, metadata)
    );
  });
}

export function compareSearchResults(left: SearchResult, right: SearchResult) {
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

function getExactHostnameKey(result: SearchResult) {
  return normalizeText(result.hostname);
}

function getHostnameFamilyKey(result: SearchResult) {
  return result.metadata?.hostFamily ?? normalizeText(result.hostname);
}

function getDiversifiedScore(
  result: SearchResult,
  exactHostCounts: Map<string, number>,
  hostFamilyCounts: Map<string, number>
) {
  const exactHostnameKey = getExactHostnameKey(result);
  const hostFamilyKey = getHostnameFamilyKey(result);
  const exactHostSeen = exactHostCounts.get(exactHostnameKey) ?? 0;
  const familySeen = hostFamilyCounts.get(hostFamilyKey) ?? 0;

  return (
    result.score -
    exactHostSeen * 96 -
    Math.max(0, familySeen - 1) * 18
  );
}

function diversifySearchResults(results: SearchResult[], maxResults: number) {
  const remaining = [...results];
  const selected: SearchResult[] = [];
  const exactHostCounts = new Map<string, number>();
  const hostFamilyCounts = new Map<string, number>();

  while (remaining.length > 0 && selected.length < maxResults) {
    let bestIndex = 0;
    let bestCandidateScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const diversifiedScore = getDiversifiedScore(
        candidate,
        exactHostCounts,
        hostFamilyCounts
      );

      if (diversifiedScore > bestCandidateScore) {
        bestCandidateScore = diversifiedScore;
        bestIndex = index;
        continue;
      }

      if (
        diversifiedScore === bestCandidateScore &&
        compareSearchResults(candidate, remaining[bestIndex]) < 0
      ) {
        bestIndex = index;
      }
    }

    const [winner] = remaining.splice(bestIndex, 1);

    if (!winner) {
      break;
    }

    const exactHostnameKey = getExactHostnameKey(winner);
    const hostFamilyKey = getHostnameFamilyKey(winner);

    exactHostCounts.set(exactHostnameKey, (exactHostCounts.get(exactHostnameKey) ?? 0) + 1);
    hostFamilyCounts.set(hostFamilyKey, (hostFamilyCounts.get(hostFamilyKey) ?? 0) + 1);
    selected.push(winner);
  }

  return selected;
}

export function searchHistoryRecords(
  records: HistoryRecord[],
  query: string,
  maxResults = DEFAULT_MAX_RESULTS
): SearchResult[] {
  const normalized = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const metadataById = getMetadataForRecords(records);
  const environmentIntent = getQueryEnvironmentIntent(query);

  if (!normalized) {
    return [...records]
      .sort((left, right) => right.lastVisitedAt - left.lastVisitedAt)
      .slice(0, maxResults)
      .map((record) => ({
        ...record,
        metadata: metadataById.get(record.id),
        score: 0
      }));
  }

  const rankedResults = records
    .filter((record) => matchesRecord(record, tokens, metadataById.get(record.id)))
    .map((record) => ({
      ...record,
      metadata: metadataById.get(record.id),
      score:
        scoreRecord(record, normalized, tokens) +
        scoreEnvironmentIntent(metadataById.get(record.id), environmentIntent)
    }))
    .sort(compareSearchResults);

  return diversifySearchResults(rankedResults, maxResults);
}
