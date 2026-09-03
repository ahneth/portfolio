/**
 * Application Controller & UI Renderer
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initForm();
  initBackupControls();
  renderApp();
  
  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
});

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab || !document.getElementById(targetTab)) return;

      navButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

function initForm() {
  const form = document.getElementById('tx-form');
  const formContainer = document.getElementById('form-container');
  const btnToggle = document.getElementById('btn-toggle-form');
  const btnCancel = document.getElementById('btn-cancel-form');

  if (btnToggle && formContainer) {
    btnToggle.addEventListener('click', () => {
      formContainer.classList.toggle('hidden');
    });
  }

  if (btnCancel && formContainer && form) {
    btnCancel.addEventListener('click', () => {
      formContainer.classList.add('hidden');
      form.reset();
      const dateInput = document.getElementById('tx-date');
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      try {
        const newTx = {
          id: Date.now().toString(),
          type: document.getElementById('tx-type')?.value || 'BUY',
          ticker: (document.getElementById('tx-ticker')?.value || '').trim().toUpperCase(),
          sector: document.getElementById('tx-sector')?.value || 'Other',
          date: document.getElementById('tx-date')?.value || new Date().toISOString().slice(0, 10),
          shares: parseFloat(document.getElementById('tx-shares')?.value) || 0,
          price: parseFloat(document.getElementById('tx-price')?.value) || 0,
          fee: parseFloat(document.getElementById('tx-fee')?.value) || 0
        };

        Storage.addTransaction(newTx);
        form.reset();
        
        const dateInput = document.getElementById('tx-date');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        
        if (formContainer) formContainer.classList.add('hidden');
        renderApp();
      } catch (err) {
        console.error("Error saving transaction:", err);
        alert("An error occurred. Could not save the transaction.");
      }
    });
  }
}

function initBackupControls() {
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => Storage.exportToCSV());
  }

  const fileInput = document.getElementById('csv-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const success = Storage.importFromCSV(evt.target.result);
        if (success) {
          alert('Data successfully imported!');
          renderApp();
        } else {
          alert('Failed to parse CSV file. Please check the format.');
        }
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  const btnClear = document.getElementById('btn-clear-all');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all transaction records? This action cannot be undone.')) {
        Storage.clearAll();
        renderApp();
      }
    });
  }
}

// Global render router with Try/Catch
function renderApp() {
  try {
    const transactions = Storage.getTransactions() || [];
    renderPortfolio(transactions);
    renderHistory(transactions);
  } catch (error) {
    console.error("Render failed:", error);
    const listContainer = document.getElementById('transaction-list');
    if (listContainer) {
      listContainer.innerHTML = `<p style="color:var(--danger-color); text-align:center; padding:20px;">Error loading data. Please go to the Data tab and click Clear All Data to start over.<br><br>${error.message}</p>`;
    }
  }
}

function renderPortfolio(transactions) {
  const tbody = document.getElementById('portfolio-body');
  const totalEl = document.getElementById('portfolio-total');
  if (!tbody || !totalEl) return;

  tbody.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No holdings yet.</td></tr>';
    totalEl.textContent = '$0.00';
    return;
  }

  const holdings = {};
  transactions.forEach(tx => {
    const ticker = tx.ticker || 'UNKNOWN';
    if (!holdings[ticker]) {
      holdings[ticker] = { ticker: ticker, sector: tx.sector || 'Other', shares: 0, avgCost: 0 };
    }
    const h = holdings[ticker];

    if (tx.type === 'BUY') {
      const shares = tx.shares || 0;
      const price = tx.price || 0;
      const fee = tx.fee || 0;
      
      const totalCost = (shares * price) + fee;
      const previousTotalValue = h.shares * h.avgCost;
      h.shares += shares;
      
      if (h.shares > 0) {
        h.avgCost = (previousTotalValue + totalCost) / h.shares;
      }
      h.sector = tx.sector || h.sector;
    } else if (tx.type === 'SELL') {
      h.shares -= (tx.shares || 0);
      if (h.shares <= 0.0001) {
        h.shares = 0;
        h.avgCost = 0;
      }
    }
  });

  const activePositions = Object.values(holdings).filter(h => h.shares > 0);

  // 1. Calculate grand total first to determine percentages
  let grandTotal = 0;
  activePositions.forEach(pos => {
    grandTotal += (pos.shares * pos.avgCost);
  });

  // 2. Group active positions by sector
  const sectors = {};
  activePositions.forEach(pos => {
    const sec = pos.sector || 'Other';
    if (!sectors[sec]) {
      sectors[sec] = { positions: [], sectorTotal: 0 };
    }
    sectors[sec].positions.push(pos);
    sectors[sec].sectorTotal += (pos.shares * pos.avgCost);
  });

  // 3. Sort sectors alphabetically
  const sortedSectorNames = Object.keys(sectors).sort();

  // 4. Render each sector group
  sortedSectorNames.forEach(secName => {
    const group = sectors[secName];
    const sectorPct = grandTotal > 0 ? ((group.sectorTotal / grandTotal) * 100).toFixed(1) : 0;

    // Create the Sector Header Row
    const headerTr = document.createElement('tr');
    headerTr.className = 'sector-group-header';
    headerTr.innerHTML = `
      <td colspan="2">
        ${secName}
      </td>
      <td class="text-right">
        $${group.sectorTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style="opacity: 0.7; font-weight: normal; margin-left: 4px;">(${sectorPct}%)</span>
      </td>
    `;
    tbody.appendChild(headerTr);

    // Sort positions within the sector by invested amount (largest first)
    group.positions.sort((a, b) => {
      return (b.shares * b.avgCost) - (a.shares * a.avgCost);
    });

    // Create rows for the individual tickers
    group.positions.forEach(pos => {
      const invested = pos.shares * pos.avgCost;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="ticker-name" style="display: block; font-weight: bold;">${pos.ticker}</span>
        </td>
        <td class="text-right">
          <span class="val-main" style="display: block;">${pos.shares.toFixed(2)}</span>
          <span class="val-sub" style="display: block; color: var(--text-muted);">$${pos.avgCost.toFixed(2)}</span>
        </td>
        <td class="text-right">
          <span class="val-main" style="display: block;">$${invested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  // Update total portfolio value at the bottom/top
  totalEl.textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function renderHistory(transactions) {
  const listContainer = document.getElementById('transaction-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    listContainer.innerHTML = '<p class="help-text" style="text-align:center;">No transactions recorded.</p>';
    return;
  }

  // Defensive date sorting
  const sortedTx = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime() || 0;
    const dateB = new Date(b.date || 0).getTime() || 0;
    return dateB - dateA;
  });

  sortedTx.forEach(tx => {
    const shares = tx.shares || 0;
    const price = tx.price || 0;
    const fee = tx.fee || 0;
    const totalVal = (shares * price) + fee;
    const typeClass = tx.type === 'SELL' ? 'SELL' : 'BUY';
    
    const itemHtml = document.createElement('div');
    itemHtml.className = 'tx-item';
    itemHtml.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="tx-badge ${typeClass}">${tx.type || 'BUY'}</span>
        <div class="tx-details">
          <span class="tx-ticker">${tx.ticker || 'UNKNOWN'} <span style="font-weight:normal; font-size: 0.75rem;">(${tx.sector || '-'})</span></span>
          <span class="tx-sub">${tx.date || '-'} • ${shares} sh @ $${price.toFixed(2)}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <div class="tx-amount">$${totalVal.toFixed(2)}</div>
        <button class="tx-delete" onclick="deleteItem('${tx.id}')">&times;</button>
      </div>
    `;
    listContainer.appendChild(itemHtml);
  });
}

window.deleteItem = function(id) {
  if (confirm('Delete this transaction?')) {
    Storage.deleteTransaction(id);
    renderApp();
  }
};
