"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { useFinanceStore } from "@/lib/store/useFinanceStore";
import type { Category, Transaction } from "@/lib/types";

type Tab = "dashboard" | "subscriptions";

const categories: Category[] = [
  "Food",
  "Groceries",
  "Transport",
  "Utilities",
  "Lifestyle",
  "Subscription",
];

function currency(value: number) {
  return new Intl.NumberFormat("en-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function waveformPath(progress: number) {
  const width = 320;
  const height = 72;
  const baseline = 44;
  const amplitude = 14;
  const points = Array.from({ length: 10 }, (_, i) => {
    const x = (width / 9) * i;
    const waveOffset = Math.sin(i * 0.8) * amplitude;
    const y = baseline - waveOffset - progress * 8;
    return `${x},${Math.max(12, Math.min(height - 8, y))}`;
  });

  return `M${points[0]} C ${points.slice(1).join(" ")}`;
}

function subscriptionTone(amount: number) {
  if (amount >= 180) return "bg-rose-500/20 text-rose-100 ring-rose-400/70";
  if (amount >= 90) return "bg-amber-400/20 text-amber-100 ring-amber-400/70";
  return "bg-emerald-500/20 text-emerald-100 ring-emerald-400/70";
}

function expressiveSpring(duration = 0.5) {
  return {
    type: "spring" as const,
    stiffness: 380,
    damping: 24,
    mass: 0.8,
    duration,
  };
}

export function FinanceApp() {
  const { monthlyBudget, transactions, addExpense, hydrated } = useFinanceStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [monthly, setMonthly] = useState(false);

  const totalSpent = useMemo(
    () => transactions.reduce((sum, item) => sum + item.amount, 0),
    [transactions],
  );

  const progress = Math.min(totalSpent / monthlyBudget, 1.5);

  const subscriptions = useMemo(
    () =>
      transactions
        .filter((t) => t.recurring === "monthly" || t.category === "Subscription")
        .sort((a, b) => b.amount - a.amount),
    [transactions],
  );

  const submitQuickAdd = () => {
    const parsedAmount = Number(amount);

    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    addExpense({
      title: title.trim(),
      amount: parsedAmount,
      category,
      recurring: monthly ? "monthly" : undefined,
    });

    setTitle("");
    setAmount("");
    setCategory("Food");
    setMonthly(false);
    setOpen(false);
  };

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-[var(--m3-surface)] px-4 text-[var(--m3-on-surface)]">
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2 }}
          className="text-sm tracking-[0.28em]"
        >
          LOADING YOUR CHAOS...
        </motion.p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[var(--m3-surface)] text-[var(--m3-on-surface)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[color:var(--m3-surface-container)]/95 px-4 pb-3 pt-safe backdrop-blur">
        <div className="flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--m3-on-surface-variant)]">
              GemWallet Audit Deck
            </p>
            <h1 className="font-editorial text-3xl leading-none tracking-[-0.02em]">
              Money Moodboard
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.94, borderRadius: "44%" }}
            transition={expressiveSpring()}
            className="rounded-[34%] bg-[var(--m3-secondary-container)] px-3 py-2 text-xs font-semibold text-[var(--m3-on-secondary-container)]"
          >
            April
          </motion.button>
        </div>
      </header>

      <section className="space-y-4 px-4 pb-28 pt-4">
        {tab === "dashboard" ? (
          <>
            <motion.article
              whileTap={{ scale: 0.98, borderRadius: "18%" }}
              transition={expressiveSpring()}
              className="rounded-[28px] bg-[var(--m3-primary-container)] p-4 text-[var(--m3-on-primary-container)] shadow-[0_20px_40px_-20px_var(--m3-primary)]"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                    Adaptive Budget Wave
                  </p>
                  <h2 className="font-editorial text-2xl">{currency(totalSpent)} spent</h2>
                </div>
                <p className="text-sm">of {currency(monthlyBudget)}</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-[22px] bg-black/10 p-3">
                <svg viewBox="0 0 320 72" className="h-[72px] w-full">
                  <motion.path
                    d={waveformPath(progress)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ d: waveformPath(progress) }}
                    transition={expressiveSpring(0.7)}
                  />
                </svg>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] opacity-80">
                  {Math.round(progress * 100)}% pressure index
                </p>
              </div>
            </motion.article>

            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.24em] text-[var(--m3-on-surface-variant)]">
                Latest swipes
              </h3>
              {transactions.slice(0, 8).map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </section>
          </>
        ) : (
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.24em] text-[var(--m3-on-surface-variant)]">
              Subscription graveyard
            </h3>
            {subscriptions.map((sub) => (
              <motion.article
                key={sub.id}
                whileTap={{ scale: 0.98, borderRadius: "30%" }}
                transition={expressiveSpring()}
                className={`rounded-[24px] px-4 py-3 ring-1 ${subscriptionTone(sub.amount)}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">{sub.title}</h4>
                    <p className="text-xs opacity-80">Renews monthly</p>
                  </div>
                  <p className="font-editorial text-xl">{currency(sub.amount)}</p>
                </div>
              </motion.article>
            ))}
            {!subscriptions.length ? (
              <p className="rounded-[24px] border border-dashed border-white/25 p-4 text-sm text-[var(--m3-on-surface-variant)]">
                No subscriptions found. Either disciplined, or hiding receipts.
              </p>
            ) : null}
          </section>
        )}
      </section>

      <motion.button
        whileTap={{ scale: 0.94, borderRadius: "40%" }}
        transition={expressiveSpring()}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-[34%] bg-[var(--m3-tertiary)] text-3xl text-[var(--m3-on-tertiary)] shadow-[0_20px_30px_-12px_var(--m3-tertiary)]"
        aria-label="Quick add expense"
      >
        +
      </motion.button>

      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-around rounded-t-[24px] border-t border-white/10 bg-[var(--m3-surface-container)] px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <SplitButton
          label="Dashboard"
          active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
        />
        <SplitButton
          label="Graveyard"
          active={tab === "subscriptions"}
          onClick={() => setTab("subscriptions")}
        />
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 60, borderRadius: "35%" }}
              animate={{ y: 0, borderRadius: "0%" }}
              exit={{ y: 60, opacity: 0 }}
              transition={expressiveSpring(0.75)}
              className="flex h-full flex-col bg-[var(--m3-surface)] px-4 pb-8 pt-safe"
            >
              <div className="flex items-center justify-between py-4">
                <h3 className="font-editorial text-2xl">Quick Add</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-[var(--m3-surface-container-high)] px-3 py-2 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[var(--m3-on-surface-variant)]">What did you buy?</span>
                  <input
                    className="w-full rounded-[20px] bg-[var(--m3-surface-container-high)] px-4 py-3 outline-none ring-[1.5px] ring-transparent transition focus:ring-[var(--m3-primary)]"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Late-night snack stampede"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-[var(--m3-on-surface-variant)]">Amount (MAD)</span>
                  <input
                    inputMode="decimal"
                    className="w-full rounded-[20px] bg-[var(--m3-surface-container-high)] px-4 py-3 outline-none ring-[1.5px] ring-transparent transition focus:ring-[var(--m3-primary)]"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-[var(--m3-on-surface-variant)]">Category</span>
                  <select
                    className="w-full rounded-[20px] bg-[var(--m3-surface-container-high)] px-4 py-3 outline-none ring-[1.5px] ring-transparent transition focus:ring-[var(--m3-primary)]"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-[20px] bg-[var(--m3-surface-container-high)] px-4 py-3 text-sm">
                  <span>Mark as monthly recurring</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--m3-primary)]"
                    checked={monthly}
                    onChange={(e) => setMonthly(e.target.checked)}
                  />
                </label>
              </div>

              <div className="mt-auto flex gap-3 pt-6">
                <motion.button
                  whileTap={{ scale: 0.95, borderRadius: "35%" }}
                  transition={expressiveSpring()}
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-[24px] bg-[var(--m3-surface-container-high)] px-4 py-3"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95, borderRadius: "35%" }}
                  transition={expressiveSpring()}
                  onClick={submitQuickAdd}
                  className="flex-1 rounded-[24px] bg-[var(--m3-primary)] px-4 py-3 font-semibold text-[var(--m3-on-primary)]"
                >
                  Add expense
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function SplitButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95, borderRadius: "34%" }}
      transition={expressiveSpring()}
      className={`min-w-[140px] rounded-[20px] px-4 py-3 text-sm font-medium transition ${
        active
          ? "bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]"
          : "bg-transparent text-[var(--m3-on-surface-variant)]"
      }`}
    >
      {label}
    </motion.button>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <motion.article
      whileTap={{ scale: 0.985, borderRadius: "28%" }}
      transition={expressiveSpring()}
      className="rounded-[24px] bg-[var(--m3-surface-container-high)] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{transaction.title}</h4>
          <p className="text-xs uppercase tracking-[0.13em] text-[var(--m3-on-surface-variant)]">
            {transaction.category} · {transaction.date}
          </p>
        </div>
        <p className="font-editorial text-xl">-{currency(transaction.amount)}</p>
      </div>
    </motion.article>
  );
}
