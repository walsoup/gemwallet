import { useTransactionStore, selectBalanceCents } from '../useTransactionStore';

describe('useTransactionStore', () => {
  beforeEach(() => {
    useTransactionStore.getState().clearAllData();
  });

  it('initializes with default categories and empty transactions', () => {
    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(0);
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.walletMeta.hasCompletedOnboarding).toBe(false);
  });

  it('completes onboarding and sets initial balance', () => {
    const { completeOnboarding } = useTransactionStore.getState();
    completeOnboarding({ initialBalanceCents: 1000, voiceAssistantEnabled: true });

    const state = useTransactionStore.getState();
    expect(state.walletMeta.hasCompletedOnboarding).toBe(true);
    expect(state.walletMeta.voiceAssistantEnabled).toBe(true);
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].amountCents).toBe(1000);
    expect(state.transactions[0].type).toBe('income');
    expect(selectBalanceCents(state)).toBe(1000);
  });

  it('adds an expense correctly', () => {
    const { addExpense } = useTransactionStore.getState();
    addExpense({ amountCents: 550, categoryId: 'expense-food', note: 'Burger' });

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].amountCents).toBe(550);
    expect(state.transactions[0].type).toBe('expense');
    expect(state.transactions[0].note).toBe('Burger');
    expect(selectBalanceCents(state)).toBe(-550);
  });

  it('adds an income correctly', () => {
    const { addIncome } = useTransactionStore.getState();
    addIncome({ amountCents: 2000, categoryId: 'income-paycheck' });

    const state = useTransactionStore.getState();
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].type).toBe('income');
    expect(selectBalanceCents(state)).toBe(2000);
  });

  it('undos a transaction', () => {
    const { addExpense, undoTransaction } = useTransactionStore.getState();
    const tx = addExpense({ amountCents: 100, categoryId: 'expense-food' });
    
    expect(useTransactionStore.getState().transactions).toHaveLength(1);
    
    undoTransaction(tx.id);
    expect(useTransactionStore.getState().transactions).toHaveLength(0);
  });

  it('adds a custom category', () => {
    const { addCustomCategory } = useTransactionStore.getState();
    addCustomCategory({ name: 'Gaming', emoji: '🎮' });

    const state = useTransactionStore.getState();
    const custom = state.categories.find(c => c.name === 'Gaming');
    expect(custom).toBeDefined();
    expect(custom?.emoji).toBe('🎮');
  });

  it('deletes a custom category and moves transactions to misc', () => {
    const { addCustomCategory, addExpense, deleteCategory } = useTransactionStore.getState();
    addCustomCategory({ name: 'Trash', emoji: '🗑️' });
    
    const stateWithCat = useTransactionStore.getState();
    const trashCat = stateWithCat.categories.find(c => c.name === 'Trash')!;
    
    addExpense({ amountCents: 100, categoryId: trashCat.id });
    
    deleteCategory(trashCat.id);
    
    const finalState = useTransactionStore.getState();
    expect(finalState.categories.find(c => c.id === trashCat.id)).toBeUndefined();
    expect(finalState.transactions[0].categoryId).toBe('expense-misc');
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
    expect(state.transactions[0].amountCents).toBe(600);
    expect(state.transactions[0].note).toBe('New Note');
    expect(state.transactions[0].categoryId).toBe('expense-coffee');
  });

  it('handles multiple updates to the same transaction', () => {
    const { addExpense, updateTransaction } = useTransactionStore.getState();
    const tx = addExpense({ amountCents: 1000, categoryId: 'expense-food' });

    updateTransaction({ id: tx.id, amountCents: 2000 });
    updateTransaction({ id: tx.id, note: 'Double Burger' });
    updateTransaction({ id: tx.id, categoryId: 'expense-entertainment' });

    const state = useTransactionStore.getState();
    expect(state.transactions[0].amountCents).toBe(2000);
    expect(state.transactions[0].note).toBe('Double Burger');
    expect(state.transactions[0].categoryId).toBe('expense-entertainment');
  });

  it('prevents deleting system categories', () => {
    const { deleteCategory } = useTransactionStore.getState();
    const stateBefore = useTransactionStore.getState();
    
    // 'expense-misc' is a locked system category
    deleteCategory('expense-misc');
    
    const stateAfter = useTransactionStore.getState();
    expect(stateAfter.categories).toEqual(stateBefore.categories);
  });

  it('correctly calculates balance with multiple transactions', () => {
    const { addIncome, addExpense } = useTransactionStore.getState();
    addIncome({ amountCents: 5000, categoryId: 'income-paycheck' }); // +50.00
    addExpense({ amountCents: 1500, categoryId: 'expense-food' });    // -15.00
    addExpense({ amountCents: 500, categoryId: 'expense-coffee' });   // -5.00
    
    const state = useTransactionStore.getState();
    expect(selectBalanceCents(state)).toBe(3000); // 30.00
  });
});
