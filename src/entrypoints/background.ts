import { browser } from "wxt/browser";
import { clearHistoryRecords, getHistoryStats, upsertHistoryRecords } from "@/lib/storage/history-db";
import { fetchRecentHistory } from "@/lib/history/fetch-history";
import {
  clearSearchIndex,
  rebuildSearchIndex,
  searchRecords,
  touchSearchRecord
} from "@/lib/search/search-index";
import type { TipiMessage, TipiSyncResponse } from "@/types/tipi";

const HISTORY_LIMIT = 5000;
const HISTORY_WINDOW_DAYS = 90;

function getHistoryStartTime() {
  return Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

async function syncHistoryIndex(): Promise<TipiSyncResponse> {
  const records = await fetchRecentHistory({
    maxResults: HISTORY_LIMIT,
    startTime: getHistoryStartTime()
  });

  await upsertHistoryRecords(records);
  await rebuildSearchIndex(records);

  return {
    synced: records.length,
    at: Date.now()
  };
}

async function bootstrap() {
  try {
    const syncResult = await syncHistoryIndex();
    console.info("[Tipi] history synced", syncResult);
  } catch (error) {
    console.error("[Tipi] bootstrap failed", error);
  }
}

export default defineBackground({
  main() {
    void bootstrap();

    browser.runtime.onInstalled.addListener(() => {
      void syncHistoryIndex();
    });

    browser.runtime.onStartup?.addListener(() => {
      void syncHistoryIndex();
    });

    browser.commands.onCommand.addListener((command) => {
      if (command !== "tipi.open-search") {
        return;
      }

      void browser.tabs.create({
        url: browser.runtime.getURL("popup.html")
      });
    });

    browser.runtime.onMessage.addListener(
      async (message: TipiMessage): Promise<unknown> => {
        switch (message.type) {
          case "tipi.search":
            return searchRecords(message.query);
          case "tipi.sync-history":
            return syncHistoryIndex();
          case "tipi.get-stats":
            return getHistoryStats();
          case "tipi.clear-data":
            await clearHistoryRecords();
            clearSearchIndex();
            return { ok: true };
          case "tipi.open-url":
            await touchSearchRecord(message.recordId);
            await browser.tabs.create({ url: message.url });
            return { ok: true };
          default:
            return null;
        }
      }
    );
  }
});
