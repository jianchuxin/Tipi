# Privacy

Tipi currently works as a local-first browser extension. The current implementation does not send your browsing data to a remote server.

## What Tipi accesses

- Browser history entries you have permissioned the extension to read
- Basic page metadata from history entries: URL, title, hostname, visit count, typed count, and last visited time
- Active tab and window context when opening the search UI or opening a selected result
- Site favicon URLs in Chromium-based browsers, only to render result icons inside the extension UI

## What Tipi stores locally

Tipi stores a local search index in the extension's IndexedDB storage. The current stored fields are:

- URL
- Page title
- Hostname
- Normalized search fields derived from the URL and title
- Visit count
- Typed count
- Last visited time
- Last time a result was opened from Tipi
- Last sync timestamp

This data is stored inside the extension's local storage area on your machine.

## What Tipi does not currently do

- No cloud sync
- No account system
- No external analytics or telemetry
- No remote API calls for search
- No upload of your history to a third party

## Current permissions and why they exist

- `history`: read browser history so Tipi can index and search it
- `storage`: persist the local index and extension metadata
- `tabs`: detect the active tab, open selected results, and locate the fallback popup window
- `windows`: focus or create the fallback popup window
- `favicon`: fetch site icons for result rendering in Chromium-based browsers

## How to remove data

- Use the extension settings page and run `Clear Local Cache`
- Remove the extension from the browser to remove its local extension storage
- Clear browser history if you also want the source data removed from the browser itself

## Scope note

This file describes the current implementation in this repository as of today. If Tipi later adds sync, accounts, AI features, bookmarks, or tab indexing, this document should be updated before release.
