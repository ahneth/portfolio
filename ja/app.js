/**
 * Application Controller & UI Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initForm();
  initBackupControls();
  renderApp();
  
  // Set default date picker to today
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
});

// Tab Navigation Logic
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

// Form Submission Logic
function initForm() {
  const form = document.getElementById('tx-form');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTx = {
      id: Date.now().toString(),
      type: document.getElementById('tx-type').value,
      ticker: document.getElementById('tx-ticker').value.trim().toUpperCase(),
      date: document.getElementById('tx-date').value,
      shares: parseFloat(document.getElementById('tx-shares').value),
      price: parseFloat(document.getElementById('tx-price').value),
      fee: parseFloat(document.getElementById('tx-fee').value || 0)
    };

    Storage.addTransaction(newTx);
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
    
    renderApp();
    
    // Switch to Portfolio tab automatically
    document.querySelector('[data-tab="tab-portfolio"]').click();
  });
}

// Backup / Import / Export Handling
function initBackupControls() {
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    Storage.exportToCSV();
  });

  const fileInput = document.getElementById('csv-file-input');
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
        alert('Failed to parse CSV. Check file format.');
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

// Render Transactions List and Portfolio Stats
function renderApp() {
  const transactions = Storage.getTransactions();
  const listContainer = document.getElementById('transaction-list');
  const totalInvestedEl = document.getElementById('total-invested');
  const totalCountEl = document.getElementById('total-tx-count');

  listContainer.innerHTML = '';
  let totalCost = 0;

  if (transactions.length === 0) {
    listContainer.innerHTML = '<p class="help-text" style="text-align:center;">No transactions recorded yet.</p>';
    totalInvestedEl.textContent = '$0.00';
    totalCountEl.textContent = '0';
    return;
  }

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  transactions.forEach(tx => {
    const totalVal = (tx.shares * tx.price) + (tx.fee || 0);
    if (tx.type === 'BUY') {
      totalCost += totalVal;
    } else {
      totalCost -= totalVal;
    }

    const itemHtml = document.createElement('div');
    itemHtml.className = 'tx-item';
    itemHtml.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="tx-badge ${tx.type}">${tx.type}</span>
        <div class="tx-details">
          <span class="tx-ticker">${tx.ticker}</span>
          <span class="tx-sub">${tx.date} • ${tx.shares} shares @ $${tx.price.toFixed(2)}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <div class="tx-amount">$${totalVal.toFixed(2)}</div>
        <button class="tx-delete" onclick="deleteItem('${tx.id}')">&times;</button>
      </div>
    `;
    listContainer.appendChild(itemHtml);
  });

  totalInvestedEl.textContent = `$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  totalCountEl.textContent = transactions.length.toString();
}

// Global deletion hook
window.deleteItem = function(id) {
  if (confirm('Delete this transaction?')) {
    Storage.deleteTransaction(id);
    renderApp();
  }
};
