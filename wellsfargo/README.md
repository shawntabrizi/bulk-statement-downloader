# Wells Fargo Statement Downloader

Downloads all PDF statements from Wells Fargo's Statements & Documents page.

Wells Fargo loads statement data via an XHR API call. This script intercepts the `XMLHttpRequest` response, extracts all statement URLs from the JSON payload, then downloads them sequentially.

## Usage

### Step 1: Load Your Statements

1. Log into [Wells Fargo](https://www.wellsfargo.com) and navigate to **Statements & Documents**
2. Expand the **"Statements and Disclosures"** section so your statements are visible

### Step 2: Run the Script

**Option A — Paste in Console (recommended)**

1. Open DevTools (`F12` or `Cmd+Opt+I`)
2. Go to the **Console** tab
3. Copy and paste the contents of [`wellsfargo-downloader.js`](./wellsfargo-downloader.js)
4. Press Enter

**Option B — Bookmarklet**

1. Create a new bookmark in your browser
2. Set the **Name** to `Wells Fargo Download Statements`
3. Set the **URL** to the contents of [`wellsfargo-bookmarklet.txt`](./wellsfargo-bookmarklet.txt)
4. Navigate to the Statements & Documents page (with statements visible), then click the bookmark

### Step 3: Download

1. A dark panel will appear in the bottom-right corner showing how many statements were found
2. Click **"Download All Statements"**
3. Watch the status indicator for progress

> **Chrome will likely ask to allow multiple downloads** — click "Allow" when prompted.

## Configuration

You can adjust timing constants at the top of [`wellsfargo-downloader.js`](./wellsfargo-downloader.js):

| Variable | Default | Description |
|---|---|---|
| `DELAY_BETWEEN_DOWNLOADS` | `700` ms | Time between triggering each PDF download |
| `SCAN_TIMEOUT` | `8000` ms | Time to wait for statement data before showing fallback message |

## Troubleshooting

- **Panel says "Waiting for statement data..."** — The script couldn't automatically re-trigger the data load. Collapse and re-expand the "Statements and Disclosures" section on the page.
- **Downloads fail** — Try increasing `DELAY_BETWEEN_DOWNLOADS` to `1000` or `1500`.
