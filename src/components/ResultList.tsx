import { formatRelativeDate, formatResultUrl, getResultMonogram, getResultSummary } from "@/lib/utils/format";
import type { SearchResult } from "@/types/tipi";

type ResultListProps = {
  results: SearchResult[];
  isLoading: boolean;
  onOpen: (result: SearchResult) => void;
  onSelect?: (result: SearchResult) => void;
  selectedId?: number | null;
};

export function ResultList({
  results,
  isLoading,
  onOpen,
  onSelect,
  selectedId
}: ResultListProps) {
  if (isLoading) {
    return (
      <div className="journal-panel px-[24px] py-[40px] text-center text-[14px] text-[color:var(--color-muted)]">
        Syncing search results...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="journal-panel px-[24px] py-[40px] text-center text-[14px] text-[color:var(--color-muted)]">
        No indexed entry matched this search. Try a shorter keyword or sync history again.
      </div>
    );
  }

  return (
    <div className="space-y-[12px]">
      {results.map((result) => (
        <button
          className={`group relative flex w-full items-start gap-[16px] overflow-hidden rounded-[20px] px-[20px] py-[18px] text-left transition duration-300 ${
            selectedId === result.id
              ? "journal-card-active"
              : "journal-card hover:-translate-y-[1px] hover:bg-[color:var(--color-surface-high)]"
          }`}
          key={result.id}
          onClick={() => onOpen(result)}
          onMouseEnter={() => onSelect?.(result)}
          type="button"
        >
          <div
            className={`absolute inset-y-0 left-0 w-1 transition-opacity ${
              selectedId === result.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } bg-[linear-gradient(180deg,var(--color-secondary),var(--color-primary-soft))]`}
          />
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-[color:var(--color-surface-high)] text-[13px] font-semibold tracking-[0.08em] text-[color:var(--color-primary)]">
            {getResultMonogram(result.hostname)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-[4px] flex items-start justify-between gap-[16px]">
              <h3 className="truncate font-[var(--font-display)] text-[17px] font-extrabold tracking-[-0.03em] text-[color:var(--color-ink)] sm:text-[18px]">
                {result.title || result.hostname}
              </h3>
              <span className="shrink-0 whitespace-nowrap text-[12px] text-[color:var(--color-outline)]">
                {formatRelativeDate(result.lastVisitedAt)}
              </span>
            </div>
            <p className="truncate text-[15px] text-[color:var(--color-secondary)]">
              {formatResultUrl(result.url)}
            </p>
            <p className="mt-[8px] line-clamp-2 text-[14px] leading-[24px] text-[color:var(--color-muted)]">
              {getResultSummary(result.url, result.title)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
