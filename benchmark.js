const transactions = [];
const categories = [];

for (let i = 0; i < 20; i++) {
  categories.push({ id: `cat-${i}`, name: `Category ${i}` });
}

for (let i = 0; i < 10000; i++) {
  transactions.push({
    id: `tx-${i}`,
    categoryId: `cat-${i % 20}`,
    note: `Transaction ${i}`,
    type: i % 3 === 0 ? 'income' : 'expense'
  });
}

const searchQuery = 'Trans';
const selectedFilter = 'All';

console.time('Before');
for (let j = 0; j < 50; j++) {
  const filteredTransactions = transactions.filter(tx => {
    const category = categories.find(c => c.id === tx.categoryId);
    const matchesSearch = (tx.note || category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (selectedFilter !== 'All') {
      if (selectedFilter === 'Income') {
        matchesFilter = tx.type === 'income';
      } else {
        matchesFilter = category?.name === selectedFilter;
      }
    }
    return matchesSearch && matchesFilter;
  });
}
console.timeEnd('Before');

console.time('After');
for (let j = 0; j < 50; j++) {
  const searchLower = searchQuery.toLowerCase();
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  const filteredTransactions = transactions.filter(tx => {
    const category = categoryMap[tx.categoryId];

    let matchesFilter = true;
    if (selectedFilter !== 'All') {
      if (selectedFilter === 'Income') {
        matchesFilter = tx.type === 'income';
      } else {
        matchesFilter = category?.name === selectedFilter;
      }
    }

    if (!matchesFilter) return false;
    if (!searchLower) return true;

    return (tx.note || category?.name || '').toLowerCase().includes(searchLower);
  });
}
console.timeEnd('After');
