import { browser } from "wxt/browser";
import type { TipiSettings } from "@/types/tipi";

export const TIPI_SETTINGS_STORAGE_KEY = "tipi.settings";

export const DEFAULT_TIPI_SETTINGS: TipiSettings = {
  autoSyncEnabled: true,
  maxIndexedRecords: 5000,
  maxSearchResults: 12,
  showFavicons: true,
  recordOpenEvents: true
};

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeTipiSettings(value: unknown): TipiSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_TIPI_SETTINGS;
  }

  const candidate = value as Record<string, unknown>;

  return {
    autoSyncEnabled:
      typeof candidate.autoSyncEnabled === "boolean"
        ? candidate.autoSyncEnabled
        : DEFAULT_TIPI_SETTINGS.autoSyncEnabled,
    maxIndexedRecords: clampInteger(
      candidate.maxIndexedRecords,
      250,
      20000,
      DEFAULT_TIPI_SETTINGS.maxIndexedRecords
    ),
    maxSearchResults: clampInteger(
      candidate.maxSearchResults,
      5,
      50,
      DEFAULT_TIPI_SETTINGS.maxSearchResults
    ),
    showFavicons:
      typeof candidate.showFavicons === "boolean"
        ? candidate.showFavicons
        : DEFAULT_TIPI_SETTINGS.showFavicons,
    recordOpenEvents:
      typeof candidate.recordOpenEvents === "boolean"
        ? candidate.recordOpenEvents
        : DEFAULT_TIPI_SETTINGS.recordOpenEvents
  };
}

export async function getTipiSettings() {
  const stored = await browser.storage.local.get(TIPI_SETTINGS_STORAGE_KEY);
  return normalizeTipiSettings(stored[TIPI_SETTINGS_STORAGE_KEY]);
}

export async function updateTipiSettings(patch: Partial<TipiSettings>) {
  const current = await getTipiSettings();
  const next = normalizeTipiSettings({
    ...current,
    ...patch
  });

  await browser.storage.local.set({
    [TIPI_SETTINGS_STORAGE_KEY]: next
  });

  return next;
}
