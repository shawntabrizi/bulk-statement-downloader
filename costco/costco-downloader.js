// Costco Bulk Receipt Downloader
// Usage:
//   1. Go to https://www.costco.com and make sure you are logged in
//   2. Open DevTools Console (F12) and paste this entire script
//   3. Adjust the start date if needed, then click "Download Receipts"
//   4. Receipts are saved as a JSON file
//
// Based on https://github.com/harrykhh/Costco-Receipt-Downloader by @harrykhh

(function () {
  'use strict';

  // --- HELPERS ---
  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function defaultStartDate() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  }

  // --- GRAPHQL QUERY ---
  const RECEIPT_QUERY = `query receipts($startDate: String!, $endDate: String!) {
    receipts(startDate: $startDate, endDate: $endDate) {
      warehouseName documentType transactionDateTime transactionDate
      companyNumber warehouseNumber operatorNumber warehouseShortName
      registerNumber transactionNumber transactionType transactionBarcode
      total warehouseAddress1 warehouseAddress2 warehouseCity warehouseState
      warehouseCountry warehousePostalCode totalItemCount subTotal taxes total
      itemArray {
        itemNumber itemDescription01 itemDescription02 itemIdentifier unit amount taxFlag
      }
      tenderArray {
        tenderTypeCode tenderDescription amountTender displayAccountNumber
      }
      couponArray { upcnumberCoupon amountCoupon }
      instantSavings membershipNumber
    }
  }`.replace(/\s+/g, ' ');

  // --- UI ---
  function createUI() {
    const existing = document.getElementById('costco-dl-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'costco-dl-panel';
    panel.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      background: #1a1a2e; color: #eee; border-radius: 12px;
      padding: 20px; font-family: -apple-system, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 340px;
      font-size: 14px;
    `;

    const title = document.createElement('div');
    title.textContent = 'Costco Receipt Downloader';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 8px;';
    panel.appendChild(title);

    const info = document.createElement('div');
    info.style.cssText = 'color: #aaa; margin-bottom: 4px;';
    info.textContent = 'Downloads all warehouse receipts as JSON';
    panel.appendChild(info);

    const dateRange = document.createElement('div');
    dateRange.style.cssText = 'color: #aaa; margin-bottom: 12px; font-size: 12px;';
    panel.appendChild(dateRange);

    // Date input row
    const dateRow = document.createElement('div');
    dateRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 16px;';

    const dateLabel = document.createElement('label');
    dateLabel.textContent = 'From:';
    dateLabel.style.cssText = 'color: #aaa; font-size: 13px;';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = localStorage.crdDate || defaultStartDate();
    dateInput.style.cssText = `
      flex: 1; padding: 8px; border: 1px solid #444; border-radius: 6px;
      background: #2a2a3e; color: #eee; font-size: 13px;
    `;
    dateInput.onchange = () => { localStorage.crdDate = dateInput.value; };

    dateRow.appendChild(dateLabel);
    dateRow.appendChild(dateInput);
    panel.appendChild(dateRow);

    const status = document.createElement('div');
    status.id = 'costco-dl-status';
    status.textContent = 'Ready. Click "Download Receipts" to begin.';
    status.style.cssText = 'margin-bottom: 16px; min-height: 20px; color: #7ec8e3;';
    panel.appendChild(status);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 10px;';

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download Receipts';
    dlBtn.style.cssText = `
      padding: 12px 24px; font-size: 15px; font-weight: 600;
      background: #28a745; color: white; border: none; border-radius: 8px;
      cursor: pointer; flex: 1;
    `;
    dlBtn.onmouseover = () => { if (!dlBtn.disabled) dlBtn.style.background = '#218838'; };
    dlBtn.onmouseout = () => { if (!dlBtn.disabled) dlBtn.style.background = '#28a745'; };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = `
      position: absolute; top: 8px; right: 12px; background: none;
      border: none; color: #888; font-size: 18px; cursor: pointer;
    `;
    closeBtn.onclick = () => panel.remove();

    dlBtn.onclick = async () => {
      dlBtn.disabled = true;
      dlBtn.style.opacity = '0.5';
      dlBtn.style.cursor = 'not-allowed';

      const startDate = dateInput.value;
      const endDate = formatDate(new Date());

      status.textContent = 'Fetching receipts from Costco API...';

      try {
        const receipts = await fetchReceipts(startDate, endDate);

        if (receipts.length === 0) {
          status.textContent = 'No receipts found for this date range.';
        } else {
          // Update date range display
          const years = new Set();
          receipts.forEach((r) => {
            const m = (r.transactionDate || r.transactionDateTime || '').match(/(\d{4})/);
            if (m) years.add(m[1]);
          });
          const sorted = Array.from(years).sort();
          dateRange.textContent = sorted.length > 0
            ? `Date range: ${sorted[0]}${sorted.length > 1 ? ' \u2013 ' + sorted[sorted.length - 1] : ''}`
            : '';

          // Download as JSON
          const blob = new Blob([JSON.stringify(receipts, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `Costco_Receipts_${startDate}_to_${endDate.replace(/\//g, '-')}.json`;
          a.click();
          URL.revokeObjectURL(a.href);

          status.textContent = `Done! Downloaded ${receipts.length} receipts.`;
          info.textContent = `Found ${receipts.length} receipts`;
        }
      } catch (e) {
        console.error('Costco Receipt Downloader error:', e);
        status.textContent = 'Error fetching receipts. Check console for details.';
        status.style.color = '#ff6b6b';
        setTimeout(() => { status.style.color = '#7ec8e3'; }, 3000);
      }

      dlBtn.disabled = false;
      dlBtn.style.opacity = '1';
      dlBtn.style.cursor = 'pointer';
    };

    btnRow.appendChild(dlBtn);
    panel.appendChild(btnRow);
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
  }

  // --- API ---
  function fetchReceipts(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const idToken = localStorage.getItem('idToken') || '';
      const clientID = localStorage.getItem('clientID') || '';

      if (!idToken) {
        reject(new Error('No auth token found in localStorage. Make sure you are logged in to Costco.'));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('POST', 'https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql');
      xhr.setRequestHeader('Content-Type', 'application/json-patch+json');
      xhr.setRequestHeader('Costco.Env', 'ecom');
      xhr.setRequestHeader('Costco.Service', 'restOrders');
      xhr.setRequestHeader('Costco-X-Wcs-Clientid', clientID);
      xhr.setRequestHeader('Client-Identifier', '481b1aec-aa3b-454b-b81b-48187e28f205');
      xhr.setRequestHeader('Costco-X-Authorization', 'Bearer ' + idToken);

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response?.data?.receipts || []);
        } else {
          reject(new Error(`API returned status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(JSON.stringify({
        query: RECEIPT_QUERY,
        variables: { startDate, endDate },
      }));
    });
  }

  // --- INIT ---
  if (!window.location.hostname.includes('costco.com')) {
    console.warn('This script is designed for Costco.com. Exiting.');
    return;
  }

  console.log('Costco Receipt Downloader loaded.');
  createUI();
})();
