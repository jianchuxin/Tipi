import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { BrandMark } from "@/components/BrandMark";
import { DEFAULT_TIPI_SETTINGS, getTipiSettings, updateTipiSettings } from "@/lib/settings/tipi-settings";
import { getOpenSearchShortcutLabel } from "@/lib/shortcuts/open-search-shortcut";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CloudSyncIcon,
  DatabaseIcon,
  DocumentIcon,
  HistoryIcon,
  SyncIcon,
  TrashIcon,
  UserCircleIcon,
  XCircleIcon
} from "@/components/icons";
import { formatCompactNumber, formatRelativeDate, formatStorageSize } from "@/lib/utils/format";
import type { TipiSettings, TipiStatsResponse, TipiSyncResponse } from "@/types/tipi";

const initialStats: TipiStatsResponse = {
  totalRecords: 0,
  lastSyncedAt: null,
  estimatedStorageBytes: 0
};

function getExtensionPageUrl(path: string) {
  return (browser.runtime as typeof browser.runtime & {
    getURL: (url: string) => string;
  }).getURL(path);
}

function isTipiStatsResponse(value: unknown): value is TipiStatsResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.totalRecords === "number" &&
    typeof candidate.estimatedStorageBytes === "number" &&
    (typeof candidate.lastSyncedAt === "number" ||
      candidate.lastSyncedAt === null)
  );
}

function isTipiSyncResponse(value: unknown): value is TipiSyncResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.synced === "number" && typeof candidate.at === "number";
}

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.error === "string" ? candidate.error : null;
}

function MetricCard({
  label,
  value,
  tone = "default",
  icon
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
  icon: ReactNode;
}) {
  return (
    <article className="journal-card relative overflow-hidden rounded-[20px] p-6">
      <div className="absolute right-5 top-4 text-[color:var(--color-primary)]/8">
        {icon}
      </div>
      <p
        className={`font-[var(--font-display)] text-[2rem] font-extrabold tracking-[-0.04em] ${
          tone === "primary"
            ? "text-[color:var(--color-primary)]"
            : "text-[color:var(--color-ink)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">
        {label}
      </p>
    </article>
  );
}

function SettingRow({
  title,
  description,
  control
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="journal-card flex flex-col justify-between gap-4 rounded-[20px] p-5 sm:flex-row sm:items-center">
      <div>
        <h3 className="font-[var(--font-display)] text-[1.08rem] font-bold tracking-[-0.03em] text-[color:var(--color-ink)]">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-7 text-[color:var(--color-muted)]">
          {description}
        </p>
      </div>
      {control}
    </div>
  );
}

function ToggleControl({
  enabled,
  onChange
}: {
  enabled: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 self-start rounded-[999px] px-4 py-2.5 text-sm font-semibold transition sm:self-auto ${
        enabled
          ? "journal-chip-active"
          : "journal-chip ring-1 ring-[color:var(--color-line)]"
      }`}
      onClick={() => {
        onChange(!enabled);
      }}
      type="button"
    >
      {enabled ? (
        <CheckCircleIcon className="h-4 w-4" />
      ) : (
        <XCircleIcon className="h-4 w-4" />
      )}
      {enabled ? "Enabled" : "Disabled"}
    </button>
  );
}

function SelectControl({
  onChange,
  options,
  value
}: {
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="relative inline-flex items-center">
      <select
        className="appearance-none rounded-xl border border-[color:var(--color-line)] bg-[rgba(255,255,255,0.76)] px-4 py-2.5 pr-10 text-sm font-medium text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-primary)]"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-[color:var(--color-outline)]" />
    </label>
  );
}

