document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initForm();
  initBackupControls();
  renderApp();
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
});

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
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

  // Toggle form visibility
  btnToggle.addEventListener('click', () => {
    formContainer.classList.toggle('hidden');
  });
  
  btnCancel.addEventListener('click', () => {
    formContainer.classList.add('hidden');
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTx = {
      id: Date.now().toString(),
      type: document.getElementById('tx-type').value,
      ticker: document.getElementById('tx-ticker').value.trim().toUpperCase(),
      sector: document.getElementById('tx-sector').value, // Capture Sector
      date: document.getElementById('tx-date').value,
      shares: parseFloat(document.getElementById('tx-shares').value),
      price: parseFloat(document.getElementById('tx-price').value),
      fee: parseFloat(document.getElementById('tx-fee').value || 0)
    };

    Storage.addTransaction(newTx);
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
    formContainer.classList.add('hidden'); // Hide after saving
    renderApp();
  });
}

function initBackupControls() {
  document.getElementById('btn-export-csv').addEventListener('click', () => { Storage.exportToCSV(); });

  const fileInput = document.getElementById('csv-file-input');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (Storage.importFromCSV(evt.target.result)) {
        alert('Data successfully imported!');
        renderApp();
      } else {
        alert('Failed to parse CSV.');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all transaction data?')) {
      Storage.clearAll();
      renderApp();
    }
  });
}

function renderApp() {
  const transactions = Storage.getTransactions();
  renderPortfolio(transactions);
  renderHistory(transactions);
}

// Consolidate holdings, sort, and render Tab 1
function renderPortfolio(transactions) {
  const tbody = document.getElementById('portfolio-body');
  const totalEl = document.getElementById('portfolio-total');
  tbody.innerHTML = '';
  
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No holdings yet.</td></tr>';
    totalEl.textContent = '$0.00';
    return;
  }

  // Consolidation logic using Average Cost Basis
  const holdings = {};
  transactions.forEach(tx => {
    if (!holdings[tx.ticker]) {
      holdings[tx.ticker] = { ticker: tx.ticker, sector: tx.sector || 'Other', shares: 0, avgCost: 0 };
    }
    const h = holdings[tx.ticker];
    
    if (tx.type === 'BUY') {
      const totalCost = (tx.shares * tx.price) + (tx.fee || 0);
      const previousTotalValue = h.shares * h.avgCost;
      h.shares += tx.shares;
      // Calculate new average cost per share
      h.avgCost = (previousTotalValue + totalCost) / h.shares;
      h.sector = tx.sector || h.sector; // Update to latest known sector
    } else if (tx.type === 'SELL') {
      h.shares -= tx.shares;
      if (h.shares <= 0.0001) { // Clean up floating point math issues
        h.shares = 0;
        h.avgCost = 0;
      }
    }
  });

  // Filter out closed positions (0 shares)
  let activePositions = Object.values(holdings).filter(h => h.shares > 0);

  // Sort: Sector (ASC) -> Amount Invested (DESC)
  activePositions.sort((a, b) => {
    if (a.sector < b.sector) return -1;
    if (a.sector > b.sector) return 1;
    const aInvested = a.shares * a.avgCost;
    const bInvested = b.shares * b.avgCost;
    return bInvested - aInvested;
  });

  let grandTotal = 0;

  activePositions.forEach(pos => {
    const invested = pos.shares * pos.avgCost;
    grandTotal += invested;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="ticker-name">${pos.ticker}</span>
        <span class="sector-name">${pos.sector}</span>
      </td>
      <td class="text-right">
        <span class="val-main">${pos.shares.toFixed(2)}</span>
        <span class="val-sub">$${pos.avgCost.toFixed(2)} avg</span>
      </td>
      <td class="text-right">
        <span class="val-main">$${invested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Render raw transactions list in Tab 2
function renderHistory(transactions) {
  const listContainer = document.getElementById('transaction-list');
  listContainer.innerHTML = '';

  if (transactions.length === 0) {
    listContainer.innerHTML = '<p class="help-text" style="text-align:center;">No transactions recorded.</p>';
    return;
  }

  // Sort transactions by date descending
  const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedTx.forEach(tx => {
    const totalVal = (tx.shares * tx.price) + (tx.fee || 0);
    const itemHtml = document.createElement('div');
    itemHtml.className = 'tx-item';
    itemHtml.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="tx-badge ${tx.type}">${tx.type}</span>
        <div class="tx-details">
          <span class="tx-ticker">${tx.ticker} <span style="font-weight:normal; font-size: 0.75rem;">(${tx.sector || '-'})</span></span>
          <span class="tx-sub">${tx.date} • ${tx.shares} sh @ $${tx.price.toFixed(2)}</span>
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

// Global deletion hook
window.deleteItem = function(id) {
  if (confirm('Delete this transaction?')) {
    Storage.deleteTransaction(id);
    renderApp();
  }
};
