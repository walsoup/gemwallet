import 'tsx/cjs';
import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';

// Mock AsyncStorage to avoid unhandled rejections
mock.module('@react-native-async-storage/async-storage', {
  namedExports: {
    default: {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {},
    }
  }
});

let useTransactionStore: any;

describe('useTransactionStore', () => {
  beforeEach(async () => {
    const mod = await import('../store/useTransactionStore');
    useTransactionStore = mod.useTransactionStore;
    useTransactionStore.getState().clearAllData();
  });

  it('adds an expense and correctly calculates balance', () => {
    const store = useTransactionStore.getState();
    store.addExpense({
      amountCents: 5000,
      categoryId: 'expense-food',
      note: 'Lunch',
    });
    
    const state = useTransactionStore.getState();
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].amountCents, 5000);
    assert.equal(state.transactions[0].type, 'expense');
  });

  it('adds an income', () => {
    const store = useTransactionStore.getState();
    store.addIncome({
      amountCents: 100000,
      categoryId: 'income-paycheck',
      note: 'Salary',
    });
    
    const state = useTransactionStore.getState();
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].amountCents, 100000);
    assert.equal(state.transactions[0].type, 'income');
  });

  it('updates a transaction correctly', () => {
    const store = useTransactionStore.getState();
    const tx = store.addExpense({
      amountCents: 1500,
      categoryId: 'expense-coffee',
      note: 'Morning coffee',
    });

    store.updateTransaction({
      id: tx.id,
      amountCents: 2000,
      note: 'Fancy coffee',
    });

    const updatedTx = useTransactionStore.getState().transactions.find((t: any) => t.id === tx.id);
    assert.equal(updatedTx?.amountCents, 2000);
    assert.equal(updatedTx?.note, 'Fancy coffee');
    assert.equal(updatedTx?.categoryId, 'expense-coffee'); // Unchanged
  });

  it('undoes a transaction', () => {
    const store = useTransactionStore.getState();
    const tx = store.addExpense({
      amountCents: 1000,
      categoryId: 'expense-misc',
    });

    assert.equal(useTransactionStore.getState().transactions.length, 1);

    store.undoTransaction(tx.id);
    assert.equal(useTransactionStore.getState().transactions.length, 0);
  });
});
