# Chrome Web Store Submission Kit

This document contains draft text for publishing Tipi to the Chrome Web Store.

## Recommended rollout

Use this order:

1. Publish as `Unlisted`
2. Install and test from the Chrome Web Store listing yourself
3. Fix any review feedback
4. Switch to `Public` after the review and permission copy are stable

## Store listing

### Extension name

`Tipi`

### Short description

Use one of these:

- `Search and reopen pages from your local browsing history.`
- `A local-first command bar for finding pages you have already visited.`

### Detailed description

Use this as the first draft:

`Tipi helps you quickly find and reopen pages from your browsing history. It builds a local index on your device so you can search by title, domain, or URL fragment and jump back to pages without digging through browser history manually.`

`Features in the current version:`

- `Fast local search over your browsing history`
- `Keyboard-first search flow`
- `In-page floating search panel on supported sites`
- `Fallback popup window on restricted browser pages`
- `Local settings for auto-sync, result count, indexing limits, favicon display, and ranking behavior`
- `Local-first storage with no cloud sync in the current version`

`Tipi is designed around a single purpose: helping you search and reopen pages from your own browsing history faster.`

## Single purpose

Use this in the Privacy tab:

`Tipi helps users search and reopen pages from their local browsing history.`

## Permission justifications

Use these in the Privacy tab permission fields.

### `history`

`Required to read the user's browser history so Tipi can build a local search index and return matching results. This is the core feature of the extension.`

### `storage`

`Required to store the local history index, sync metadata, and user settings on the device.`

### `tabs`

`Required to detect the active tab when launching search, open selected results, and reuse the current tab when appropriate.`

### `windows`

`Required to focus or create the fallback popup window when Tipi cannot inject the in-page floating search panel into restricted browser pages.`

### `favicon`

`Required in Chromium-based browsers to display website icons in search results. This improves result recognition and does not change browsing behavior.`

## Data use disclosure guidance

Based on the current implementation, the disclosure should remain narrow and local-first.

### Data collected

If the Chrome Web Store form asks what data the extension collects, describe it as:

- `Browsing history`
- `Website content metadata from history records, such as URL, title, hostname, visit count, and timestamps`
- `Extension settings stored locally`

### Data handling statement

Use this wording as the baseline:

`Tipi processes browsing history locally on the user's device to provide local history search. In the current version, Tipi does not transmit browsing history to a remote server operated by the developer.`

### Privacy policy URL

Use a public URL that serves the current [PRIVACY.md](/Users/chuxin.jian/Desktop/Code/Tipi/PRIVACY.md:1) content, for example:

- GitHub Pages
- A public project website
- A public documentation page

Do not submit with only a local markdown file. The store expects a publicly reachable policy URL.

## Reviewer notes

Use this in `Test instructions` or reviewer notes:

`Tipi is a local-first history search extension.`

`How to test:`

1. Install the extension and grant the requested permissions.
2. Open the extension options page and click "Sync History Now" if the local index is empty.
3. Use the toolbar popup or the keyboard shortcut to open search.
4. Search by title, hostname, or URL fragment from recent browsing history.
5. Select a result and confirm that Tipi opens the target page.

`Notes for reviewers:`

- `Tipi does not currently support cloud accounts or remote history sync.`
- `Tipi uses the history permission as its core feature and stores its index locally.`
- `On restricted pages such as chrome:// pages or the browser new tab page, Tipi falls back to a popup window because content scripts cannot be injected there.`

## Listing assets checklist

Prepare these before submission:

- `128x128` extension icon
- Store screenshots from the current UI
- At least one screenshot of the floating search panel
- At least one screenshot of the settings page
- Optional small promotional images if you want a more complete listing

Suggested current screenshot sources:

- [Search screen](/Users/chuxin.jian/Desktop/Code/Tipi/src/docs/design/tipi_search_view_sophisticated_sketch/screen.png:1)
- [Settings screen](/Users/chuxin.jian/Desktop/Code/Tipi/src/docs/design/tipi_configuration_view_sophisticated_sketch/screen.png:1)

## Pre-submission checklist

- `npm test`
- `npx tsc -p tsconfig.json --noEmit`
- `npm run build`
- Verify the unpacked build in Chrome from `.output/chrome-mv3`
- Confirm the privacy policy is reachable at a public URL
- Confirm the listing copy only describes features that are already implemented
- Publish as `Unlisted` first
