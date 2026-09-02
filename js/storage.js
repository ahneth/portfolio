/**
 * Data Storage & Backup Layer using localStorage
 */
const STORAGE_KEY = 'stock_portfolio_transactions';

const Storage = {
  // Load transactions from localStorage
  getTransactions() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Save transactions to localStorage
  saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  },

  // Add a single transaction
  addTransaction(tx) {
    const transactions = this.getTransactions();
    transactions.push(tx);
    this.saveTransactions(transactions);
  },

  // Delete transaction by ID
  deleteTransaction(id) {
    let transactions = this.getTransactions();
    transactions = transactions.filter(tx => tx.id !== id);
    this.saveTransactions(transactions);
  },

  // Clear all portfolio data
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Export transactions array to CSV file download
  exportToCSV() {
    const transactions = this.getTransactions();
    if (transactions.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['id', 'type', 'ticker', 'date', 'shares', 'price', 'fee'];
    const csvRows = [headers.join(',')];

    transactions.forEach(tx => {
      const row = [
        tx.id,
        tx.type,
        `"${tx.ticker}"`,
        tx.date,
        tx.shares,
        tx.price,
        tx.fee || 0
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portfolio_backup_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Parse CSV text and import back into storage
  importFromCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return false;

    const newTransactions = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 6) {
        newTransactions.push({
          id: cols[0] || Date.now().toString() + i,
          type: cols[1],
          ticker: cols[2].toUpperCase(),
          date: cols[3],
          shares: parseFloat(cols[4]),
          price: parseFloat(cols[5]),
          fee: parseFloat(cols[6] || 0)
        });
      }
    }

    if (newTransactions.length > 0) {
      this.saveTransactions(newTransactions);
      return true;
    }
    return false;
  }
};
