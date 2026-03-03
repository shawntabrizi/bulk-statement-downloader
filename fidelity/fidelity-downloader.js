// Fidelity Bulk Statement Downloader
// Usage:
//   1. Go to https://digital.fidelity.com/ftgw/digital/portfolio/documents/dochub
//   2. Use the date range dropdown to select your desired period
//   3. Click "Load more results" until ALL statements you want are visible
//   4. Open DevTools Console (F12) and paste this entire script
//   5. Click the green "Download All Statements" button that appears
//   6. Wait for all downloads to complete (watch the status indicator)

(function () {
  'use strict';

  // --- CONFIG ---
  const DELAY_BETWEEN_CLICKS = 1500;  // ms between clicking each row
  const DELAY_BETWEEN_DOWNLOADS = 700; // ms between triggering downloads
  const CLICK_TO_URL_TIMEOUT = 3000;   // ms to wait for URL to appear after click

  // --- STATE ---
  let collectedUrls = [];
  let isCollecting = false;
  let isCancelled = false;

  // --- FIND STATEMENTS ---
  function getStatementRows() {
    const docRoot = document.querySelector('ap143528-portsum-dashboard-documents-root');
    if (!docRoot) {
      console.error('Could not find documents root. Are you on the dochub page?');
      return [];
    }
    const rows = docRoot.querySelectorAll('tr.rowHeaderLeft');
    return Array.from(rows);
  }

  function getRowInfo(row) {
    const tds = row.querySelectorAll('td');
    const label = tds[0]?.getAttribute('aria-label') || tds[0]?.textContent?.trim() || 'Unknown';
    const account = tds[2]?.textContent?.trim() || tds[1]?.textContent?.trim() || '';
    const clickTarget = tds[0]?.querySelector('div[role="link"]') || tds[0];
    return { label, account, clickTarget };
  }

  // --- INTERCEPT window.open ---
  function installInterceptor() {
    const origOpen = window.open;
    let pendingResolve = null;

    window.__fidelityOrigOpen = origOpen;
    window.open = function (url, ...rest) {
      if (isCollecting && url && url.includes('PDFStatement')) {
        console.log('Intercepted PDF URL:', url);
        if (pendingResolve) {
          pendingResolve(url);
          pendingResolve = null;
        }
        return null; // Don't actually open the tab
      }
      return origOpen.call(this, url, ...rest);
    };

    // Also intercept via link clicks that might use <a target="_blank">
    window.__fidelityWaitForUrl = function () {
      return new Promise((resolve) => {
        pendingResolve = resolve;
      });
    };
  }

  function uninstallInterceptor() {
    if (window.__fidelityOrigOpen) {
      window.open = window.__fidelityOrigOpen;
      delete window.__fidelityOrigOpen;
      delete window.__fidelityWaitForUrl;
    }
  }

  // --- COLLECT URLS ---
  async function collectAllUrls(statusEl) {
    const rows = getStatementRows();
    if (rows.length === 0) {
      statusEl.textContent = 'No statement rows found!';
      return [];
    }

    isCollecting = true;
    collectedUrls = [];

    for (let i = 0; i < rows.length; i++) {
      if (isCancelled) break;

      const { label, account, clickTarget } = getRowInfo(rows[i]);
      const displayName = `${label} - ${account}`.substring(0, 60);
      statusEl.textContent = `Scanning ${i + 1}/${rows.length}: ${displayName}`;

      // Set up URL promise before clicking
      const urlPromise = window.__fidelityWaitForUrl();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(null), CLICK_TO_URL_TIMEOUT)
      );

      // Click the row
      clickTarget.click();

      // Wait for intercepted URL or timeout
      const url = await Promise.race([urlPromise, timeoutPromise]);

      if (url) {
        collectedUrls.push({
          url,
          label,
          account,
          filename: buildFilename(label, account, url),
        });
        console.log(`[${i + 1}/${rows.length}] Got: ${label} | ${account}`);
      } else {
        console.warn(`[${i + 1}/${rows.length}] TIMEOUT - no URL captured for: ${displayName}`);
      }

      // Wait before next click
      if (i < rows.length - 1) {
        await sleep(DELAY_BETWEEN_CLICKS);
      }
    }

    isCollecting = false;
    return collectedUrls;
  }

  function buildFilename(label, account, url) {
    // label like "Feb 2026 — Statement (pdf)"
    // Extract date portion
    const dateMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);
    let datePart = dateMatch ? `${dateMatch[2]}-${dateMatch[1]}` : 'unknown-date';

    // Clean account name
    let acctPart = account
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 40);
    if (!acctPart) acctPart = 'account';

    return `Fidelity_Statement_${datePart}_${acctPart}.pdf`;
  }

  // --- DOWNLOAD ---
  async function downloadAll(statusEl) {
    statusEl.textContent = `Downloading ${collectedUrls.length} statements...`;

    for (let i = 0; i < collectedUrls.length; i++) {
      if (isCancelled) break;

      const { url, filename } = collectedUrls[i];
      statusEl.textContent = `Downloading ${i + 1}/${collectedUrls.length}: ${filename}`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (i < collectedUrls.length - 1) {
        await sleep(DELAY_BETWEEN_DOWNLOADS);
      }
    }

    statusEl.textContent = isCancelled
      ? `Cancelled. Downloaded some of ${collectedUrls.length} statements.`
      : `Done! Downloaded ${collectedUrls.length} statements.`;
  }

  // --- UI ---
  function createUI() {
    // Remove any existing UI
    const existing = document.getElementById('fidelity-dl-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'fidelity-dl-panel';
    panel.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: #1a1a2e; color: #eee; border-radius: 12px;
      padding: 20px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 340px;
      font-size: 14px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Fidelity Statement Downloader';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 8px;';
    panel.appendChild(title);

    const info = document.createElement('div');
    info.style.cssText = 'color: #aaa; margin-bottom: 4px;';
    panel.appendChild(info);

    const dateRange = document.createElement('div');
    dateRange.style.cssText = 'color: #aaa; margin-bottom: 16px; font-size: 12px;';
    panel.appendChild(dateRange);

    function refreshInfo() {
      const rows = getStatementRows();
      const years = new Set();
      rows.forEach((row) => {
        const label = row.querySelectorAll('td')[0]?.getAttribute('aria-label') || row.querySelectorAll('td')[0]?.textContent || '';
        const m = label.match(/(\d{4})/);
        if (m) years.add(m[1]);
      });
      const sorted = Array.from(years).sort();
      info.textContent = `Found ${rows.length} statements on the page`;
      dateRange.textContent = sorted.length > 0
        ? `Date range: ${sorted[0]}${sorted.length > 1 ? ' \u2013 ' + sorted[sorted.length - 1] : ''}`
        : '';
    }
    refreshInfo();

    const status = document.createElement('div');
    status.id = 'fidelity-dl-status';
    status.textContent = 'Ready. Click "Download All" to begin.';
    status.style.cssText = 'margin-bottom: 16px; min-height: 20px; color: #7ec8e3;';
    panel.appendChild(status);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 10px;';

    const dlBtn = document.createElement('button');
    dlBtn.textContent = `Download All Statements`;
    dlBtn.style.cssText = `
      padding: 12px 24px; font-size: 15px; font-weight: 600;
      background: #28a745; color: white; border: none; border-radius: 8px;
      cursor: pointer; flex: 1;
    `;
    dlBtn.onmouseover = () => (dlBtn.style.background = '#218838');
    dlBtn.onmouseout = () => (dlBtn.style.background = '#28a745');

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 12px 16px; font-size: 15px; font-weight: 600;
      background: #dc3545; color: white; border: none; border-radius: 8px;
      cursor: pointer;
    `;
    cancelBtn.onmouseover = () => (cancelBtn.style.background = '#c82333');
    cancelBtn.onmouseout = () => (cancelBtn.style.background = '#dc3545');

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '\u21BB';
    refreshBtn.title = 'Re-scan page for statements';
    refreshBtn.style.cssText = `
      position: absolute; top: 8px; right: 36px; background: none;
      border: none; color: #888; font-size: 18px; cursor: pointer;
    `;
    refreshBtn.onclick = () => {
      refreshInfo();
      status.textContent = 'Page re-scanned.';
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = `
      position: absolute; top: 8px; right: 12px; background: none;
      border: none; color: #888; font-size: 18px; cursor: pointer;
    `;
    closeBtn.onclick = () => {
      isCancelled = true;
      isCollecting = false;
      uninstallInterceptor();
      panel.remove();
    };

    dlBtn.onclick = async () => {
      isCancelled = false;
      dlBtn.disabled = true;
      dlBtn.style.opacity = '0.5';
      dlBtn.style.cursor = 'not-allowed';

      // Phase 1: Collect URLs by clicking each row
      installInterceptor();
      const urls = await collectAllUrls(status);

      if (urls.length === 0 || isCancelled) {
        uninstallInterceptor();
        dlBtn.disabled = false;
        dlBtn.style.opacity = '1';
        dlBtn.style.cursor = 'pointer';
        if (!isCancelled) status.textContent = 'No URLs collected. Try again or check console.';
        return;
      }

      // Phase 2: Download all collected PDFs
      status.textContent = `Collected ${urls.length} URLs. Starting downloads...`;
      await sleep(500);
      await downloadAll(status);

      uninstallInterceptor();
      dlBtn.disabled = false;
      dlBtn.style.opacity = '1';
      dlBtn.style.cursor = 'pointer';
    };

    cancelBtn.onclick = () => {
      isCancelled = true;
      status.textContent = 'Cancelling...';
    };

    btnRow.appendChild(dlBtn);
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);
    panel.appendChild(refreshBtn);
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
  }

  // --- HELPERS ---
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- INIT ---
  if (!window.location.href.includes('fidelity.com')) {
    console.warn('This script is designed for Fidelity.com. Exiting.');
    return;
  }

  console.log('Fidelity Statement Downloader loaded.');
  console.log('TIP: Set your date range and click "Load more results" until all statements are visible BEFORE clicking Download.');
  createUI();
})();
