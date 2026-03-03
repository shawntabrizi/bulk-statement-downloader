# Chase Statement Downloader

Downloads all PDF statements from Chase's [Statements & Documents](https://secure.chase.com/web/auth/dashboard#/dashboard/documents/myDocs/index;mode=document) page.

Chase renders download links directly in the DOM for each statement. This script finds all download links on the page, then clicks each one sequentially to trigger downloads.

## Usage

### Step 1: Load Your Statements

1. Log into [Chase](https://www.chase.com) and navigate to **[Statements & Documents](https://secure.chase.com/web/auth/dashboard#/dashboard/documents/myDocs/index;mode=document)**
2. Make sure all account accordions are **expanded** so all statements are visible
3. If you want older statements, use the date range filter to load more

### Step 2: Run the Script

**Option A — Paste in Console (recommended)**

1. Open DevTools (`F12` or `Cmd+Opt+I`)
2. Go to the **Console** tab
3. Copy and paste the contents of [`chase-downloader.js`](./chase-downloader.js)
4. Press Enter

**Option B — Bookmarklet**

1. Create a new bookmark in your browser
2. Set the **Name** to `Chase Download Statements`
3. Set the **URL** to the contents of [`chase-bookmarklet.txt`](./chase-bookmarklet.txt)
4. Navigate to the Statements & Documents page (with all statements visible), then click the bookmark

### Step 3: Download

1. A dark panel will appear in the bottom-right corner showing how many statements were found
2. Click **"Download All Statements"**
3. Watch the status indicator for progress

> **Chrome will likely ask to allow multiple downloads** — click "Allow" when prompted.

## Downloaded Filenames

```
Chase_Statement_2025-12-14_FREEDOM_UNLIMITED_1234.pdf
Chase_Statement_2025-11-05_SAPPHIRE_PREFERRED_5678.pdf
```

## Configuration

You can adjust the timing constant at the top of [`chase-downloader.js`](./chase-downloader.js):

| Variable | Default | Description |
|---|---|---|
| `DELAY_BETWEEN_DOWNLOADS` | `1500` ms | Time between clicking each download link |

## Troubleshooting

- **"Found 0 statements"** — Make sure all account accordions are expanded. The script can only find statements that are visible in the DOM.
- **Downloads fail or are incomplete** — Try increasing `DELAY_BETWEEN_DOWNLOADS` to `2000` or `2500`.
