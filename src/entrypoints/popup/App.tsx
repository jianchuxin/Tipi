import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { browser, type Browser } from "wxt/browser";
import { SearchCommandCenter } from "@/components/SearchCommandCenter";
import { DEFAULT_TIPI_SETTINGS, getTipiSettings, TIPI_SETTINGS_STORAGE_KEY } from "@/lib/settings/tipi-settings";
import type { SearchResult, TipiSettings, TipiStatsResponse } from "@/types/tipi";

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

function isSearchResultArray(value: unknown): value is SearchResult[] {
  return Array.isArray(value);
}

function getErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.error === "string" ? candidate.error : null;
}

export default function PopupApp() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [settings, setSettings] = useState<TipiSettings>(DEFAULT_TIPI_SETTINGS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    void getTipiSettings().then(setSettings).catch(() => {
      setSettings(DEFAULT_TIPI_SETTINGS);
    });

    const listener = (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== "local" || !changes[TIPI_SETTINGS_STORAGE_KEY]) {
        return;
      }

      void getTipiSettings().then(setSettings);
    };

    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    void browser.runtime
      .sendMessage({
        type: "tipi.get-stats"
      })
      .then((response) => {
        const backgroundError = getErrorMessage(response);

        if (backgroundError) {
          setStats(initialStats);
          setErrorMessage(backgroundError);
          return;
        }

        if (!isTipiStatsResponse(response)) {
          setStats(initialStats);
          setErrorMessage("Tipi background returned invalid stats.");
          return;
        }

        setStats(response);
        setErrorMessage(null);
      })
      .catch((error) => {
        console.error("[Tipi] failed to load popup stats", error);
        setStats(initialStats);
        setErrorMessage("Tipi background is not responding.");
      });
  }, []);

  useEffect(() => {
    const normalized = query.trim();

    if (!normalized) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);

    void browser.runtime
      .sendMessage({
        type: "tipi.search",
        query: normalized
      })
      .then((response) => {
        const backgroundError = getErrorMessage(response);

        if (backgroundError) {
          setResults([]);
          setErrorMessage(backgroundError);
          return;
        }

        if (!isSearchResultArray(response)) {
          setResults([]);
          setErrorMessage("Search returned an invalid response.");
          return;
        }

        setResults(response);
        setErrorMessage(null);
      })
      .catch((error) => {
        console.error("[Tipi] search failed", error);
        setResults([]);
        setErrorMessage("Search is unavailable right now.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  async function openUrl(
    url: string,
    recordId: number,
    options?: { openInNewTab?: boolean }
  ) {
    await browser.runtime.sendMessage({
      type: "tipi.open-url",
      url,
      recordId,
      openInNewTab: options?.openInNewTab ?? true
    });
    window.close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        current === 0 ? results.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[selectedIndex];

      if (selected) {
        void openUrl(selected.url, selected.id, {
          openInNewTab: true
        });
      }
    }
  }

  const helperLabel = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }

    if (query.trim()) {
      return "Matching entries from your local history index.";
    }

    return "Start typing to search your browsing history.";
  }, [errorMessage, query]);

  return (
    <main className="min-h-screen bg-[color:var(--color-surface)]">
      <SearchCommandCenter
        errorMessage={errorMessage}
        footerLabel={
          query.trim()
            ? "Enter opens the highlighted entry."
            : "Results appear after you start typing."
        }
        helperText={helperLabel}
        indexedCount={stats.totalRecords}
        isLoading={isLoading}
        inputRef={inputRef}
        onOpen={(result, options) => {
          void openUrl(result.url, result.id, options);
        }}
        onQueryChange={setQuery}
        onQueryKeyDown={handleKeyDown}
        onSelect={(result) => {
          const index = results.findIndex((item) => item.id === result.id);

          if (index >= 0) {
            setSelectedIndex(index);
          }
        }}
        query={query}
        results={results}
        showResults={query.trim().length > 0}
        showFavicons={settings.showFavicons}
        selectedId={results[selectedIndex]?.id ?? null}
      />
    </main>
  );
}
