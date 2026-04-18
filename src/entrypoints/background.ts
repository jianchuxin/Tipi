import { browser, type Browser } from "wxt/browser";
import {
  clearHistoryRecords,
  deleteHistoryRecordsByUrls,
  getHistoryStats,
  upsertHistoryRecords
} from "@/lib/storage/history-db";
import { fetchRecentHistory, mapHistoryItemToRecord } from "@/lib/history/fetch-history";
import {
  clearSearchIndex,
  removeSearchRecordsByUrls,
  rebuildSearchIndex,
  searchRecords,
  upsertSearchRecords,
  touchSearchRecord
} from "@/lib/search/search-index";
import type { TipiMessage, TipiSyncResponse } from "@/types/tipi";

const HISTORY_LIMIT = 5000;
const HISTORY_WINDOW_DAYS = 90;

function getHistoryStartTime() {
  return Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

async function openPopupWindow() {
  const currentWindow = await browser.windows.getCurrent();
  const width =
    typeof currentWindow.width === "number"
      ? Math.min(760, Math.max(620, currentWindow.width - 180))
      : 700;
  const height =
    typeof currentWindow.height === "number"
      ? Math.min(620, Math.max(500, currentWindow.height - 180))
      : 560;
  const left =
    typeof currentWindow.left === "number" && typeof currentWindow.width === "number"
      ? currentWindow.left + Math.max(0, Math.round((currentWindow.width - width) / 2))
      : undefined;
  const top =
    typeof currentWindow.top === "number" && typeof currentWindow.height === "number"
      ? currentWindow.top + Math.max(40, Math.round((currentWindow.height - height) / 2))
      : undefined;

  await browser.windows.create({
    url: browser.runtime.getURL("/popup.html"),
    type: "popup",
    width,
    height,
    left,
    top,
    focused: true
  });
}

async function toggleOverlayInActiveTab() {
  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!activeTab?.id) {
    await openPopupWindow();
    return;
  }

  try {
    await browser.tabs.sendMessage(activeTab.id, {
      type: "tipi.toggle-overlay"
    });
  } catch (error) {
    console.warn("[Tipi] failed to toggle in-page overlay, fallback to popup window", error);
    await openPopupWindow();
  }
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

async function handleHistoryVisited(item: Browser.history.HistoryItem) {
  const record = mapHistoryItemToRecord(item);

  if (!record) {
    return;
  }

  await upsertHistoryRecords([record]);
  upsertSearchRecords([record]);
}

async function handleHistoryRemoved(
  removed: Browser.history.RemovedResult
) {
  if (removed.allHistory) {
    await clearHistoryRecords();
    clearSearchIndex();
    return;
  }

  const urls = removed.urls ?? [];

  if (urls.length === 0) {
    return;
  }

  await deleteHistoryRecordsByUrls(urls);
  removeSearchRecordsByUrls(urls);
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

    browser.history.onVisited.addListener((item) => {
      void handleHistoryVisited(item);
    });

    browser.history.onVisitRemoved.addListener((removed) => {
      void handleHistoryRemoved(removed);
    });

    browser.commands.onCommand.addListener((command) => {
      if (command !== "tipi.open-search") {
        return;
      }

      void toggleOverlayInActiveTab();
    });

    browser.runtime.onMessage.addListener(
      (message: TipiMessage, _sender, sendResponse) => {
        void (async () => {
          try {
            switch (message.type) {
              case "tipi.search":
                sendResponse(await searchRecords(message.query));
                return;
              case "tipi.sync-history":
                sendResponse(await syncHistoryIndex());
                return;
              case "tipi.get-stats":
                sendResponse(await getHistoryStats());
                return;
              case "tipi.clear-data":
                await clearHistoryRecords();
                clearSearchIndex();
                sendResponse({ ok: true });
                return;
              case "tipi.open-url":
                await touchSearchRecord(message.recordId);
                await browser.tabs.create({ url: message.url });
                sendResponse({ ok: true });
                return;
              default:
                sendResponse(null);
            }
          } catch (error) {
            console.error("[Tipi] message handling failed", error);
            sendResponse({
              error:
                error instanceof Error ? error.message : "Unknown background error"
            });
          }
        })();

        return true;
      }
    );
  }
});
