import assert from "node:assert/strict";
import test from "node:test";
import { searchHistoryRecords } from "../../src/lib/search/ranking.ts";
import { hashUrl, normalizeText, normalizeUrlForSearch } from "../../src/lib/utils/string.ts";
import type { HistoryRecord } from "../../src/types/tipi.ts";

function createRecord(input: {
  url: string;
  title: string;
  lastVisitedAt: number;
  visitCount?: number;
  typedCount?: number;
  lastOpenedByTipiAt?: number | null;
}): HistoryRecord {
  const hostname = new URL(input.url).hostname.replace(/^www\./, "");

  return {
    id: hashUrl(input.url),
    url: input.url,
    title: input.title,
    hostname,
    normalizedTitle: normalizeText(input.title),
    normalizedHostname: normalizeText(hostname),
    normalizedUrl: normalizeUrlForSearch(input.url),
    lastVisitedAt: input.lastVisitedAt,
    visitCount: input.visitCount ?? 1,
    typedCount: input.typedCount ?? 0,
    lastOpenedByTipiAt: input.lastOpenedByTipiAt ?? null
  };
}

test("empty query returns most recent records first", () => {
  const results = searchHistoryRecords(
    [
      createRecord({
        url: "https://archdaily.com/older",
        title: "Older Record",
        lastVisitedAt: 100
      }),
      createRecord({
        url: "https://archdaily.com/newer",
        title: "Newer Record",
        lastVisitedAt: 300
      }),
      createRecord({
        url: "https://archdaily.com/middle",
        title: "Middle Record",
        lastVisitedAt: 200
      })
    ],
    ""
  );

  assert.deepEqual(
    results.map((result) => result.title),
    ["Newer Record", "Middle Record", "Older Record"]
  );
  assert(results.every((result) => result.score === 0));
});

test("multi-token query requires all tokens and favors stronger title matches", (t) => {
  t.mock.method(Date, "now", () => 1_710_000_000_000);

  const results = searchHistoryRecords(
    [
      createRecord({
        url: "https://designhistory.org/bauhaus/type",
        title: "Bauhaus Typography Principles",
        lastVisitedAt: 1_709_999_000_000,
        visitCount: 6,
        typedCount: 2
      }),
      createRecord({
        url: "https://example.com/bauhaus/catalog",
        title: "Bauhaus Archive Catalog",
        lastVisitedAt: 1_709_998_000_000,
        visitCount: 3,
        typedCount: 0
      }),
      createRecord({
        url: "https://example.com/typography/essay",
        title: "Modern Typography Essay",
        lastVisitedAt: 1_709_997_000_000,
        visitCount: 8,
        typedCount: 1
      })
    ],
    "bauhaus typography"
  );

  assert.deepEqual(
    results.map((result) => result.title),
    ["Bauhaus Typography Principles"]
  );
});

test("recent Tipi-opened records win tie-breaks against similar matches", (t) => {
  const now = 1_710_000_000_000;
  t.mock.method(Date, "now", () => now);

  const results = searchHistoryRecords(
    [
      createRecord({
        url: "https://figma.com/file/smith-residence-v2",
        title: "Client Presentation Smith Residence",
        lastVisitedAt: now - 2 * 86400000,
        visitCount: 4,
        typedCount: 1,
        lastOpenedByTipiAt: now - 3600000
      }),
      createRecord({
        url: "https://drive.example.com/smith-residence-v1",
        title: "Client Presentation Smith Residence",
        lastVisitedAt: now - 2 * 86400000,
        visitCount: 4,
        typedCount: 1,
        lastOpenedByTipiAt: null
      })
    ],
    "smith residence"
  );

  assert.equal(results[0]?.url, "https://figma.com/file/smith-residence-v2");
});

test("hostname normalization allows domain-style queries to match www URLs", () => {
  const results = searchHistoryRecords(
    [
      createRecord({
        url: "https://www.openai.com/research/gpt-5",
        title: "GPT-5 Research",
        lastVisitedAt: 200
      })
    ],
    "openai.com research"
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.hostname, "openai.com");
});
