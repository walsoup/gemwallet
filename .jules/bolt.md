## 2026-06-26 - O(N^2) Array Find in React Render Loop
**Learning:** The `HomeScreen` was doing an O(N) `.find()` on the categories array for *every* transaction during the filter loop and the render loop, resulting in O(N^2) complexity. This is a common React performance bottleneck when rendering lists with relational data.
**Action:** When filtering or mapping over large arrays (like transactions) that need to look up relational data (like categories), always pre-compute an O(1) hash map (`Record<string, Category>`) using `useMemo` outside the loop.
