import assert from "node:assert/strict";
import test from "node:test";
import {
  getEnvironmentLabel,
  getMetadataForRecords,
  getQueryEnvironmentIntent,
  parseSearchMetadata
} from "../../src/lib/search/metadata.ts";
import { hashUrl, normalizeText, normalizeUrlForSearch } from "../../src/lib/utils/string.ts";
import type { HistoryRecord } from "../../src/types/tipi.ts";

function createRecord(url: string): HistoryRecord {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  return {
    id: hashUrl(url),
    url,
    title: hostname,
    hostname,
    normalizedTitle: normalizeText(hostname),
    normalizedHostname: normalizeText(hostname),
    normalizedUrl: normalizeUrlForSearch(url),
    lastVisitedAt: 100,
    visitCount: 1,
    typedCount: 0,
    lastOpenedByTipiAt: null
  };
}

test("parses explicit environment and host family from hostname", () => {
  const metadata = parseSearchMetadata(
    "stellios-abtest.fp-data.test.shopee.io"
  );

  assert.equal(metadata.environment, "test");
  assert.equal(metadata.serviceKey, "stellios-abtest");
  assert.equal(metadata.domainKey, "fp-data");
  assert.equal(metadata.hostFamily, "stellios-abtest.fp-data.shopee.io");
});

test("normalizes environment aliases", () => {
  assert.equal(parseSearchMetadata("service.production.example.com").environment, "prod");
  assert.equal(parseSearchMetadata("service.stage.example.com").environment, "staging");
  assert.equal(parseSearchMetadata("service.development.example.com").environment, "dev");
});

test("keeps unknown environment until sibling inference has context", () => {
  const metadata = parseSearchMetadata("stellios-abtest.fp-data.shopee.io");

  assert.equal(metadata.environment, "unknown");
  assert.equal(metadata.hostFamily, "stellios-abtest.fp-data.shopee.io");
});

test("infers no-env sibling as live when a known environment sibling exists", () => {
  const testRecord = createRecord(
    "https://stellios-abtest.fp-data.test.shopee.io/dashboard"
  );
  const liveRecord = createRecord(
    "https://stellios-abtest.fp-data.shopee.io/dashboard"
  );

  const metadataById = getMetadataForRecords([testRecord, liveRecord]);

  assert.equal(metadataById.get(testRecord.id)?.environment, "test");
  assert.equal(metadataById.get(liveRecord.id)?.environment, "live");
});

test("does not infer live for a standalone unknown host", () => {
  const record = createRecord("https://openai.com/research");
  const metadataById = getMetadataForRecords([record]);

  assert.equal(metadataById.get(record.id)?.environment, "unknown");
});

test("detects query environment intent and display labels", () => {
  assert.equal(getQueryEnvironmentIntent("abtest live"), "live");
  assert.equal(getQueryEnvironmentIntent("abtest production"), "prod");
  assert.equal(getQueryEnvironmentIntent("abtest staging"), "staging");
  assert.equal(getEnvironmentLabel("staging"), "STAGE");
  assert.equal(getEnvironmentLabel("unknown"), null);
});
