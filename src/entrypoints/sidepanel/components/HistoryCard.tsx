import type { SearchResult } from "@/types/tipi";
import { formatRelativeDate } from "@/lib/utils/format";
import { browser } from "wxt/browser";

type HistoryCardProps = {
  result: SearchResult;
};

export function HistoryCard({ result }: HistoryCardProps) {
  function handleClick() {
    browser.tabs.create({ url: result.url, active: true });
  }

  return (
    <button
      className="journal-card mb-2 block w-full p-3 text-left transition hover:shadow-md"
      onClick={handleClick}
      style={{ fontSize: "14px", lineHeight: "1.4" }}
      type="button"
    >
      <div className="flex items-start gap-3">
        {result.hostname ? (
          <img
            alt=""
            className="mt-0.5 h-4 w-4 shrink-0 rounded"
            src={`https://www.google.com/s2/favicons?domain=${result.hostname}&sz=32`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {result.title || result.url}
          </p>
          <p className="truncate text-[12px]" style={{ color: "var(--color-outline)" }}>
            {result.url}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
            {formatRelativeDate(result.lastVisitedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}
