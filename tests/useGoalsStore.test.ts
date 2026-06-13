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

let useGoalsStore: any;

describe('useGoalsStore', () => {
  beforeEach(async () => {
    const mod = await import('../store/useGoalsStore');
    useGoalsStore = mod.useGoalsStore;
    useGoalsStore.getState().clearAllData();
  });

  it('adds a goal properly', () => {
    const store = useGoalsStore.getState();
    store.addGoal({ name: 'Vacation', targetCents: 500000 });
    
    const state = useGoalsStore.getState();
    assert.equal(state.goals.length, 1);
    assert.equal(state.goals[0].name, 'Vacation');
    assert.equal(state.goals[0].targetCents, 500000);
    assert.equal(state.goals[0].savedCents, 0);
  });

  it('contributes to a goal and completes it', () => {
    const store = useGoalsStore.getState();
    store.addGoal({ name: 'Laptop', targetCents: 150000 });
    const goalId = useGoalsStore.getState().goals[0].id;

    store.contributeToGoal(goalId, 100000);
    let goal = useGoalsStore.getState().goals[0];
    assert.equal(goal.savedCents, 100000);
    assert.equal(goal.completed, false);

    store.contributeToGoal(goalId, 60000); // 160k total, target 150k
    goal = useGoalsStore.getState().goals[0];
    assert.equal(goal.savedCents, 150000); // Caps at target
    assert.equal(goal.completed, true);
  });

  it('deletes a goal', () => {
    const store = useGoalsStore.getState();
    store.addGoal({ name: 'To delete', targetCents: 10000 });
    const goalId = useGoalsStore.getState().goals[0].id;

    store.deleteGoal(goalId);
    assert.equal(useGoalsStore.getState().goals.length, 0);
  });
});
