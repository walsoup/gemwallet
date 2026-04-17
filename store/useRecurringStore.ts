import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { RecurringCashEvent, RecurringInterval, TransactionType } from '../types/finance';
import { generateId } from '../utils/generateId';

type RecurringState = {
  events: RecurringCashEvent[];
  recurringEnabled: boolean;
  addEvent: (params: {
    name: string;
    amountCents: number;
    type: TransactionType;
    categoryId: string;
    interval: RecurringInterval;
    startDate?: number;
  }) => void;
  deleteEvent: (id: string) => void;
  toggleEvent: (id: string, enabled: boolean) => void;
  applyDueEvents: (now: number, apply: (event: RecurringCashEvent) => void) => void;
  runEventNow: (id: string, apply: (event: RecurringCashEvent) => void, now: number) => void;
  setRecurringEnabled: (enabled: boolean) => void;
};

function addInterval(base: number, interval: RecurringInterval) {
  const date = new Date(base);
  if (interval === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.getTime();
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set, get) => ({
      events: [],
      recurringEnabled: false,
      addEvent: ({ name, amountCents, type, categoryId, interval, startDate }) => {
        const cleaned = name.trim().slice(0, 40);
        if (!cleaned || amountCents <= 0) return;
        const nextRun = startDate ?? Date.now();
        const event: RecurringCashEvent = {
          id: `recurring-${generateId()}`,
          name: cleaned,
          amountCents: Math.max(1, Math.round(amountCents)),
          type,
          categoryId,
          interval,
          nextRun,
          enabled: true,
        };
        set((state) => ({ events: [event, ...state.events] }));
      },
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((event) => event.id !== id) })),
      toggleEvent: (id, enabled) =>
        set((state) => ({
          events: state.events.map((event) => (event.id === id ? { ...event, enabled } : event)),
        })),
      applyDueEvents: (now, apply) => {
        set((state) => {
          const events = state.events.map((event) => {
            if (!state.recurringEnabled || !event.enabled || event.nextRun > now) return event;
            apply(event);
            return { ...event, nextRun: addInterval(event.nextRun, event.interval) };
          });
          return { events };
        });
      },
      runEventNow: (id, apply, now) => {
        set((state) => {
          const events = state.events.map((event) => {
            if (event.id !== id) return event;
            apply(event);
            return { ...event, nextRun: addInterval(now, event.interval) };
          });
          return { events };
        });
      },
      setRecurringEnabled: (enabled) => set({ recurringEnabled: enabled }),
    }),
    {
      name: 'gemwallet-recurring-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
