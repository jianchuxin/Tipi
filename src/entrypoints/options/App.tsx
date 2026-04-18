import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { BrandMark } from "@/components/BrandMark";
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
import type { TipiStatsResponse, TipiSyncResponse } from "@/types/tipi";

const initialStats: TipiStatsResponse = {
  totalRecords: 0,
  lastSyncedAt: null,
  estimatedStorageBytes: 0
};

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

export default function OptionsApp() {
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("Tipi is ready.");

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
  }, []);

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
                  window.open(browser.runtime.getURL("/popup.html"), "_blank", "noopener");
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
                <span className="journal-chip-active inline-flex items-center gap-2 self-start sm:self-auto">
                  <CheckCircleIcon className="h-4 w-4" />
                  Enabled
                </span>
              }
              description="Automatically keep the local journal index up to date while you browse."
              title="Auto-sync browsing history"
            />
            <SettingRow
              control={
                <span className="journal-chip inline-flex items-center gap-2 self-start ring-1 ring-[color:var(--color-line)] sm:self-auto">
                  <XCircleIcon className="h-4 w-4" />
                  Disabled
                </span>
              }
              description="Private and incognito sessions are excluded from Tipi's local ledger."
              title="Index private tabs"
            />
            <SettingRow
              control={
                <span className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--color-line)] bg-[rgba(255,255,255,0.76)] px-4 py-2.5 text-sm font-medium text-[color:var(--color-ink)]">
                  System Auto
                  <ChevronDownIcon className="h-4 w-4 text-[color:var(--color-outline)]" />
                </span>
              }
              description="Follow the system preference for theme behavior once multiple themes are available."
              title="Interface theme"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
