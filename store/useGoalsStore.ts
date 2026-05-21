import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Goal } from '../types/finance';
import { generateId } from '../utils/generateId';

type GoalState = {
  goals: Goal[];
  goalsEnabled: boolean;
  addGoal: (params: { name: string; targetCents: number; dueDate?: number }) => void;
  contributeToGoal: (goalId: string, amountCents: number, note?: string) => Goal | undefined;
  toggleGoal: (goalId: string, enabled: boolean) => void;
  deleteGoal: (goalId: string) => void;
  setGoalsEnabled: (enabled: boolean) => void;
  clearAllData: () => void;
  hydrateFromBackup: (data: { goals: Goal[]; goalsEnabled: boolean }) => void;
};

function normalizeGoal(raw: Goal): Goal {
  const targetCents = Math.max(1, Number.isFinite(raw.targetCents) ? Math.round(raw.targetCents) : 1);
  const savedCents = Math.min(
    targetCents,
    Math.max(0, Number.isFinite(raw.savedCents) ? Math.round(raw.savedCents) : 0)
  );
  return {
    ...raw,
    targetCents,
    savedCents,
    completed: savedCents >= targetCents,
  };
}

function normalizeGoals(rawGoals: unknown): Goal[] {
  if (!Array.isArray(rawGoals)) return [];
  return rawGoals
    .filter((goal): goal is Goal => !!goal && typeof goal === 'object')
    .map((goal) => normalizeGoal(goal));
}

export const useGoalsStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      goalsEnabled: false,
      addGoal: ({ name, targetCents, dueDate }) => {
        const cleaned = name.trim().slice(0, 32);
        const normalizedTarget = Math.round(targetCents);
        if (!cleaned || !Number.isFinite(normalizedTarget) || normalizedTarget <= 0) return;

        const goal: Goal = {
          id: `goal-${generateId()}`,
          name: cleaned,
          targetCents: Math.max(1, normalizedTarget),
          savedCents: 0,
          dueDate,
          createdAt: Date.now(),
          completed: false,
          enabled: true,
        };

        set((state) => ({ goals: [goal, ...state.goals] }));
      },
      contributeToGoal: (goalId, amountCents) => {
        const normalizedAmount = Math.round(amountCents);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return undefined;
        let updated: Goal | undefined;
        set((state) => {
          const goals = state.goals.map((goal) => {
            if (goal.id !== goalId) return goal;
            const savedCents = Math.min(goal.targetCents, goal.savedCents + normalizedAmount);
            updated = { ...goal, savedCents, completed: savedCents >= goal.targetCents };
            return updated;
          });
          return { goals };
        });
        return updated;
      },
      toggleGoal: (goalId, enabled) =>
        set((state) => ({
          goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, enabled } : goal)),
        })),
      deleteGoal: (goalId) => set((state) => ({ goals: state.goals.filter((goal) => goal.id !== goalId) })),
      setGoalsEnabled: (enabled) => set({ goalsEnabled: enabled }),
      clearAllData: () => set({ goals: [], goalsEnabled: false }),
      hydrateFromBackup: ({ goals, goalsEnabled }) =>
        set({ goals: normalizeGoals(goals), goalsEnabled: !!goalsEnabled }),
    }),
    {
      name: 'gemwallet-goals-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return { goals: [], goalsEnabled: false };
        }
        const state = persistedState as Partial<GoalState>;
        return {
          ...state,
          goals: normalizeGoals(state.goals),
          goalsEnabled: !!state.goalsEnabled,
        };
      },
    }
  )
);
