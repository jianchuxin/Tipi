import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { StatCard } from "@/components/StatCard";
import type { TipiStatsResponse, TipiSyncResponse } from "@/types/tipi";

const initialStats: TipiStatsResponse = {
  totalRecords: 0,
  lastSyncedAt: null
};

export default function OptionsApp() {
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("Tipi is ready.");

  async function loadStats() {
    const response = await browser.runtime.sendMessage({
      type: "tipi.get-stats"
    });
    setStats(response as TipiStatsResponse);
  }

  useEffect(() => {
    void loadStats();
  }, []);

  async function handleSync() {
    setIsSyncing(true);

    try {
      const response = (await browser.runtime.sendMessage({
        type: "tipi.sync-history"
      })) as TipiSyncResponse;
      setMessage(`Synced ${response.synced} records.`);
      await loadStats();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleClear() {
    await browser.runtime.sendMessage({
      type: "tipi.clear-data"
    });
    setMessage("Local history index cleared.");
    await loadStats();
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-4xl border border-white/60 bg-white/70 p-8 shadow-[var(--shadow-panel)] backdrop-blur">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
            Tipi Settings
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--color-ink)]">
            Personal web teleport, backed by your local browser history.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            This initial setup keeps all indexed history local to the browser
            profile. Use the controls below to refresh the local search index or
            wipe all cached data.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <StatCard
            hint="Stored in IndexedDB for fast local lookup."
            label="Indexed Pages"
            value={String(stats.totalRecords)}
          />
          <StatCard
            hint="Updated whenever you run a full sync."
            label="Last Sync"
            value={
              stats.lastSyncedAt
                ? new Date(stats.lastSyncedAt).toLocaleString()
                : "Not yet"
            }
          />
        </section>

        <section className="mt-8 rounded-3xl border border-[color:var(--color-line)] bg-white/80 p-6 shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[color:var(--color-sea)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-sea-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSyncing}
              onClick={handleSync}
              type="button"
            >
              {isSyncing ? "Syncing..." : "Sync History"}
            </button>
            <button
              className="rounded-full border border-[color:var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={handleClear}
              type="button"
            >
              Clear Local Data
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">{message}</p>
        </section>
      </div>
    </main>
  );
}
