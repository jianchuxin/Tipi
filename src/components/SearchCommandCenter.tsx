import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { ResultList } from "@/components/ResultList";
import { BrandMark } from "@/components/BrandMark";
import { FocusIcon, MicIcon, SearchIcon, SparkIcon } from "@/components/icons";
import { formatCompactNumber } from "@/lib/utils/format";
import type { SearchResult } from "@/types/tipi";

type SearchCommandCenterProps = {
  query: string;
  results: SearchResult[];
  indexedCount: number;
  isLoading: boolean;
  helperText: string;
  errorMessage: string | null;
  showResults?: boolean;
  selectedId?: number | null;
  footerLabel?: string;
  shortcutLabel?: string;
  showFavicons?: boolean;
  onQueryChange: (value: string) => void;
  onQueryKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onOpen: (result: SearchResult, options?: { openInNewTab?: boolean }) => void;
  onSelect?: (result: SearchResult) => void;
  onClose?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function SearchCommandCenter({
  query,
  results,
  indexedCount,
  isLoading,
  helperText,
  errorMessage,
  showResults = true,
  selectedId,
  footerLabel,
  shortcutLabel,
  showFavicons = true,
  onQueryChange,
  onQueryKeyDown,
  onOpen,
  onSelect,
  onClose,
  inputRef
}: SearchCommandCenterProps) {
  const shouldShowResultList = showResults && (isLoading || results.length > 0);

  return (
    <div
      className="journal-canvas mx-auto flex w-full max-w-[640px] flex-col rounded-[24px] bg-[color:var(--color-surface)] px-[14px] py-[18px] sm:px-[18px] sm:py-[20px]"
      style={{
        height: "min(520px, calc(100vh - 96px))"
      }}
    >
      <div className="mb-[16px] flex items-center justify-between gap-[12px]">
        <BrandMark size="sm" />
        <div className="flex items-center gap-[8px]">
          {shortcutLabel ? (
            <span className="journal-chip text-[12px]">
              Shortcut {shortcutLabel}
            </span>
          ) : null}
          {onClose ? (
            <button
              className="journal-chip text-[13px]"
              onClick={onClose}
              type="button"
            >
              Esc to close
            </button>
          ) : null}
        </div>
      </div>

      <div className="journal-panel p-[14px] sm:p-[16px]">
        <label className="relative block">
          <span className="sr-only">Search Tipi</span>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-[14px] text-[color:var(--color-primary)]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[12px] bg-[color:var(--color-surface-low)]">
              <SearchIcon className="h-[15px] w-[15px]" />
            </div>
          </div>
          <input
            autoFocus
            className="journal-input h-[54px] w-full pl-[56px] pr-[92px] text-[18px] tracking-[-0.03em] placeholder:text-[color:var(--color-muted-soft)] sm:text-[19px]"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onQueryChange(event.target.value)
            }
            onKeyDown={onQueryKeyDown}
            placeholder="Search your journal..."
            ref={inputRef}
            value={query}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-[8px] pr-[14px] text-[color:var(--color-outline)]">
            <span className="rounded-full p-[4px] transition hover:text-[color:var(--color-primary)]">
              <MicIcon className="h-[16px] w-[16px]" />
            </span>
            <span className="rounded-full p-[4px] transition hover:text-[color:var(--color-primary)]">
              <FocusIcon className="h-[16px] w-[16px]" />
            </span>
          </div>
        </label>

        <div className="mt-[14px] flex flex-wrap items-center gap-[8px] text-[13px]">
          <span className="journal-chip-active">History</span>
          <div className="flex-1" />
          <span className="text-[13px] text-[color:var(--color-outline)]">
            {formatCompactNumber(indexedCount)} items indexed
          </span>
        </div>
      </div>

      {errorMessage ? (
        <div className="journal-callout mt-[18px] flex items-start gap-[10px]">
          <SparkIcon className="mt-[2px] h-[14px] w-[14px] shrink-0 text-[color:var(--color-secondary)]" />
          <p className="text-[14px] text-[color:var(--color-muted)]">{errorMessage}</p>
        </div>
      ) : (
        <p className="mt-[16px] px-[6px] text-[14px] text-[color:var(--color-muted)]">
          {helperText}
        </p>
      )}

      <section className="mt-[14px] min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-[4px]">
          {shouldShowResultList ? (
            <ResultList
              isLoading={isLoading}
              onOpen={onOpen}
              onSelect={onSelect}
              query={query}
              results={results}
              selectedId={selectedId}
              showFavicons={showFavicons}
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center px-[18px] py-[24px] text-center text-[13px] text-[color:var(--color-muted)]">
              Start typing to search.
            </div>
          )}
        </div>
      </section>

      <div className="mt-[14px] flex items-center justify-between gap-[12px] px-[4px] text-[13px] text-[color:var(--color-primary)]">
        <div className="inline-flex items-center gap-[8px] font-[var(--font-display)] font-bold tracking-[-0.02em]">
          <span>View Older Entries</span>
          <SparkIcon className="h-[14px] w-[14px]" />
        </div>
        <span className="text-right text-[12px] text-[color:var(--color-outline)]">
          {footerLabel ?? "Use Arrow keys to move. Press Enter to reopen the selected page."}
        </span>
      </div>
    </div>
  );
}
