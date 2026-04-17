import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { browser } from "wxt/browser";
import { ResultList } from "@/components/ResultList";
import type { SearchResult, TipiStatsResponse } from "@/types/tipi";

const initialStats: TipiStatsResponse = {
  totalRecords: 0,
  lastSyncedAt: null
};

export default function PopupApp() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void browser.runtime
      .sendMessage({
        type: "tipi.get-stats"
      })
      .then((response) => {
        setStats(response as TipiStatsResponse);
      });
  }, []);

  useEffect(() => {
    const normalized = query.trim();

    if (!normalized) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    void browser.runtime
      .sendMessage({
        type: "tipi.search",
        query: normalized
      })
      .then((response) => {
        setResults(response as SearchResult[]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  async function openUrl(url: string, recordId: number) {
    await browser.runtime.sendMessage({
      type: "tipi.open-url",
      url,
      recordId
    });
    window.close();
  }

  const statusLabel = useMemo(() => {
    if (!stats.lastSyncedAt) {
      return "No sync yet";
    }

    return `Synced ${new Date(stats.lastSyncedAt).toLocaleTimeString()}`;
  }, [stats.lastSyncedAt]);

  return (
    <main className="relative overflow-hidden p-4">
      <div className="rounded-3xl border border-white/60 bg-white/78 p-4 shadow-[var(--shadow-panel)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
              Tipi
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
              Jump back to the page you need.
            </h1>
          </div>
          <button
            className="rounded-full border border-[color:var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => browser.runtime.openOptionsPage()}
            type="button"
          >
            Settings
          </button>
        </div>

        <label className="mt-5 block">
          <span className="sr-only">Search history</span>
          <input
            autoFocus
            className="w-full rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-cloud)] px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-300"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setQuery(event.target.value)
            }
            placeholder="Search title, URL, or hostname..."
            value={query}
          />
        </label>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{stats.totalRecords} records indexed</span>
          <span>{statusLabel}</span>
        </div>

        <section className="mt-4">
          <ResultList
            isLoading={isLoading}
            onOpen={(url) => {
              const selected = results.find((item) => item.url === url);
              if (!selected) {
                return;
              }

              void openUrl(url, selected.id);
            }}
            results={results}
          />
        </section>
      </div>
    </main>
  );
}
