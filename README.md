# Bulk Statement Downloader

Browser bookmarklets/scripts that bulk-download all your statements and receipts from major financial institutions. Each script runs entirely in your browser — no data is sent anywhere.

Inspired by [wellsfargo-bulk-PDF-statement-downloader](https://github.com/binary1230/wellsfargo-bulk-PDF-statement-downloader) by [@benedictchen](https://github.com/benedictchen) and [Costco-Receipt-Downloader](https://github.com/harrykhh/Costco-Receipt-Downloader) by [@harrykhh](https://github.com/harrykhh).

## Supported Sites

| Site | Folder | Technique |
|---|---|---|
| [Fidelity](./fidelity/) | `fidelity/` | Intercepts `window.open()` and clicks each statement row |
| [Wells Fargo](./wellsfargo/) | `wellsfargo/` | Intercepts XHR response containing all statement URLs |
| [Chase](./chase/) | `chase/` | Clicks each download link directly from the DOM |
| [Costco](./costco/) | `costco/` | Fetches receipts via GraphQL API, saves as JSON |

## Quick Start

1. Log into your site and navigate to the statements/receipts page
2. Open DevTools Console (`F12`)
3. Paste the contents of the `*-downloader.js` file for your site
4. Follow the on-screen panel to download

See each bank's README for detailed instructions.

## Security & Privacy

- These scripts run **entirely in your browser** — no data is sent anywhere
- No credentials, tokens, or account data are collected or transmitted
- Full unminified source is available in each folder

## License

MIT — see [LICENSE](./LICENSE).
