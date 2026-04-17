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
  hydrateFromBackup: (data: { goals: Goal[]; goalsEnabled: boolean }) => void;
};

export const useGoalsStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      goalsEnabled: false,
      addGoal: ({ name, targetCents, dueDate }) => {
        const cleaned = name.trim().slice(0, 32);
        if (!cleaned || targetCents <= 0) return;

        const goal: Goal = {
          id: `goal-${generateId()}`,
          name: cleaned,
          targetCents: Math.max(1, Math.round(targetCents)),
          savedCents: 0,
          dueDate,
          createdAt: Date.now(),
          completed: false,
          enabled: true,
        };

        set((state) => ({ goals: [goal, ...state.goals] }));
      },
      contributeToGoal: (goalId, amountCents) => {
        if (amountCents <= 0) return undefined;
        let updated: Goal | undefined;
        set((state) => {
          const goals = state.goals.map((goal) => {
            if (goal.id !== goalId) return goal;
            const savedCents = Math.min(goal.targetCents, goal.savedCents + Math.round(amountCents));
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
      hydrateFromBackup: ({ goals, goalsEnabled }) => set({ goals: goals ?? [], goalsEnabled: !!goalsEnabled }),
    }),
    {
      name: 'gemwallet-goals-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
