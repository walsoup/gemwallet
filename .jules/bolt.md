## 2026-06-26 - O(N^2) Array Find in React Render Loop
**Learning:** The `HomeScreen` was doing an O(N) `.find()` on the categories array for *every* transaction during the filter loop and the render loop, resulting in O(N^2) complexity. This is a common React performance bottleneck when rendering lists with relational data.
**Action:** When filtering or mapping over large arrays (like transactions) that need to look up relational data (like categories), always pre-compute an O(1) hash map (`Record<string, Category>`) using `useMemo` outside the loop.

## 2023-10-27 - Redundant O(N) filtering of immutable large arrays
**Learning:** React components often perform duplicate $O(N)$ filtering (creating new arrays via `.filter()`) across multiple `useMemo` hooks for the same data slicing (e.g., this month's expenses). This creates significant GC pressure and CPU overhead when $N$ (transactions) is large.
**Action:** Always check if a pre-existing reduced object (e.g., a dictionary/map of expenses grouped by category) can be summed in $O(C)$ time (where $C$ is the number of categories, usually < 20) to compute totals, rather than doing another $O(N)$ pass over the raw transaction array.

## 2024-07-04 - Eliminate Redundant O(N) Array Sweeps for the Same Dataset Slice
**Learning:** Found an instance in `AnalyticsScreen.tsx` where `transactions` (an array which scales infinitely as the app usage grows) was being iterated through entirely in separate `useMemo` hooks (once for `monthlyBarData` and once for `lineChartData`) to extract the same 6-month subset.
**Action:** Always identify when multiple component states need the exact same derived array slice. Compute it once in an upstream `useMemo` (e.g. `lineChartData`), and have downstream hooks (e.g. `monthlyBarData`) map over the much smaller derived output ($O(C)$) instead of looping through the raw $O(N)$ data again.

## 2025-07-05 - Optimize Relational Data Grouping with single-pass in useMemo
**Learning:** In React Native applications using global state stores (like Zustand), large immutable arrays (e.g., \`transactions\`) shouldn't be iterated over multiple times using separate \`.forEach()\` loops inside different \`useMemo\` hooks to calculate related metrics. Doing so results in redundant O(N) operations, which causes significant performance degradation as the array grows, leading to unoptimized UI rendering.
**Action:** Always aim to compute all related statistics and dictionaries (like category totals and counts) in a single O(N) pass inside a single \`useMemo\` hook. Use this pre-computed data to derive necessary components in subsequent \`useMemo\` hooks with O(C) complexity, reducing overhead and improving re-render speeds.

## 2024-07-06 - Optimize Array Accumulation by Combining Multiple Reducers
**Learning:** `gemmaAnalysis.ts` performed two consecutive `.filter().reduce()` chains over the entire `transactions` array to calculate `expenseTotal` and `incomeTotal` separately. This redundant array iteration causes an unnecessary performance hit, especially as transaction history grows, creating intermediate array instances.
**Action:** Consolidate multiple iterative array scans into a single standard loop or a single `reduce()` operation over an object to simultaneously compute multiple aggregates, achieving an O(N) single-pass iteration with zero intermediate array allocation overhead.

## 2025-07-06 - Avoid O(N) Array Finding with Fixed Indices
**Learning:** When calculating data over a fixed sliding window (like 6 months) using an array loop ( ), mapping dynamic transaction dates back to the sequential window can be costly as history grows.
**Action:** Use an  dictionary mapping keys (e.g. `YYYY-MM`) to array indices for immediate lookup and add early-return filters () to skip processing older entries completely and avoid `new Date` instantiation overhead.

## 2025-07-06 - Avoid O(N) Array Finding with Fixed Indices
**Learning:** When calculating data over a fixed sliding window (like 6 months) using an array loop (`O(N)` `.find()`), mapping dynamic transaction dates back to the sequential window can be costly as history grows.
**Action:** Use an `O(1)` dictionary mapping keys (e.g. `YYYY-MM`) to array indices for immediate lookup and add early-return filters (`timestamp < earliestBound`) to skip processing older entries completely and avoid `new Date` instantiation overhead.

## 2025-07-06 - Avoid .filter().reduce() chaining on large arrays
**Learning:** Chaining `.filter().reduce()` on large immutable arrays (like `transactions` store items) causes a new, temporary intermediate array to be allocated and garbage-collected just for the reduction step. This increases memory churn and impacts performance as data grows.
**Action:** Instead of chaining `.filter().reduce()`, perform a single-pass O(N) `.reduce()` with conditional logic inside it to eliminate the intermediate array allocation entirely.
## 2024-07-24 - HomeScreen O(N) Chained Array Methods Optimization
**Learning:** React components that render truncated lists (e.g., top 10 recent transactions) can suffer severe memory and CPU bloat if they use `.filter().slice(0, 10)` on unbounded state arrays. It creates massive intermediate arrays just to discard 99% of them. However, optimizing this requires care: if the component relies on `filteredTransactions.length` elsewhere (e.g., for an empty state check or "Load More" badge), the early exit loop will break that logic since it masks the true total length of matching items.
**Action:** Replace `array.filter(condition).slice(0, N)` with an early-exit `for...of` loop (e.g., `if (results.length >= N) break;`) for an O(1) performance boost, but *always* verify the array's `.length` property isn't being used downstream for conditional UI rendering.
