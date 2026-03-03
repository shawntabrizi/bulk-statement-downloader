// Chase Bulk Statement Downloader
// Usage:
//   1. Go to https://secure.chase.com/web/auth/dashboard#/dashboard/documents/myDocs/index;mode=document
//   2. Make sure all account accordions are expanded so statements are visible
//   3. Open DevTools Console (F12) and paste this entire script
//   4. Click the green "Download All Statements" button that appears
//   5. Wait for all downloads to complete (watch the status indicator)

(function () {
  'use strict';

  // --- CONFIG ---
  const DELAY_BETWEEN_DOWNLOADS = 1500; // ms between clicking each download link

  // --- STATE ---
  let statementLinks = [];
  let isCancelled = false;

  // --- FIND STATEMENTS ---
  function getStatements() {
    const links = document.querySelectorAll('a.iconwrap-link[id$="-download"][data-documentid]');
    const results = [];

    links.forEach((link) => {
      const id = link.id; // e.g. accountsTable-0-row0-cell3-requestThisDocumentAnchor-download
      const match = id.match(/accountsTable-(\d+)-row(\d+)/);
      if (!match) return;

      const tableIdx = match[1];
      const rowIdx = match[2];
      const date = link.getAttribute('data-date') || ''; // e.g. "20251214"
      const accountId = link.getAttribute('data-accountid') || '';

      // Get date and type from sibling cells
      const dateCell = document.getElementById(`accountsTable-${tableIdx}-row${rowIdx}-cell0`);
      const typeCell = document.getElementById(`accountsTable-${tableIdx}-row${rowIdx}-cell1`);
      const dateText = dateCell?.textContent?.trim() || date;
      const typeText = typeCell?.textContent?.trim() || 'Statement';

      // Get account name from the parent accordion
      const accordion = document.getElementById(`documentsAccordion-${tableIdx}`);
      let accountName = '';
      if (accordion) {
        // The accordion element's direct text or first text node has the account name
        const headerText = accordion.textContent.trim().split('\n')[0].trim();
        accountName = headerText || `Account_${tableIdx}`;
      }

      results.push({
        link,
        date,
        dateText,
        typeText,
        accountId,
        accountName,
        filename: buildFilename(date, accountName, typeText),
      });
    });

    return results;
  }

  function buildFilename(dateStr, accountName, typeText) {
    // dateStr like "20251214" -> "2025-12-14"
    let datePart = dateStr;
    if (dateStr && dateStr.length === 8) {
      datePart = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }

    // Clean account name: "FREEDOM UNLIMITED (...1234)" -> "FREEDOM_UNLIMITED_1234"
    let acctPart = accountName
      .replace(/\(\.{3}(\d+)\)/, '$1')    // "(...1234)" -> "1234"
      .replace(/[()\.]+/g, '')             // remove leftover parens/dots
      .replace(/\s+/g, '_')               // spaces to underscores
      .replace(/[^a-zA-Z0-9_-]/g, '')     // remove special chars
      .substring(0, 40);
    if (!acctPart) acctPart = 'account';

    let typePart = typeText.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

    return `Chase_${typePart}_${datePart}_${acctPart}.pdf`;
  }

  // --- UI ---
  function createUI() {
    const existing = document.getElementById('chase-dl-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'chase-dl-panel';
    panel.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: #1a1a2e; color: #eee; border-radius: 12px;
      padding: 20px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 340px;
      font-size: 14px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Chase Statement Downloader';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 8px;';
    panel.appendChild(title);

    const info = document.createElement('div');
    info.style.cssText = 'color: #aaa; margin-bottom: 4px;';
    panel.appendChild(info);

    const dateRange = document.createElement('div');
    dateRange.style.cssText = 'color: #aaa; margin-bottom: 16px; font-size: 12px;';
    panel.appendChild(dateRange);

    function refreshInfo() {
      statementLinks = getStatements();
      const years = new Set();
      statementLinks.forEach(({ date }) => {
        if (date && date.length >= 4) years.add(date.slice(0, 4));
      });
      const sorted = Array.from(years).sort();
      info.textContent = `Found ${statementLinks.length} statements on the page`;
      dateRange.textContent = sorted.length > 0
        ? `Date range: ${sorted[0]}${sorted.length > 1 ? ' \u2013 ' + sorted[sorted.length - 1] : ''}`
        : '';
    }
    refreshInfo();

    const status = document.createElement('div');
    status.id = 'chase-dl-status';
    status.textContent = 'Ready. Click "Download All" to begin.';
    status.style.cssText = 'margin-bottom: 16px; min-height: 20px; color: #7ec8e3;';
    panel.appendChild(status);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 10px;';

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download All Statements';
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
      panel.remove();
    };

    dlBtn.onclick = async () => {
      isCancelled = false;
      dlBtn.disabled = true;
      dlBtn.style.opacity = '0.5';
      dlBtn.style.cursor = 'not-allowed';

      await downloadAll(status);

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

  // --- DOWNLOAD ---
  async function downloadAll(statusEl) {
    statusEl.textContent = `Downloading ${statementLinks.length} statements...`;

    for (let i = 0; i < statementLinks.length; i++) {
      if (isCancelled) break;

      const { link, filename, dateText, accountName } = statementLinks[i];
      const displayName = `${dateText} - ${accountName}`.substring(0, 60);
      statusEl.textContent = `Downloading ${i + 1}/${statementLinks.length}: ${displayName}`;

      // Click the download link — Chase handles the PDF download internally
      link.click();

      if (i < statementLinks.length - 1) {
        await sleep(DELAY_BETWEEN_DOWNLOADS);
      }
    }

    statusEl.textContent = isCancelled
      ? `Cancelled. Downloaded some of ${statementLinks.length} statements.`
      : `Done! Downloaded ${statementLinks.length} statements.`;
  }

  // --- HELPERS ---
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- INIT ---
  if (!window.location.hostname.includes('chase.com')) {
    console.warn('This script is designed for Chase.com. Exiting.');
    return;
  }

  console.log('Chase Statement Downloader loaded.');
  console.log('TIP: Make sure all account accordions are expanded before clicking Download.');
  createUI();
})();
