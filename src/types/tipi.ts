export type HistoryRecord = {
  id: number;
  url: string;
  title: string;
  hostname: string;
  normalizedTitle: string;
  normalizedHostname: string;
  normalizedUrl: string;
  lastVisitedAt: number;
  visitCount: number;
  typedCount: number;
  lastOpenedByTipiAt: number | null;
};

export type SearchResult = HistoryRecord & {
  score: number;
};

export type TipiStatsResponse = {
  totalRecords: number;
  lastSyncedAt: number | null;
  estimatedStorageBytes: number;
};

export type TipiSyncResponse = {
  synced: number;
  at: number;
};

export type TipiMessage =
  | {
      type: "tipi.toggle-overlay";
    }
  | {
      type: "tipi.search";
      query: string;
    }
  | {
      type: "tipi.sync-history";
    }
  | {
      type: "tipi.get-stats";
    }
  | {
      type: "tipi.clear-data";
    }
  | {
      type: "tipi.open-url";
      url: string;
      recordId: number;
    };
