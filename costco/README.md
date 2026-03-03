# Costco Receipt Downloader

Downloads all your Costco warehouse receipts as a JSON file via the Costco GraphQL API.

Based on [Costco-Receipt-Downloader](https://github.com/harrykhh/Costco-Receipt-Downloader) by [@harrykhh](https://github.com/harrykhh), adapted as a bookmarklet with our standard UI.

## Usage

### Step 1: Log In

1. Go to [Costco.com](https://www.costco.com) and **log into your account**

### Step 2: Run the Script

**Option A — Paste in Console (recommended)**

1. Open DevTools (`F12` or `Cmd+Opt+I`)
2. Go to the **Console** tab
3. Copy and paste the contents of [`costco-downloader.js`](./costco-downloader.js)
4. Press Enter

**Option B — Bookmarklet**

1. Create a new bookmark in your browser
2. Set the **Name** to `Costco Download Receipts`
3. Set the **URL** to the contents of [`costco-bookmarklet.txt`](./costco-bookmarklet.txt)
4. While logged into Costco.com, click the bookmark

### Step 3: Download

1. A dark panel will appear in the bottom-right corner
2. Adjust the **start date** if you want a different range (defaults to 3 years back)
3. Click **"Download Receipts"**
4. A JSON file will be saved with all your receipt data

## Output

The downloaded JSON contains an array of receipt objects with:
- Transaction date, warehouse name/location
- Itemized list with descriptions and amounts
- Tender details (payment method)
- Coupons and instant savings
- Subtotals, taxes, and totals

## Troubleshooting

- **"No auth token found"** — Make sure you are logged into your Costco account. The script reads auth tokens from localStorage.
- **"No receipts found"** — Try expanding the date range. Only in-warehouse purchases have receipts (not online orders).
- **API error** — Your session may have expired. Refresh the page and try again.
