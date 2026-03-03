// Wells Fargo Bulk Statement Downloader
// Usage:
//   1. Go to https://connect.secure.wellsfargo.com/accounts/start
//   2. Navigate to "Statements & Documents"
//   3. Make sure the "Statements and Disclosures" section is expanded
//   4. Open DevTools Console (F12) and paste this entire script
//   5. Click the green "Download All Statements" button that appears
//   6. Wait for all downloads to complete (watch the status indicator)

(function () {
  'use strict';

  // --- CONFIG ---
  const DELAY_BETWEEN_DOWNLOADS = 700; // ms between triggering downloads
  const SCAN_TIMEOUT = 8000;           // ms to wait for statement data before giving up

  // --- STATE ---
  let statements = [];
  let isCancelled = false;

  // --- HELPERS ---
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- PARSE STATEMENT RESPONSE ---
  function parseStatementResponse(responseText) {
    let str = responseText;
    // Strip wrapper characters (24 from each end)
    str = str.substr(24);
    str = str.substr(0, str.length - 24);
    str = str.replace(/\\"/g, '"');
    const parsed = JSON.parse(str);
    return parsed.statementsDisclosuresInfo.statements;
  }

  // --- UI ---
  function createUI(onStatementsReady) {
    // Remove any existing UI
    const existing = document.getElementById('wf-dl-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'wf-dl-panel';
    panel.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: #1a1a2e; color: #eee; border-radius: 12px;
      padding: 20px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 340px;
      font-size: 14px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Wells Fargo Statement Downloader';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 8px;';
    panel.appendChild(title);

    const info = document.createElement('div');
    info.id = 'wf-dl-info';
    info.textContent = 'Scanning for statements...';
    info.style.cssText = 'color: #aaa; margin-bottom: 4px;';
    panel.appendChild(info);

    const dateRange = document.createElement('div');
    dateRange.id = 'wf-dl-daterange';
    dateRange.style.cssText = 'color: #aaa; margin-bottom: 16px; font-size: 12px;';
    panel.appendChild(dateRange);

    const status = document.createElement('div');
    status.id = 'wf-dl-status';
    status.textContent = '';
    status.style.cssText = 'margin-bottom: 16px; min-height: 20px; color: #7ec8e3;';
    panel.appendChild(status);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 10px;';

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download All Statements';
    dlBtn.disabled = true;
    dlBtn.style.cssText = `
      padding: 12px 24px; font-size: 15px; font-weight: 600;
      background: #28a745; color: white; border: none; border-radius: 8px;
      cursor: not-allowed; flex: 1; opacity: 0.5;
    `;
    dlBtn.onmouseover = () => { if (!dlBtn.disabled) dlBtn.style.background = '#218838'; };
    dlBtn.onmouseout = () => { if (!dlBtn.disabled) dlBtn.style.background = '#28a745'; };

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
    refreshBtn.title = 'Re-trigger statement scan';
    refreshBtn.style.cssText = `
      position: absolute; top: 8px; right: 36px; background: none;
      border: none; color: #888; font-size: 18px; cursor: pointer;
    `;
    refreshBtn.onclick = () => {
      info.textContent = 'Re-scanning...';
      status.textContent = '';
      dateRange.textContent = '';
      retriggerStatements();
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = `
      position: absolute; top: 8px; right: 12px; background: none;
      border: none; color: #888; font-size: 18px; cursor: pointer;
    `;
    closeBtn.onclick = () => {
      isCancelled = true;
      uninstallInterceptor();
      panel.remove();
    };

    function updateDateRange() {
      const years = new Set();
      statements.forEach((s) => {
        const m = (s.documentDisplayName || '').match(/(\d{4})/);
        if (m) years.add(m[1]);
      });
      const sorted = Array.from(years).sort();
      dateRange.textContent = sorted.length > 0
        ? `Date range: ${sorted[0]}${sorted.length > 1 ? ' \u2013 ' + sorted[sorted.length - 1] : ''}`
        : '';
    }

    // Enable download button once statements are loaded
    onStatementsReady.then(() => {
      info.textContent = `Found ${statements.length} statements`;
      updateDateRange();
      status.textContent = 'Ready. Click "Download All" to begin.';
      dlBtn.disabled = false;
      dlBtn.style.opacity = '1';
      dlBtn.style.cursor = 'pointer';
    });

    dlBtn.onclick = async () => {
      if (dlBtn.disabled) return;
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

    return { status, info, dateRange };
  }

  // --- DOWNLOAD ---
  async function downloadAll(statusEl) {
    statusEl.textContent = `Downloading ${statements.length} statements...`;

    for (let i = 0; i < statements.length; i++) {
      if (isCancelled) break;

      const statement = statements[i];
      const dataUrl = 'https://connect.secure.wellsfargo.com' + statement.url;
      const filename = statement.documentDisplayName || `WellsFargo_Statement_${i + 1}.pdf`;
      statusEl.textContent = `Downloading ${i + 1}/${statements.length}: ${filename}`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (i < statements.length - 1) {
        await sleep(DELAY_BETWEEN_DOWNLOADS);
      }
    }

    statusEl.textContent = isCancelled
      ? `Cancelled. Downloaded some of ${statements.length} statements.`
      : `Done! Downloaded ${statements.length} statements.`;
  }

  // --- XHR INTERCEPTOR ---
  function installInterceptor(onFound) {
    if (window.__wfOrigXHROpen) {
      // Already installed — reinstall with new callback
      window.XMLHttpRequest.prototype.open = window.__wfOrigXHROpen;
      delete window.__wfOrigXHROpen;
    }

    window.__wfOrigXHROpen = window.XMLHttpRequest.prototype.open;

    const interceptor = function (method, url) {
      if (url && url.indexOf('/edocs/documents/statement/list') !== -1) {
        console.log('Wells Fargo statement list request detected.');
        this.addEventListener('load', function () {
          try {
            statements = parseStatementResponse(this.responseText);
            console.log(`Found ${statements.length} statements.`);
            onFound();
          } catch (e) {
            console.error('Failed to parse Wells Fargo statement data:', e);
          }
        });
      }
      return window.__wfOrigXHROpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.open = interceptor;
  }

  function uninstallInterceptor() {
    if (window.__wfOrigXHROpen) {
      window.XMLHttpRequest.prototype.open = window.__wfOrigXHROpen;
      delete window.__wfOrigXHROpen;
    }
  }

  // --- RE-TRIGGER STATEMENT LOAD ---
  function retriggerStatements() {
    // Find the Statements and Disclosures accordion toggle and collapse/re-expand it
    // to re-fire the XHR that fetches statement data.
    const toggleSelectors = [
      'button[aria-controls*="statement"]',
      'a[aria-controls*="statement"]',
      '[data-testid*="statement"] button',
      '[data-testid*="Statement"] button',
    ];

    let toggle = null;
    for (const sel of toggleSelectors) {
      toggle = document.querySelector(sel);
      if (toggle) break;
    }

    // Fallback: search by text content
    if (!toggle) {
      const candidates = document.querySelectorAll('button, a[role="button"], [role="tab"], h2 button, h3 button, .accordion-toggle, .accordion-header');
      for (const el of candidates) {
        if (el.textContent && el.textContent.match(/statements?\s*(and|&)\s*disclosures?/i)) {
          toggle = el;
          break;
        }
      }
    }

    if (toggle) {
      console.log('Found accordion toggle, re-triggering statement load...');
      // If expanded, collapse then re-expand
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.click();
      if (isExpanded) {
        setTimeout(() => toggle.click(), 500);
      }
      return true;
    }

    console.warn('Could not find Statements accordion toggle.');
    return false;
  }

  // --- INIT ---
  if (window.location.hostname.toLowerCase().indexOf('wellsfargo') === -1) {
    console.warn('This script is designed for Wells Fargo. Exiting.');
    return;
  }

  console.log('Wells Fargo Statement Downloader loaded.');

  // Set up a promise that resolves when statement data is captured
  let resolveReady;
  const statementsReady = new Promise((resolve) => { resolveReady = resolve; });

  // Show UI immediately
  const { status, info } = createUI(statementsReady);

  // Install interceptor
  installInterceptor(() => resolveReady());

  // Try to re-trigger the statements API call
  const retriggered = retriggerStatements();

  // If we couldn't re-trigger, show a helpful message
  if (!retriggered) {
    info.textContent = 'Waiting for statement data...';
    status.textContent = 'Collapse and re-expand "Statements and Disclosures" to load data.';
  }

  // Timeout fallback
  setTimeout(() => {
    if (statements.length === 0) {
      info.textContent = 'No statements detected yet.';
      status.textContent = 'Try collapsing and re-expanding "Statements and Disclosures".';
    }
  }, SCAN_TIMEOUT);
})();
