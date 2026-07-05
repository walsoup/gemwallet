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
