import { useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { getEnvironmentLabel } from "@/lib/search/metadata";
import { formatRelativeDate, formatResultUrl, getResultMonogram } from "@/lib/utils/format";
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
    <div className="space-y-[8px]">
      {results.map((result) => (
        <button
          className={`group relative flex w-full items-start gap-[12px] overflow-hidden rounded-[18px] px-[16px] py-[14px] text-left transition duration-300 ${
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
            <div className="mb-[2px] flex items-start justify-between gap-[12px]">
              <h3 className="truncate font-[var(--font-display)] text-[16px] font-extrabold tracking-[-0.03em] text-[color:var(--color-ink)] sm:text-[17px]">
                <HighlightedText
                  text={result.title || result.hostname}
                  tokens={highlightTokens}
                />
              </h3>
              <div className="flex shrink-0 items-center gap-[6px] pt-[1px]">
                <EnvironmentBadge result={result} />
                <span className="whitespace-nowrap text-[11px] text-[color:var(--color-outline)]">
                  {formatRelativeDate(result.lastVisitedAt)}
                </span>
              </div>
            </div>
            <p className="truncate text-[14px] text-[color:var(--color-secondary)]">
              <HighlightedText
                text={formatResultUrl(result.url)}
                tokens={highlightTokens}
              />
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function EnvironmentBadge({ result }: { result: SearchResult }) {
  const label = result.metadata
    ? getEnvironmentLabel(result.metadata.environment)
    : null;

  if (!label) {
    return null;
  }

  return (
    <span className="rounded-[6px] border border-[color:var(--color-line)] bg-[rgba(255,255,255,0.54)] px-[5px] py-[1px] text-[9px] font-bold leading-[14px] tracking-[0.08em] text-[color:var(--color-primary)]">
      {label}
    </span>
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
    <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[color:var(--color-surface-high)] text-[12px] font-semibold tracking-[0.08em] text-[color:var(--color-primary)]">
      {faviconUrl && !hasError ? (
        <img
          alt=""
          className="h-[18px] w-[18px] rounded-[5px] object-contain"
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