export default function OptionsApp() {
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [settings, setSettings] = useState<TipiSettings>(DEFAULT_TIPI_SETTINGS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("Tipi is ready.");
  const [shortcutLabel, setShortcutLabel] = useState("Alt + K");

  async function loadStats() {
    try {
      const response = await browser.runtime.sendMessage({
        type: "tipi.get-stats"
      });

      const backgroundError = getErrorMessage(response);

      if (backgroundError) {
        setStats(initialStats);
        setMessage(backgroundError);
        return;
      }

      if (!isTipiStatsResponse(response)) {
        setStats(initialStats);
        setMessage("Tipi background returned invalid stats.");
        return;
      }

      setStats(response);
    } catch (error) {
      console.error("[Tipi] failed to load stats", error);
      setStats(initialStats);
      setMessage("Tipi background is not responding.");
    }
  }

  useEffect(() => {
    void loadStats();
    void getTipiSettings().then(setSettings);
    void getOpenSearchShortcutLabel().then(setShortcutLabel);
  }, []);

  async function handleSettingsChange(
    patch: Partial<TipiSettings>,
    successMessage: string
  ) {
    try {
      const nextSettings = await updateTipiSettings(patch);
      setSettings(nextSettings);
      setMessage(successMessage);
    } catch (error) {
      console.error("[Tipi] settings update failed", error);
      setMessage("Failed to save settings.");
    }
  }

  async function handleSync() {
    setIsSyncing(true);

    try {
      const response = await browser.runtime.sendMessage({
        type: "tipi.sync-history"
      });

      const backgroundError = getErrorMessage(response);

      if (backgroundError) {
        setMessage(backgroundError);
        return;
      }

      if (!isTipiSyncResponse(response)) {
        setMessage("History sync returned an invalid response.");
        return;
      }

      setMessage(`Synced ${response.synced} records.`);
      await loadStats();
    } catch (error) {
      console.error("[Tipi] history sync failed", error);
      setMessage("History sync failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleClear() {
    try {
      await browser.runtime.sendMessage({
        type: "tipi.clear-data"
      });
      setMessage("Local history index cleared.");
      await loadStats();
    } catch (error) {
      console.error("[Tipi] clear failed", error);
      setMessage("Failed to clear local data.");
    }
  }

  return (
    <main className="journal-canvas min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-[color:transparent] bg-[rgba(251,249,244,0.84)] px-6 py-4 backdrop-blur-[14px] shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-10">
            <BrandMark size="sm" />
            <div className="hidden items-center gap-3 md:flex">
              <button
                className="rounded-lg px-3 py-2 font-[var(--font-display)] font-bold tracking-[-0.03em] text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-low)] hover:text-[color:var(--color-ink)]"
                onClick={() => {
                  window.open(getExtensionPageUrl("/popup.html"), "_blank", "noopener");
                }}
                type="button"
              >
                Search
              </button>
              <button
                className="rounded-lg px-3 py-2 font-[var(--font-display)] font-bold tracking-[-0.03em] text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-low)] hover:text-[color:var(--color-ink)]"
                onClick={() => {
                  document.getElementById("data-overview")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                  });
                }}
                type="button"
              >
                Dashboard
              </button>
              <span className="border-b-2 border-[color:var(--color-primary)] px-3 py-2 font-[var(--font-display)] font-bold tracking-[-0.03em] text-[color:var(--color-primary)]">
                Settings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-full p-2 text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-low)] hover:text-[color:var(--color-ink)]"
              onClick={() => {
                void handleSync();
              }}
              type="button"
            >
              <SyncIcon className="h-5 w-5" />
            </button>
            <div className="rounded-full p-2 text-[color:var(--color-muted)]">
              <UserCircleIcon className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(138,154,91,0.18),transparent)]" />
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-14 md:px-12">
        <header className="relative">
          <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(138,154,91,0.2),transparent_68%)] blur-[58px]" />
          <h1 className="relative text-5xl font-extrabold tracking-[-0.06em] text-[color:var(--color-ink)]">
            Extension Settings
          </h1>
          <p className="relative mt-4 max-w-3xl text-xl leading-9 text-[color:var(--color-muted)]">
            Manage your local index, synchronization protocols, and behavioral
            parameters.
          </p>
        </header>

        <section className="mt-16" id="data-overview">
          <div className="mb-6 flex items-center gap-4">
            <h2 className="font-[var(--font-display)] text-[1.8rem] font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
              Data Overview
            </h2>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(198,200,184,0.5),transparent)]" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <MetricCard
              icon={<DocumentIcon className="h-14 w-14" />}
              label="Pages Indexed"
              tone="primary"
              value={formatCompactNumber(stats.totalRecords)}
            />
            <MetricCard
              icon={<HistoryIcon className="h-14 w-14" />}
              label="Last Sync"
              value={
                stats.lastSyncedAt
                  ? formatRelativeDate(stats.lastSyncedAt)
                  : "Not yet"
              }
            />
            <MetricCard
              icon={<DatabaseIcon className="h-14 w-14" />}
              label="Storage Used"
              value={formatStorageSize(stats.estimatedStorageBytes)}
            />
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2 className="font-[var(--font-display)] text-[1.8rem] font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
              Sync Controls
            </h2>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(198,200,184,0.5),transparent)]" />
          </div>

          <div className="journal-panel relative overflow-hidden px-8 py-8">
            <div className="absolute inset-y-0 left-0 w-1 bg-[color:var(--color-secondary)]/80" />
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl pl-2">
                <h3 className="font-[var(--font-display)] text-[1.45rem] font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
                  Manual Synchronization
                </h3>
                <p className="mt-3 text-[1rem] leading-8 text-[color:var(--color-muted)]">
                  Force a deep sync of your local index with the current browser
                  history. This may take a few moments depending on how much
                  recent browsing data needs to be indexed.
                </p>
                <p className="mt-4 text-sm text-[color:var(--color-outline)]">
                  {message}
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  className="journal-button-primary inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSyncing}
                  onClick={() => {
                    void handleSync();
                  }}
                  type="button"
                >
                  <CloudSyncIcon className="h-5 w-5" />
                  {isSyncing ? "Syncing..." : "Sync History Now"}
                </button>
                <button
                  className="journal-button-secondary inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-bold"
                  onClick={() => {
                    void handleClear();
                  }}
                  type="button"
                >
                  <TrashIcon className="h-5 w-5" />
                  Clear Local Cache
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-center gap-4">
            <h2 className="font-[var(--font-display)] text-[1.8rem] font-bold tracking-[-0.04em] text-[color:var(--color-ink)]">
              Advanced Parameters
            </h2>
            <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(198,200,184,0.5),transparent)]" />
          </div>

          <div className="space-y-3">
            <SettingRow
              control={
                <span className="journal-chip-active whitespace-nowrap px-4 py-2.5 text-sm font-bold">
                  {shortcutLabel}
                </span>
              }
              description="Open Tipi from any regular webpage. You can change this in your browser extension keyboard shortcut settings."
              title="Open search shortcut"
            />
            <SettingRow
              control={
                <ToggleControl
                  enabled={settings.autoSyncEnabled}
                  onChange={(nextValue) => {
                    void handleSettingsChange(
                      {
                        autoSyncEnabled: nextValue
                      },
                      nextValue
                        ? "Auto-sync enabled. Tipi will keep the local index up to date."
                        : "Auto-sync disabled. Use manual sync to refresh the local index."
                    );
                  }}
                />
              }
              description="Automatically keep the local journal index up to date while you browse."
              title="Auto-sync browsing history"
            />
            <SettingRow
              control={
                <SelectControl
                  onChange={(value) => {
                    void handleSettingsChange(
                      {
                        maxIndexedRecords: Number(value)
                      },
                      `Tipi will keep up to ${formatCompactNumber(Number(value))} indexed pages after the next sync.`
                    );
                  }}
                  options={[
                    { label: "2,500 pages", value: "2500" },
                    { label: "5,000 pages", value: "5000" },
                    { label: "10,000 pages", value: "10000" },
                    { label: "20,000 pages", value: "20000" }
                  ]}
                  value={String(settings.maxIndexedRecords)}
                />
              }
              description="Limit how many recent history records Tipi keeps in the local index after a sync."
              title="Maximum indexed pages"
            />
            <SettingRow
              control={
                <SelectControl
                  onChange={(value) => {
                    void handleSettingsChange(
                      {
                        maxSearchResults: Number(value)
                      },
                      `Search will now return up to ${value} results per query.`
                    );
                  }}
                  options={[
                    { label: "8 results", value: "8" },
                    { label: "12 results", value: "12" },
                    { label: "20 results", value: "20" },
                    { label: "30 results", value: "30" }
                  ]}
                  value={String(settings.maxSearchResults)}
                />
              }
              description="Control how many matches Tipi returns into the search panel for each query."
              title="Maximum search results"
            />
            <SettingRow
              control={
                <ToggleControl
                  enabled={settings.showFavicons}
                  onChange={(nextValue) => {
                    void handleSettingsChange(
                      {
                        showFavicons: nextValue
                      },
                      nextValue
                        ? "Favicons enabled in search results."
                        : "Favicons hidden from search results."
                    );
                  }}
                />
              }
              description="Show site icons in result rows when the browser can provide them."
              title="Show favicons in results"
            />
            <SettingRow
              control={
                <ToggleControl
                  enabled={settings.recordOpenEvents}
                  onChange={(nextValue) => {
                    void handleSettingsChange(
                      {
                        recordOpenEvents: nextValue
                      },
                      nextValue
                        ? "Tipi-opened pages will influence ranking."
                        : "Tipi-opened pages will no longer influence ranking."
                    );
                  }}
                />
              }
              description="Use results reopened from Tipi as a light ranking signal so repeated destinations surface faster."
              title="Use Tipi opens for ranking"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
