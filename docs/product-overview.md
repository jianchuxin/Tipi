# Tipi — Product Overview

Tipi is a browser extension that lets you instantly search and reopen any page from your browsing history — no mouse, no bookmarks, no cloud.

Press `Option + K` (macOS) or `Alt + K` (Windows/Linux), type a few characters, hit Enter. You're back on the page. Everything stays on your device.

## Core Capabilities

**Instant local search** — fuzzy-match titles, domains, and URLs across your full browser history. Results appear as you type, ranked by relevance and recency.

**Keyboard-first** — open Tipi with a global shortcut from any webpage. Navigate results with arrow keys. Open with Enter. Never touch the mouse.

**Two access modes** — Tipi renders as a lightweight in-page overlay on normal webpages, and falls back to a separate popup window on browser-restricted pages (new tab, chrome://, extension pages).

**Auto-sync history** — automatically indexes new visits in the background. Manual full sync available from settings. Configurable index window (default 90 days) and max records.

**100% local, zero cloud** — history never leaves your device. No accounts, no servers, no telemetry. Search happens in a local in-memory index backed by IndexedDB.

**Cross-browser** — Chrome, Edge, Arc, and Firefox. Same shortcut, same experience.

## How It Works

```
User presses Option+K
       │
       ▼
┌──────────────────┐
│ background.ts    │  Receives shortcut command
│ toggleOverlay()  │──────────────────────┐
└──────────────────┘                      │
       │   │                              ▼
       │   │  normal page?    ┌──────────────────────┐
       │   ├─────────────────▶│ overlay.content/     │  In-page React overlay
       │   │                  │ injects into DOM      │
       │   │                  └──────────────────────┘
       │   │
       │   │  restricted page?
       │   └─────────────────▶ popup window
       │
       ▼
┌──────────────────┐
│ popup/App.tsx    │  React search UI
│ searchRecords()  │──────────────────────┐
└──────────────────┘                      │
                                          ▼
                              ┌──────────────────┐
                              │ search-index.ts  │  In-memory Map + flexsearch
                              │ ranking.ts       │  Fuzzy match + recency scoring
                              └──────────────────┘
                                          │
                                          ▼
                              ┌──────────────────┐
                              │ history-db.ts    │  IndexedDB persistence
                              └──────────────────┘
```

1. `background.ts` listens for the `tipi.open-search` shortcut command
2. On normal pages, it injects `overlay.content/` — a React component into the active tab's DOM
3. On restricted pages (chrome://, new tab), it opens a standalone popup window
4. The search UI (`SearchCommandCenter`) sends query messages to `background.ts`
5. Background searches the in-memory index and returns ranked results
6. On Enter, background opens the URL in a new tab (or reuses the current tab in overlay mode)

## Architecture

```
src/
├── entrypoints/          # WXT extension entry points
│   ├── background.ts     # Service worker: lifecycle, sync, message dispatch
│   ├── popup/            # Standalone popup search UI (React)
│   ├── overlay.content/  # In-page overlay search UI (React, content script)
│   └── options/          # Settings page (React)
├── components/           # Shared React components
│   ├── SearchCommandCenter.tsx  # Core search bar + results list
│   ├── ResultList.tsx           # Search result item rendering
│   ├── BrandMark.tsx            # Tipi logo
│   └── icons.tsx                # SVG icon primitives
├── lib/
│   ├── search/           # Search engine
│   │   ├── search-index.ts     # In-memory Map index + flexsearch
│   │   └── ranking.ts          # Fuzzy match scoring + recency boost
│   ├── history/          # Browser history fetching
│   │   └── fetch-history.ts    # chrome.history API wrapper
│   ├── storage/          # IndexedDB persistence
│   │   └── history-db.ts       # CRUD for history records
│   ├── settings/         # User preferences
│   │   └── tipi-settings.ts    # Defaults, normalization, storage
│   ├── shortcuts/        # Keyboard shortcut detection
│   │   └── open-search-shortcut.ts
│   └── utils/            # Shared utilities (string hashing, etc.)
└── types/                # TypeScript type definitions
    └── tipi.ts           # HistoryRecord, SearchResult, TipiSettings, etc.
```

### Data Flow

- **Read path**: `fetch-history.ts` → `chrome.history.search()` → `history-db.ts` (IndexedDB) → `search-index.ts` (in-memory Map) → `ranking.ts` → results
- **Write path**: `chrome.history.onVisited` → `fetch-history.ts` → IndexedDB + in-memory index
- **Search path**: User types → `popup/App.tsx` → `browser.runtime.sendMessage({type:"tipi.search"})` → `background.ts` → `searchRecords()` → results back via `sendResponse()`

### Message Protocol

All UI-to-background communication uses `browser.runtime.sendMessage` with typed messages:

| Message Type | Direction | Purpose |
|---|---|---|
| `tipi.search` | UI → BG | Search history with query string |
| `tipi.sync-history` | UI → BG | Trigger manual full sync |
| `tipi.get-stats` | UI → BG | Get index stats (count, last sync, size) |
| `tipi.open-url` | UI → BG | Open a URL from search result |
| `tipi.clear-data` | UI → BG | Clear all local data |
| `tipi.toggle-overlay` | BG → Content | Toggle in-page overlay visibility |
| `tipi.get-open-search-shortcut` | UI → BG | Get current shortcut label |

## Tech Stack

| Layer | Choice |
|---|---|
| Extension framework | [WXT](https://wxt.dev) v0.20 |
| UI | React 19, TypeScript 5.8 |
| Styling | Tailwind CSS v4 (custom design tokens) |
| Search | flexsearch v0.8 (in-memory full-text, with custom scoring layer) |
| Storage | IndexedDB (via custom wrapper) |
| Build | Vite 8 (via WXT) |

## Design Tokens

Tipi uses a warm, paper-inspired palette:

```
--color-ink:           #1b1c19    (primary text)
--color-muted:         #46483c    (secondary text)
--color-muted-soft:    #76786b    (tertiary text)
--color-surface:       #fbf9f4    (page background)
--color-surface-low:   #f5f3ee    (section background)
--color-surface-high:  #e4e2dd    (hover/chip background)
--color-primary:       #56642b    (CTA, active states)
--color-primary-soft:  #8a9a5b    (gradient end, accents)
--color-secondary:     #8b4e3b    (secondary actions, borders)
--color-secondary-soft:#fdad96    (active chip background)
```

Fonts: Plus Jakarta Sans (headings), Work Sans (body).

## Design Philosophy

- **Keyboard-first, not keyboard-only** — mouse works, but power users should never need it
- **Local by default** — no network requests, no cloud dependency, no account required
- **Minimal state** — no onboarding wizards, no persistent tracking of user progress
- **Graceful degradation** — overlay is ideal, popup is the fallback; user shouldn't care which mode they're in
- **Small surface area** — fewer than 20 source files, one background script, three UI entrypoints

## Current Limitations

- **No fuzzy typo correction** — "githbu" won't find "github". Search requires substring match
- **No bookmark search** — only browser history, not bookmarks
- **No tab search** — only closed/visited pages, not currently open tabs
- **No domain/time filters** — can't filter by date range or exclude domains
- **Single device** — no cross-device sync (by design, but worth noting)
- **90-day window** — default max history window, configurable in settings

## Project Assets

| Resource | Path |
|---|---|
| README (dev + usage) | `README.md` |
| Product overview (this doc) | `docs/product-overview.md` |
| Privacy policy | `PRIVACY.md` |
| Store submission guide | `src/docs/release/chrome-web-store-submission.md` |
| Landing page source | `website/` |
| Design specs | `docs/superpowers/specs/` |
| Search design doc | `docs/search/` |
