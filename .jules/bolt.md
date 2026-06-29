## 2024-03-24 - Avoiding Array.find in nested loops
**Learning:** Found an O(N*M) performance bottleneck in React Native render cycle where `categories.find` was being used inside a transaction loop and map, causing exponential operations. This can be significantly optimized for large datasets in mobile platforms.
**Action:** Always create a hash map / record (e.g., using `reduce` + `useMemo`) for relational data lookups (O(1)) instead of searching arrays (O(M)) when iterating over a large dataset.
