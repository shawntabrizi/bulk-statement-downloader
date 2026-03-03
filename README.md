# Fidelity Bulk PDF Statement Downloader

A browser bookmarklet/script that bulk-downloads all your PDF statements from [Fidelity's Document Hub](https://digital.fidelity.com/ftgw/digital/portfolio/documents/dochub).

Inspired by [wellsfargo-bulk-PDF-statement-downloader](https://github.com/binary1230/wellsfargo-bulk-PDF-statement-downloader) by [@benedictchen](https://github.com/benedictchen).

## How It Works

Fidelity's document hub is an Angular SPA that doesn't expose direct PDF links in the DOM. Instead, clicking a statement row triggers `window.open()` with the PDF URL. This script:

1. Intercepts `window.open()` to capture PDF URLs without opening new tabs
2. Programmatically clicks each statement row one by one
3. Collects all PDF URLs
4. Downloads them sequentially with descriptive filenames

## Usage

### Step 1: Load Your Statements

1. Log into [Fidelity](https://www.fidelity.com) and navigate to the **[Document Hub](https://digital.fidelity.com/ftgw/digital/portfolio/documents/dochub)**
2. Use the **date range dropdown** to select your desired time period (e.g., "Last 24 months")
3. Click **"Load more results"** repeatedly until **all** statements you want to download are visible on the page

### Step 2: Run the Script

**Option A — Paste in Console (recommended)**

1. Open DevTools (`F12` or `Cmd+Opt+I`)
2. Go to the **Console** tab
3. Copy and paste the contents of [`fidelity-downloader.js`](./fidelity-downloader.js)
4. Press Enter

**Option B — Bookmarklet**

1. Create a new bookmark in your browser
2. Set the **Name** to `Fidelity Download Statements`
3. Set the **URL** to the contents of [`bookmarklet.txt`](./bookmarklet.txt)
4. Navigate to the Document Hub page (with all statements loaded), then click the bookmark

### Step 3: Download

1. A dark panel will appear in the bottom-right corner showing how many statements were found
2. Click **"Download All Statements"**
3. The script will scan each row (Phase 1), then download all PDFs (Phase 2)
4. Watch the status indicator for progress

> **Chrome will likely ask to allow multiple downloads** — click "Allow" when prompted.

## Downloaded Filenames

Files are named descriptively:

```
Fidelity_Statement_2026-Feb_Multiple_accounts.pdf
Fidelity_Statement_2026-Jan_Individual-TOD_X78291089.pdf
Fidelity_Statement_2025-Dec_Limited_Liability_Company_Z33569236.pdf
```

## Configuration

You can adjust timing constants at the top of `fidelity-downloader.js`:

| Variable | Default | Description |
|---|---|---|
| `DELAY_BETWEEN_CLICKS` | `1500` ms | Time between clicking each statement row |
| `DELAY_BETWEEN_DOWNLOADS` | `700` ms | Time between triggering each PDF download |
| `CLICK_TO_URL_TIMEOUT` | `3000` ms | Max time to wait for a PDF URL after clicking a row |

**If some statements fail to download**, try increasing `DELAY_BETWEEN_CLICKS` to `2500` or `3000`.

## Troubleshooting

- **"Could not find documents root"** — You're not on the Document Hub page. Navigate to `digital.fidelity.com/ftgw/digital/portfolio/documents/dochub`.
- **Some statements show TIMEOUT in console** — Increase `DELAY_BETWEEN_CLICKS`. The page may need more time to process each click.
- **Chrome blocks downloads** — When Chrome shows "This site is trying to download multiple files", click **Allow**.
- **Only a few statements visible** — Make sure to expand the date range and click "Load more results" before running the script.
- **Script does nothing** — Make sure you're logged into Fidelity and the statements table is visible on the page.

## Security & Privacy

- This script runs **entirely in your browser** — no data is sent anywhere
- It only interacts with Fidelity's existing page DOM and PDF URLs
- No credentials, tokens, or account data are collected or transmitted
- You can read the full unminified source in [`fidelity-downloader.js`](./fidelity-downloader.js)

## License

MIT — see [LICENSE](./LICENSE).
