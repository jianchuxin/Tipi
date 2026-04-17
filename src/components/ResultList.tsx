import type { SearchResult } from "../types/tipi";

type ResultListProps = {
  results: SearchResult[];
  isLoading: boolean;
  onOpen: (url: string) => void;
};

export function ResultList({ results, isLoading, onOpen }: ResultListProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-line)] bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
        Syncing search results...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-line)] bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
        No result yet. Try syncing history first or search with a shorter keyword.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <button
          className="flex w-full items-start justify-between rounded-2xl border border-[color:var(--color-line)] bg-white/85 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white"
          key={result.id}
          onClick={() => onOpen(result.url)}
          type="button"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
              {result.title || result.hostname}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">{result.url}</p>
          </div>
          <div className="ml-4 shrink-0 text-right">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              {result.hostname}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {result.visitCount} visits
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

