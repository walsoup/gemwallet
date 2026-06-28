## 2024-05-31 - [Array Find in Render Loop Bottleneck]
**Learning:** Found an O(N*M) traversal bottleneck where `Array.prototype.find` was repeatedly used inside a filter loop to join relations (transactions to categories).
**Action:** Always pre-compute a dictionary map (O(N)) outside the loop and use early returns to avoid expensive string matching on irrelevant list items.
