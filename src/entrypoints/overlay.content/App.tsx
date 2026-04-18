import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { SearchCommandCenter } from "@/components/SearchCommandCenter";
import type { SearchResult, TipiMessage, TipiStatsResponse } from "@/types/tipi";

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

export default function OverlayApp() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<TipiStatsResponse>(initialStats);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const listener = (message: TipiMessage) => {
      if (message.type !== "tipi.toggle-overlay") {
        return undefined;
      }

      setVisible((current) => {
        const nextVisible = !current;

        if (nextVisible) {
          setQuery("");
          setResults([]);
          setSelectedIndex(0);
          setErrorMessage(null);
        }

        return nextVisible;
      });

      return { ok: true };
    };

    browser.runtime.onMessage.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      return;
    }

    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void browser.runtime
      .sendMessage({
        type: "tipi.get-stats"
      })
      .then((response) => {
        if (isTipiStatsResponse(response)) {
          setStats(response);
        }
      })
      .catch((error) => {
        console.error("[Tipi] overlay stats failed", error);
      });
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

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
        console.error("[Tipi] overlay search failed", error);
        setResults([]);
        setErrorMessage("Search is unavailable right now.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query, visible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  async function openResult(result: SearchResult) {
    await browser.runtime.sendMessage({
      type: "tipi.open-url",
      url: result.url,
      recordId: result.id
    });

    setVisible(false);
  }

  function closeOverlay() {
    setVisible(false);
    setIsLoading(false);
    setErrorMessage(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay();
      return;
    }

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
        void openResult(selected);
      }
    }
  }

  const helperLabel = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }

    if (!query.trim()) {
      return "Start typing to search your browsing history.";
    }

    if (results.length === 0 && !isLoading) {
      return "No matching page found.";
    }

    return "Enter opens the selected result. Esc closes the panel.";
  }, [errorMessage, isLoading, query, results.length]);

  if (!visible) {
    return (
      <dialog
        className="m-0 h-screen max-h-none w-screen max-w-none border-none bg-transparent p-0 backdrop:bg-slate-950/24 backdrop:backdrop-blur-[4px]"
        ref={dialogRef}
      />
    );
  }

  return (
    <dialog
      className="m-0 h-screen max-h-none w-screen max-w-none border-none bg-transparent p-0 backdrop:bg-[rgba(27,28,25,0.18)] backdrop:backdrop-blur-[6px]"
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
      onClose={() => {
        if (visible) {
          closeOverlay();
        }
      }}
      ref={dialogRef}
    >
      <div
        className="flex min-h-screen items-start justify-center px-[24px] pt-[7vh]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeOverlay();
          }
        }}
      >
        <section
          className="w-full max-w-[700px] rounded-[28px] bg-[color:var(--color-surface)] shadow-[var(--shadow-lifted)]"
          onMouseDown={(event) => event.stopPropagation()}
          style={{ fontSize: "16px", lineHeight: "1.5" }}
        >
          <SearchCommandCenter
            errorMessage={errorMessage}
            footerLabel={
              query.trim() && results.length > 0
                ? `${selectedIndex + 1}/${results.length} selected. Enter opens the current entry.`
                : "Results appear after you start typing."
            }
            helperText={helperLabel}
            indexedCount={stats.totalRecords}
            isLoading={isLoading}
            inputRef={inputRef}
            onClose={closeOverlay}
            onOpen={(result) => {
              void openResult(result);
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
            selectedId={results[selectedIndex]?.id ?? null}
          />
        </section>
      </div>
    </dialog>
  );
}
