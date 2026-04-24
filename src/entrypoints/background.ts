import { browser, type Browser } from "wxt/browser";
import {
  clearHistoryRecords,
  deleteHistoryRecordsByUrls,
  getHistoryStats,
  upsertHistoryRecords
} from "@/lib/storage/history-db";
import { fetchRecentHistory, mapHistoryItemToRecord } from "@/lib/history/fetch-history";
import {
  DEFAULT_TIPI_SETTINGS,
  getTipiSettings,
  normalizeTipiSettings,
  TIPI_SETTINGS_STORAGE_KEY
} from "@/lib/settings/tipi-settings";
import {
  clearSearchIndex,
  removeSearchRecordsByUrls,
  rebuildSearchIndex,
  searchRecords,
  upsertSearchRecords,
  touchSearchRecord
} from "@/lib/search/search-index";
import {
  formatShortcutLabel,
  readOpenSearchShortcutLabelFromCommands
} from "@/lib/shortcuts/open-search-shortcut";
import type { TipiMessage, TipiSettings, TipiSyncResponse } from "@/types/tipi";

const HISTORY_WINDOW_DAYS = 90;
let popupWindowId: number | null = null;
let currentSettings: TipiSettings = DEFAULT_TIPI_SETTINGS;

function getExtensionPageUrl(path: string) {
  return (browser.runtime as typeof browser.runtime & {
    getURL: (url: string) => string;
  }).getURL(path);
}

function getHistoryStartTime() {
  return Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

async function getExistingPopupWindow() {
  if (typeof popupWindowId === "number") {
    try {
      return await browser.windows.get(popupWindowId, { populate: true });
    } catch {
      popupWindowId = null;
    }
  }

  const popupUrl = getExtensionPageUrl("/popup.html");
  const popupTabs = await browser.tabs.query({ url: popupUrl });
  const popupTab = popupTabs[0];

  if (!popupTab?.windowId) {
    return null;
  }

  const existingWindow = await browser.windows.get(popupTab.windowId, {
    populate: true
  });
  popupWindowId = existingWindow.id ?? null;
  return existingWindow;
}

async function focusPopupWindow(windowId: number, tabId?: number) {
  await browser.windows.update(windowId, {
    focused: true
  });

  if (typeof tabId === "number") {
    await browser.tabs.update(tabId, {
      active: true
    });
  }
}

async function openPopupWindow() {
  const existingWindow = await getExistingPopupWindow();

  if (existingWindow?.id) {
    const popupTab = existingWindow.tabs?.find((tab) =>
      tab.url?.startsWith(getExtensionPageUrl("/popup.html"))
    );
    await focusPopupWindow(existingWindow.id, popupTab?.id);
    return;
  }

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

  const createdWindow = await browser.windows.create({
    url: getExtensionPageUrl("/popup.html"),
    type: "popup",
    width,
    height,
    left,
    top,
    focused: true
  });

  popupWindowId = createdWindow?.id ?? null;
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
    maxResults: currentSettings.maxIndexedRecords,
    startTime: getHistoryStartTime()
  });

  await upsertHistoryRecords(records);
  await rebuildSearchIndex(records);

  return {
    synced: records.length,
    at: Date.now()
  };
}

async function getOpenSearchShortcutResponse() {
  const shortcut = await readOpenSearchShortcutLabelFromCommands();

  if (shortcut) {
    return { shortcut };
  }

  const platform = await browser.runtime.getPlatformInfo();
  return {
    shortcut: formatShortcutLabel(platform.os === "mac" ? "Option+K" : "Alt+K")
  };
}

async function bootstrap() {
  try {
    currentSettings = await getTipiSettings();

    if (!currentSettings.autoSyncEnabled) {
      return;
    }

    const syncResult = await syncHistoryIndex();
    console.info("[Tipi] history synced", syncResult);
  } catch (error) {
    console.error("[Tipi] bootstrap failed", error);
  }
}

async function handleHistoryVisited(item: Browser.history.HistoryItem) {
  if (!currentSettings.autoSyncEnabled) {
    return;
  }

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
  if (!currentSettings.autoSyncEnabled) {
    return;
  }

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

async function handleOpenUrl(
  message: Extract<TipiMessage, { type: "tipi.open-url" }>,
  sender: Browser.runtime.MessageSender
) {
  if (
    currentSettings.recordOpenEvents &&
    typeof message.recordId === "number"
  ) {
    await touchSearchRecord(message.recordId);
  }

  const extensionBaseUrl = getExtensionPageUrl("/");
  const canReuseSenderTab =
    !message.openInNewTab &&
    typeof sender.tab?.id === "number" &&
    typeof sender.tab.url === "string" &&
    !sender.tab.url.startsWith(extensionBaseUrl);

  if (canReuseSenderTab) {
    const senderTabId = sender.tab?.id;

    if (typeof senderTabId !== "number") {
      return;
    }

    await browser.tabs.update(senderTabId, {
      url: message.url
    });
    return;
  }

  await browser.tabs.create({
    url: message.url,
    active: true
  });
}

export default defineBackground({
  main() {
    void bootstrap();

    browser.windows.onRemoved.addListener((windowId) => {
      if (windowId === popupWindowId) {
        popupWindowId = null;
      }
    });

    browser.runtime.onInstalled.addListener(() => {
      if (currentSettings.autoSyncEnabled) {
        void syncHistoryIndex();
      }
    });

    browser.runtime.onStartup?.addListener(() => {
      if (currentSettings.autoSyncEnabled) {
        void syncHistoryIndex();
      }
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[TIPI_SETTINGS_STORAGE_KEY]) {
        return;
      }

      const previousSettings = currentSettings;
      currentSettings = normalizeTipiSettings(changes[TIPI_SETTINGS_STORAGE_KEY].newValue);

      const shouldResync =
        currentSettings.autoSyncEnabled &&
        (!previousSettings.autoSyncEnabled ||
          previousSettings.maxIndexedRecords !== currentSettings.maxIndexedRecords);

      if (shouldResync) {
        void syncHistoryIndex();
      }
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
      (message: TipiMessage, sender, sendResponse) => {
        void (async () => {
          try {
            switch (message.type) {
              case "tipi.search":
                sendResponse(
                  await searchRecords(
                    message.query,
                    currentSettings.maxSearchResults
                  )
                );
                return;
              case "tipi.sync-history":
                sendResponse(await syncHistoryIndex());
                return;
              case "tipi.get-stats":
                sendResponse(await getHistoryStats());
                return;
              case "tipi.get-open-search-shortcut":
                sendResponse(await getOpenSearchShortcutResponse());
                return;
              case "tipi.clear-data":
                await clearHistoryRecords();
                clearSearchIndex();
                sendResponse({ ok: true });
                return;
              case "tipi.open-url":
                await handleOpenUrl(message, sender);
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
