## 2026-06-26 - O(N^2) Array Find in React Render Loop
**Learning:** The `HomeScreen` was doing an O(N) `.find()` on the categories array for *every* transaction during the filter loop and the render loop, resulting in O(N^2) complexity. This is a common React performance bottleneck when rendering lists with relational data.
**Action:** When filtering or mapping over large arrays (like transactions) that need to look up relational data (like categories), always pre-compute an O(1) hash map (`Record<string, Category>`) using `useMemo` outside the loop.

## 2023-10-27 - Redundant O(N) filtering of immutable large arrays
**Learning:** React components often perform duplicate $O(N)$ filtering (creating new arrays via `.filter()`) across multiple `useMemo` hooks for the same data slicing (e.g., this month's expenses). This creates significant GC pressure and CPU overhead when $N$ (transactions) is large.
**Action:** Always check if a pre-existing reduced object (e.g., a dictionary/map of expenses grouped by category) can be summed in $O(C)$ time (where $C$ is the number of categories, usually < 20) to compute totals, rather than doing another $O(N)$ pass over the raw transaction array.

## 2023-10-27 - Multiple overlapping data aggregation loops
**Learning:** Components sometimes perform multiple separate iterations over the same large array to derive different sets of data (e.g., iterating transactions once for a bar chart, and again for a line chart). This scales poorly and increases unnecessary Object instantiations like `new Date()`.
**Action:** Consolidate related data aggregation loops into a single pass within a combined `useMemo` hook, destructuring the multiple required outputs. This halves the array iterations and minimizes expensive inner-loop object creations.
