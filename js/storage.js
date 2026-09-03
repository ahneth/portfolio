/**
 * Data Storage & Backup Layer using localStorage
 */
const STORAGE_KEY = 'stock_portfolio_transactions';

const Storage = {
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Storage parse error:", e);
      return []; // Return empty array to prevent crashing if JSON is corrupted
    }
  },

  saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  },

  addTransaction(tx) {
    const transactions = this.getTransactions();
    transactions.push(tx);
    this.saveTransactions(transactions);
  },

  deleteTransaction(id) {
    let transactions = this.getTransactions();
    transactions = transactions.filter(tx => tx.id !== id);
    this.saveTransactions(transactions);
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  exportToCSV() {
    const transactions = this.getTransactions();
    if (transactions.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ['id', 'type', 'ticker', 'sector', 'date', 'shares', 'price', 'fee'];
    const csvRows = [headers.join(',')];

    transactions.forEach(tx => {
      const row = [
        tx.id,
        tx.type || 'BUY',
        `"${tx.ticker || 'UNKNOWN'}"`,
        `"${tx.sector || 'Other'}"`,
        tx.date || '',
        tx.shares || 0,
        tx.price || 0,
        tx.fee || 0
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portfolio_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  importFromCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return false;

    const newTransactions = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 7) {
        newTransactions.push({
          id: cols[0] || Date.now().toString() + i,
          type: cols[1] || 'BUY',
          ticker: (cols[2] || '').toUpperCase(),
          sector: cols[3] || 'Other',
          date: cols[4] || '',
          shares: parseFloat(cols[5]) || 0,
          price: parseFloat(cols[6]) || 0,
          fee: parseFloat(cols[7]) || 0
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
