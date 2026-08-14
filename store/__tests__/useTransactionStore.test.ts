import 'tsx/cjs';
import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';

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
let selectBalanceCents: any;

describe('useTransactionStore', () => {
  beforeEach(async () => {
    const mod = await import('../useTransactionStore');
    useTransactionStore = mod.useTransactionStore;
    selectBalanceCents = mod.selectBalanceCents;
    useTransactionStore.getState().clearAllData();
  });

  it('initializes with default categories and empty transactions', () => {
    const state = useTransactionStore.getState();
    assert.equal(state.transactions.length, 0);
    assert.ok(state.categories.length > 0);
    assert.equal(state.walletMeta.hasCompletedOnboarding, false);
  });

  it('completes onboarding and sets initial balance', () => {
    const { completeOnboarding } = useTransactionStore.getState();
    completeOnboarding({ initialBalanceCents: 1000, voiceAssistantEnabled: true });

    const state = useTransactionStore.getState();
    assert.equal(state.walletMeta.hasCompletedOnboarding, true);
    assert.equal(state.walletMeta.voiceAssistantEnabled, true);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].amountCents, 1000);
    assert.equal(state.transactions[0].type, 'income');
    assert.equal(selectBalanceCents(state), 1000);
  });

  it('adds an expense correctly', () => {
    const { addExpense } = useTransactionStore.getState();
    addExpense({ amountCents: 550, categoryId: 'expense-food', note: 'Burger' });

    const state = useTransactionStore.getState();
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].amountCents, 550);
    assert.equal(state.transactions[0].type, 'expense');
    assert.equal(state.transactions[0].note, 'Burger');
    assert.equal(selectBalanceCents(state), -550);
  });

  it('adds an income correctly', () => {
    const { addIncome } = useTransactionStore.getState();
    addIncome({ amountCents: 2000, categoryId: 'income-paycheck' });

    const state = useTransactionStore.getState();
    assert.equal(state.transactions.length, 1);
    assert.equal(state.transactions[0].type, 'income');
    assert.equal(selectBalanceCents(state), 2000);
  });

  it('undos a transaction', () => {
    const { addExpense, undoTransaction } = useTransactionStore.getState();
    const tx = addExpense({ amountCents: 100, categoryId: 'expense-food' });
    
    assert.equal(useTransactionStore.getState().transactions.length, 1);
    
    undoTransaction(tx.id);
    assert.equal(useTransactionStore.getState().transactions.length, 0);
  });

  it('adds a custom category', () => {
    const { addCustomCategory } = useTransactionStore.getState();
    addCustomCategory({ name: 'Gaming', emoji: '🎮' });

    const state = useTransactionStore.getState();
    const custom = state.categories.find((c: any) => c.name === 'Gaming');
    assert.ok(custom);
    assert.equal(custom?.emoji, '🎮');
  });

  it('deletes a custom category and moves transactions to misc', () => {
    const { addCustomCategory, addExpense, deleteCategory } = useTransactionStore.getState();
    addCustomCategory({ name: 'Trash', emoji: '🗑️' });
    
    const stateWithCat = useTransactionStore.getState();
    const trashCat = stateWithCat.categories.find((c: any) => c.name === 'Trash')!;
    
    addExpense({ amountCents: 100, categoryId: trashCat.id });
    
    deleteCategory(trashCat.id);
    
    const finalState = useTransactionStore.getState();
    assert.equal(finalState.categories.find((c: any) => c.id === trashCat.id), undefined);
    assert.equal(finalState.transactions[0].categoryId, 'expense-misc');
  });

  it('updates a transaction correctly', () => {
    const { addExpense, updateTransaction } = useTransactionStore.getState();
    const tx = addExpense({ amountCents: 500, categoryId: 'expense-food', note: 'Old Note' });

    updateTransaction({
      id: tx.id,
      amountCents: 600,
      note: 'New Note',
      categoryId: 'expense-coffee',
    });

    const state = useTransactionStore.getState();
    assert.equal(state.transactions[0].amountCents, 600);
    assert.equal(state.transactions[0].note, 'New Note');
    assert.equal(state.transactions[0].categoryId, 'expense-coffee');
  });

  it('handles multiple updates to the same transaction', () => {
    const { addExpense, updateTransaction } = useTransactionStore.getState();
    const tx = addExpense({ amountCents: 1000, categoryId: 'expense-food' });

    updateTransaction({ id: tx.id, amountCents: 2000 });
    updateTransaction({ id: tx.id, note: 'Double Burger' });
    updateTransaction({ id: tx.id, categoryId: 'expense-entertainment' });

    const state = useTransactionStore.getState();
    assert.equal(state.transactions[0].amountCents, 2000);
    assert.equal(state.transactions[0].note, 'Double Burger');
    assert.equal(state.transactions[0].categoryId, 'expense-entertainment');
  });

  it('prevents deleting system categories', () => {
    const { deleteCategory } = useTransactionStore.getState();
    const stateBefore = useTransactionStore.getState();
    
    // 'expense-misc' is a locked system category
    deleteCategory('expense-misc');
    
    const stateAfter = useTransactionStore.getState();
    assert.deepEqual(stateAfter.categories, stateBefore.categories);
  });

  it('correctly calculates balance with multiple transactions', () => {
    const { addIncome, addExpense } = useTransactionStore.getState();
    addIncome({ amountCents: 5000, categoryId: 'income-paycheck' }); // +50.00
    addExpense({ amountCents: 1500, categoryId: 'expense-food' });    // -15.00
    addExpense({ amountCents: 500, categoryId: 'expense-coffee' });   // -5.00
    
    const state = useTransactionStore.getState();
    assert.equal(selectBalanceCents(state), 3000); // 30.00
  });
});
