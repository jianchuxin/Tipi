# Tipi Privacy Policy

Last updated: 2026-04-18

Tipi is a local-first browser extension for searching and reopening pages from your browsing history. Tipi is designed to work on data stored in your browser and, in the current version, does not send your browsing history to a remote server operated by Tipi.

## Summary

Tipi currently:

- Reads your browser history after you grant the extension the required permission
- Builds a local search index on your device
- Stores extension settings and search metadata locally in the browser
- Uses favicon access in Chromium-based browsers to display site icons in search results

Tipi currently does not:

- Create user accounts
- Sync data to a cloud service
- Upload browsing history to Tipi servers
- Share browsing history with advertisers or data brokers
- Use third-party analytics or telemetry services

## Information Tipi accesses

Depending on how you use the extension, Tipi may access:

- Browser history entries available through the browser history permission
- Page metadata from history records, including URL, page title, hostname, visit count, typed count, and last visited time
- Active tab and window context when opening the search UI or reopening a selected result
- Site favicon resources in Chromium-based browsers, only for rendering search result icons

## Information Tipi stores locally

Tipi stores a local search index in the browser's extension storage and IndexedDB. The current stored data may include:

- URL
- Page title
- Hostname
- Normalized search fields derived from the title and URL
- Visit count
- Typed count
- Last visited time
- Last time a result was opened from Tipi
- Last successful sync timestamp
- Extension settings such as auto-sync and result display preferences

This data is stored locally on your device inside the browser's extension storage area.

## How Tipi uses data

Tipi uses local browsing history data only to provide its core functionality:

- Index browsing history for fast local search
- Rank and display matching results
- Reopen pages you select from the extension
- Remember extension behavior preferences

## Data sharing

In the current version, Tipi does not sell, transfer, or share your browsing history with third parties for advertising or unrelated purposes.

If a future version introduces cloud sync, accounts, AI processing, bookmarks indexing, tab indexing, analytics, or any other remote processing, this policy should be updated before that version is released.

## Permissions and purpose

Tipi currently requests these browser permissions:

- `history`
  Needed to read browser history so Tipi can build and search a local history index.
- `storage`
  Needed to persist the local search index and extension settings.
- `tabs`
  Needed to open selected results and detect the active tab when launching the search experience.
- `windows`
  Needed to focus or create the fallback popup window in restricted pages where the in-page overlay cannot be injected.
- `favicon`
  Needed in Chromium-based browsers to render site icons inside result rows.

## Your choices

You can control or remove Tipi data in several ways:

- Disable or remove the extension from your browser
- Open the Tipi settings page and use `Clear Local Cache`
- Clear your browser history if you also want the source history records removed from the browser itself
- Change Tipi settings such as auto-sync, result limits, favicon display, and ranking preferences

## Contact and scope

This policy describes the behavior of the current implementation in this repository. If you publish Tipi to the Chrome Web Store, use a public URL for this document and keep it updated as the product changes.
