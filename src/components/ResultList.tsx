import { useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { formatRelativeDate, formatResultUrl, getResultMonogram, getResultSummary } from "@/lib/utils/format";
import { tokenizeText } from "@/lib/utils/string";
import type { SearchResult } from "@/types/tipi";

type ResultListProps = {
  results: SearchResult[];
  isLoading: boolean;
  onOpen: (result: SearchResult, options?: { openInNewTab?: boolean }) => void;
  onSelect?: (result: SearchResult) => void;
  selectedId?: number | null;
  query?: string;
  showFavicons?: boolean;
};

function getExtensionPageUrl(path: string) {
  return (browser.runtime as typeof browser.runtime & {
    getURL: (url: string) => string;
  }).getURL(path);
}

export function ResultList({
  results,
  isLoading,
  onOpen,
  onSelect,
  selectedId,
  query = "",
  showFavicons = true
}: ResultListProps) {
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const highlightTokens = useMemo(() => tokenizeText(query), [query]);

  useEffect(() => {
    if (selectedId == null) {
      return;
    }

    itemRefs.current.get(selectedId)?.scrollIntoView({
      block: "nearest"
    });
  }, [selectedId]);

  if (isLoading) {
    return (
      <div className="journal-panel px-[24px] py-[40px] text-center text-[14px] text-[color:var(--color-muted)]">
        Searching your history...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="journal-panel px-[24px] py-[40px] text-center text-[14px] text-[color:var(--color-muted)]">
        No matching history entry.
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
          onClick={(event) =>
            onOpen(result, {
              openInNewTab: event.metaKey || event.ctrlKey
            })
          }
          onMouseEnter={() => onSelect?.(result)}
          ref={(node) => {
            if (node) {
              itemRefs.current.set(result.id, node);
              return;
            }

            itemRefs.current.delete(result.id);
          }}
          type="button"
        >
          <div
            className={`absolute inset-y-0 left-0 w-1 transition-opacity ${
              selectedId === result.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } bg-[linear-gradient(180deg,var(--color-secondary),var(--color-primary-soft))]`}
          />
          <FaviconBadge
            hostname={result.hostname}
            showFavicon={showFavicons}
            url={result.url}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-[4px] flex items-start justify-between gap-[16px]">
              <h3 className="truncate font-[var(--font-display)] text-[17px] font-extrabold tracking-[-0.03em] text-[color:var(--color-ink)] sm:text-[18px]">
                <HighlightedText
                  text={result.title || result.hostname}
                  tokens={highlightTokens}
                />
              </h3>
              <span className="shrink-0 whitespace-nowrap text-[12px] text-[color:var(--color-outline)]">
                {formatRelativeDate(result.lastVisitedAt)}
              </span>
            </div>
            <p className="truncate text-[15px] text-[color:var(--color-secondary)]">
              <HighlightedText
                text={formatResultUrl(result.url)}
                tokens={highlightTokens}
              />
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

function FaviconBadge({
  url,
  hostname,
  showFavicon
}: {
  url: string;
  hostname: string;
  showFavicon: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = useMemo(() => {
    if (!showFavicon) {
      return null;
    }

    const manifestPermissions = browser.runtime.getManifest().permissions ?? [];

    if (!manifestPermissions.includes("favicon")) {
      return null;
    }

    const extensionBaseUrl = getExtensionPageUrl("/popup.html")
      .replace(/\/popup\.html$/, "/");
    const resourceUrl = new URL("_favicon/", extensionBaseUrl);
    resourceUrl.searchParams.set("pageUrl", url);
    resourceUrl.searchParams.set("size", "32");
    return resourceUrl.toString();
  }, [showFavicon, url]);

  return (
    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[color:var(--color-surface-high)] text-[13px] font-semibold tracking-[0.08em] text-[color:var(--color-primary)]">
      {faviconUrl && !hasError ? (
        <img
          alt=""
          className="h-[22px] w-[22px] rounded-[6px] object-contain"
          loading="lazy"
          onError={() => {
            setHasError(true);
          }}
          src={faviconUrl}
        />
      ) : (
        getResultMonogram(hostname)
      )}
    </div>
  );
}

function HighlightedText({
  text,
  tokens
}: {
  text: string;
  tokens: string[];
}) {
  const segments = useMemo(() => {
    const uniqueTokens = [...new Set(tokens)].filter(Boolean);

    if (uniqueTokens.length === 0 || !text.trim()) {
      return [{ value: text, highlighted: false }];
    }

    const pattern = new RegExp(
      `(${uniqueTokens
        .sort((left, right) => right.length - left.length)
        .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})`,
      "gi"
    );

    return text
      .split(pattern)
      .filter(Boolean)
      .map((segment) => ({
        value: segment,
        highlighted: uniqueTokens.some(
          (token) => token.toLowerCase() === segment.toLowerCase()
        )
      }));
  }, [text, tokens]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            className="rounded-[6px] bg-[rgba(219,122,61,0.16)] px-[2px] text-[inherit]"
            key={`${segment.value}-${index}`}
          >
            {segment.value}
          </mark>
        ) : (
          <span key={`${segment.value}-${index}`}>{segment.value}</span>
        )
      )}
    </>
  );
}
