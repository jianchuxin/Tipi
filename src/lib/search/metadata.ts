import { normalizeText } from "../utils/string.ts";
import type {
  HistoryRecord,
  SearchEnvironment,
  SearchMetadata
} from "../../types/tipi.ts";

const ENVIRONMENT_ALIASES = new Map<string, SearchEnvironment>([
  ["test", "test"],
  ["testing", "test"],
  ["live", "live"],
  ["prod", "prod"],
  ["production", "prod"],
  ["stage", "staging"],
  ["staging", "staging"],
  ["dev", "dev"],
  ["development", "dev"],
  ["uat", "uat"],
  ["qa", "qa"],
  ["preview", "preview"],
  ["sandbox", "sandbox"]
]);

export const QUERY_ENVIRONMENT_TOKENS = new Set(ENVIRONMENT_ALIASES.keys());

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "").trim();
}

function normalizeHostnameSegment(segment: string) {
  return normalizeText(segment).replace(/\s+/g, "-");
}

function getSegmentEnvironment(segment: string) {
  return ENVIRONMENT_ALIASES.get(normalizeHostnameSegment(segment)) ?? null;
}

function getHostnameSegments(hostname: string) {
  return normalizeHostname(hostname)
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getQueryEnvironmentIntent(query: string) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const environment = ENVIRONMENT_ALIASES.get(token);

    if (environment) {
      return environment;
    }
  }

  return null;
}

export function parseSearchMetadata(hostname: string): SearchMetadata {
  const segments = getHostnameSegments(hostname);
  const businessSegments: string[] = [];
  let environment: SearchEnvironment = "unknown";

  for (const segment of segments) {
    const segmentEnvironment = getSegmentEnvironment(segment);

    if (segmentEnvironment) {
      if (environment === "unknown") {
        environment = segmentEnvironment;
      }
      continue;
    }

    businessSegments.push(segment);
  }

  const hostFamily = businessSegments.join(".") || normalizeHostname(hostname);

  return {
    environment,
    serviceKey: businessSegments[0] ?? null,
    domainKey: businessSegments[1] ?? null,
    hostFamily
  };
}

export function getMetadataForRecords(records: HistoryRecord[]) {
  const metadataById = new Map<number, SearchMetadata>();
  const familyEnvironmentCounts = new Map<string, Set<SearchEnvironment>>();

  for (const record of records) {
    const metadata = parseSearchMetadata(record.hostname);
    metadataById.set(record.id, metadata);

    const environments =
      familyEnvironmentCounts.get(metadata.hostFamily) ?? new Set<SearchEnvironment>();
    environments.add(metadata.environment);
    familyEnvironmentCounts.set(metadata.hostFamily, environments);
  }

  for (const record of records) {
    const metadata = metadataById.get(record.id);

    if (!metadata || metadata.environment !== "unknown") {
      continue;
    }

    const siblingEnvironments = familyEnvironmentCounts.get(metadata.hostFamily);
    const hasKnownNonLiveSibling = [...(siblingEnvironments ?? [])].some(
      (environment) => environment !== "unknown" && environment !== "live"
    );

    if (!hasKnownNonLiveSibling) {
      continue;
    }

    metadataById.set(record.id, {
      ...metadata,
      environment: "live"
    });
  }

  return metadataById;
}

export function getEnvironmentLabel(environment: SearchEnvironment) {
  switch (environment) {
    case "prod":
      return "PROD";
    case "staging":
      return "STAGE";
    case "unknown":
      return null;
    default:
      return environment.toUpperCase();
  }
}
