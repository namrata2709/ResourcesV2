---
type: dsa
title: Linear Search
slug: linear-search
topic_number: 17
date: 2026-06-27
date_modified:
keywords: [linear search, sequential search, array traversal, unsorted search, brute force search, linear scan]
tags: [searching, arrays, beginner, brute-force]
prerequisites: []
when_to_use: Use when the input array or list is unsorted and you need to find a value, count occurrences, or confirm existence; also use when the dataset is small enough that O(n) is acceptable and avoiding a sort is preferable.
comparison_topic: Binary Search
lc_tag_url: https://leetcode.com/tag/array/
cp_algorithms_url: null
cses_section: null
animation_name: linear-search-animation
---

<collapsible-section o>
## Introduction {#introduction}

Imagine you come home and can't find your keys. You don't know where they are, so you check the kitchen counter, then the entryway table, then your jacket pocket — one spot at a time, left to right, until you find them or run out of places to look. That, in its entirety, is linear search.

==Linear search (also called sequential search) scans a list from the first element to the last, comparing each element to the target and stopping the moment a match is found.== It makes no assumptions about order — the list can be scrambled in any way — and it is the most universally applicable search strategy precisely because it needs nothing from the data except the ability to read one element at a time.

Formally: given a sequence of `n` elements and a target value `t`, linear search visits indices `0, 1, 2, …` in order, returning the index of the first element equal to `t`, or `-1` (or a sentinel indicating absence) if `t` does not appear.

</collapsible-section>

<collapsible-section o>
## How It Works {#how-it-works}

The algorithm has exactly one decision at each step: does the current element match the target? If yes, return the index. If no, move to the next. When the end of the list is reached without a match, report failure.

```
procedure linearSearch(arr, target):
    for i from 0 to len(arr) - 1:
        if arr[i] == target:
            return i
    return -1
```

That is the entire algorithm. There is no preprocessing step, no auxiliary structure to build, and no requirement for the data to be sorted. This simplicity is both its greatest strength and its main limitation.

[important]
The key invariant: after checking index `i`, every element at indices `0` through `i` has been ruled out. The unseen suffix `arr[i+1…n-1]` is the remaining search space, and it shrinks by exactly one element per iteration.
[/important]

A concrete trace on `arr = [4, 2, 7, 1, 9, 3]`, searching for `target = 9`:

- Index 0: `4 ≠ 9` → continue
- Index 1: `2 ≠ 9` → continue
- Index 2: `7 ≠ 9` → continue
- Index 3: `1 ≠ 9` → continue
- Index 4: `9 == 9` → **return 4**

Five comparisons to find an element near the end of a six-element array — exactly what you'd expect from a left-to-right scan.

[image:inline-01-trace-example.png|Linear search step-by-step on [4,2,7,1,9,3] searching for 9 — each cell is highlighted as it is compared, with the match highlighted in green at index 4]

</collapsible-section>

<collapsible-section>
## Variants and Extensions {#variants-and-extensions}

### Find All Occurrences {#find-all-occurrences}

The standard algorithm returns on the *first* match. To collect *all* indices where the target appears, replace the early return with an append:

```
procedure findAll(arr, target):
    results = []
    for i from 0 to len(arr) - 1:
        if arr[i] == target:
            results.append(i)
    return results      # empty list means not found
```

This always runs in O(n) regardless of whether the element appears once, many times, or not at all.

### Sentinel Linear Search {#sentinel-linear-search}

Every iteration performs two comparisons: the bounds check (`i < n`) and the equality check (`arr[i] == target`). By placing the target at position `n` before the loop, the bounds check becomes unnecessary — the sentinel guarantees the loop always terminates.

```
procedure sentinelSearch(arr, target):
    n = len(arr)
    last = arr[n - 1]
    arr[n - 1] = target          # place sentinel
    i = 0
    while arr[i] != target:
        i += 1
    arr[n - 1] = last            # restore
    if i < n - 1 or arr[n - 1] == target:
        return i
    return -1
```

==The sentinel trick halves the number of comparisons per iteration, giving a constant-factor speedup while keeping O(n) asymptotic complexity.== It is most relevant in C/C++ inner loops where the branch predictor cost of the bounds check is measurable.

### Searching on Linked Lists {#searching-on-linked-lists}

Linear search on a singly-linked list is identical in spirit — traverse node by node, compare, stop on match — but random access is unavailable, so binary search is impossible regardless of whether the list is sorted. This makes linear search the *only* general search option for linked structures.

[note]
**Move-to-front heuristic:** if the same elements are searched repeatedly and some are much more popular than others, move each found element to the front of the list after finding it. Over time, the most-queried items cluster at the head and average search time drops — at the cost of altering the original order.
[/note]

</collapsible-section>

<collapsible-section>
## Complexity Analysis {#complexity-analysis}

| Case    | Time | Space | Why |
|---------|------|-------|-----|
| Best    | O(1) | O(1)  | Target is at index 0; found on the first comparison |
| Average | O(n) | O(1)  | Expected position of target is n/2 when uniformly distributed |
| Worst   | O(n) | O(1)  | Target is at the last index, or absent entirely — all n elements checked |

Space is O(1) because the algorithm uses only a loop counter and a comparand — no extra memory grows with input size.

[warning]
It is tempting to say "average case is O(n/2) = O(n)" and leave it at that. The important insight is *why* the average is n/2: each element is equally likely to be the target, so the expected number of comparisons is `(1 + 2 + … + n) / n = (n+1)/2`. When the element is absent, the count is exactly `n`. Both collapse to Θ(n) — the constant vanishes in big-O notation.
[/warning]

</collapsible-section>

<collapsible-section>
## Linear Search vs Binary Search {#comparison}

| Feature | Linear Search | Binary Search |
|---|---|---|
| Input requirement | Any order | Must be sorted |
| Time complexity (worst) | O(n) | O(log n) |
| Time complexity (best) | O(1) | O(1) |
| Space complexity | O(1) | O(1) iterative, O(log n) recursive |
| Small n performance | Competitive or faster (low overhead) | Slight overhead from midpoint math |
| Works on linked lists | Yes | No (no random access) |
| Works on streams | Yes | No (needs indexed access) |
| Preprocessing cost | None | O(n log n) to sort if unsorted |
| Implementation complexity | Trivial | Moderate (off-by-one errors are common) |

The crossover point — where binary search starts winning despite the sort cost — depends on how many times you search the same dataset. If you search once, linear search is usually better because sorting costs O(n log n) but one linear scan costs O(n). If you search k times, the total cost is O(n + k log n) with sorting versus O(kn) without; binary search wins when `k > n / log n`.

</collapsible-section>

<collapsible-section>
## Common Mistakes {#common-mistakes}

- **Returning the value instead of the index.** Most problems ask where the element is, not what it equals. Returning `arr[i]` instead of `i` is a silent bug that passes many tests by coincidence.
- **Off-by-one at the boundary.** Using `i < n - 1` instead of `i < n` misses the last element. Using `i <= n` causes an index-out-of-bounds on the extra iteration.
- **Assuming the first result is unique.** If the problem asks for the *last* occurrence or *all* occurrences, returning on the first match produces a wrong answer that is easy to overlook in testing.
- **Forgetting to handle the not-found case.** Falling through the loop without returning `-1` (or `None`) leaves the caller with an undefined or garbage value. Always have an explicit sentinel return after the loop.
- **Using linear search on a sorted array when n is large.** If the interviewer tells you the array is sorted and n can be 10⁶, they expect binary search. Defaulting to a loop signals unawareness of the sorted property.
- **Mutating input in sentinel search without restoring.** The sentinel trick places the target at `arr[n-1]` temporarily; forgetting to restore the original last element corrupts the caller's data.

</collapsible-section>

<collapsible-section o>
## Visualisation {#visualisation}

[image:step-01-initial.png|Step 1: Initial state — array [3, 7, 1, 9, 4, 6, 2, 8] with search pointer at index 0, target = 4]
[image:step-02-scanning.png|Step 2: Pointer advances — elements 3, 7, 1 eliminated (greyed), pointer now at index 3 (value 9)]
[image:step-03-match.png|Step 3: Match found — pointer reaches index 4 (value 4), cell highlighted green]
[image:step-04-not-found.png|Step 4: Not-found scenario — same array, target = 5, all cells greyed after full scan, result = -1]
[image:step-05-complexity.png|Step 5: Complexity summary — O(1) best, O(n) average and worst; comparison table with Binary Search]

</collapsible-section>

<collapsible-section o>
## Implementation {#implementation}

<code-tabs>
```python
# Time: O(n) | Space: O(1)
def linear_search(arr: list, target: int) -> int:
    """Return index of target in arr, or -1 if not found."""
    for i, val in enumerate(arr):
        if val == target:
            return i
    return -1


# Time: O(n) | Space: O(n)
def linear_search_all(arr: list, target: int) -> list[int]:
    """Return list of all indices where target appears."""
    return [i for i, val in enumerate(arr) if val == target]


# Time: O(n) | Space: O(1)  — sentinel variant
def linear_search_sentinel(arr: list, target: int) -> int:
    """Sentinel linear search — avoids bounds check inside loop."""
    n = len(arr)
    if n == 0:
        return -1
    last = arr[n - 1]
    arr[n - 1] = target          # place sentinel
    i = 0
    while arr[i] != target:
        i += 1
    arr[n - 1] = last            # restore original value
    if i < n - 1 or last == target:
        return i
    return -1
```

```java
// Time: O(n) | Space: O(1)
public class LinearSearch {

    public static int linearSearch(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) return i;
        }
        return -1;
    }

    // Time: O(n) | Space: O(n)
    public static List<Integer> linearSearchAll(int[] arr, int target) {
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) result.add(i);
        }
        return result;  // empty list if not found
    }

    // Time: O(n) | Space: O(1) — sentinel variant
    public static int linearSearchSentinel(int[] arr, int target) {
        int n = arr.length;
        if (n == 0) return -1;
        int last = arr[n - 1];
        arr[n - 1] = target;       // place sentinel
        int i = 0;
        while (arr[i] != target) i++;
        arr[n - 1] = last;         // restore
        if (i < n - 1 || last == target) return i;
        return -1;
    }
}
```

```cpp
// Time: O(n) | Space: O(1)
#include <vector>
using namespace std;

int linearSearch(const vector<int>& arr, int target) {
    for (int i = 0; i < (int)arr.size(); i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}

// Time: O(n) | Space: O(n)
vector<int> linearSearchAll(const vector<int>& arr, int target) {
    vector<int> result;
    for (int i = 0; i < (int)arr.size(); i++) {
        if (arr[i] == target) result.push_back(i);
    }
    return result;  // empty if not found
}

// Time: O(n) | Space: O(1) — sentinel variant
int linearSearchSentinel(vector<int>& arr, int target) {
    int n = arr.size();
    if (n == 0) return -1;
    int last = arr[n - 1];
    arr[n - 1] = target;           // place sentinel
    int i = 0;
    while (arr[i] != target) i++;
    arr[n - 1] = last;             // restore
    if (i < n - 1 || last == target) return i;
    return -1;
}
```
</code-tabs>

### Dry Run {#dry-run}

Trace `linear_search([3, 7, 1, 9, 4, 6, 2, 8], 4)`:

`i = 0`: `arr[0] = 3`, `3 ≠ 4`, continue. `i = 1`: `arr[1] = 7`, `7 ≠ 4`, continue. `i = 2`: `arr[2] = 1`, `1 ≠ 4`, continue. `i = 3`: `arr[3] = 9`, `9 ≠ 4`, continue. `i = 4`: `arr[4] = 4`, `4 == 4` — match found, return `4`.

Five iterations, four misses, one hit. The function returns `4`, which is the index in the original array where value `4` lives.

Now trace the not-found case: `linear_search([3, 7, 1, 9, 4, 6, 2, 8], 5)`. Every comparison fails — `3≠5`, `7≠5`, `1≠5`, `9≠5`, `4≠5`, `6≠5`, `2≠5`, `8≠5`. The loop exits naturally after eight comparisons and the function returns `-1`.

### Variations {#variations}

```python
# Variation: Reverse linear search (find last occurrence)
# Time: O(n) | Space: O(1)
def linear_search_last(arr: list, target: int) -> int:
    """Return index of LAST occurrence of target, or -1."""
    for i in range(len(arr) - 1, -1, -1):
        if arr[i] == target:
            return i
    return -1


# Variation: Linear search with custom comparator (generic)
# Time: O(n) | Space: O(1)
def linear_search_if(arr: list, predicate) -> int:
    """Return first index where predicate(arr[i]) is True."""
    for i, val in enumerate(arr):
        if predicate(val):
            return i
    return -1

# Usage: find first number > 5
# linear_search_if([1, 3, 7, 2], lambda x: x > 5)  → 2
```

</collapsible-section>

<collapsible-section o>
## Summary {#summary}

Linear search is the foundational search algorithm: scan every element in order, return on match, report -1 on exhaustion. It costs O(n) time and O(1) space, requires no preprocessing, and works on any data structure that supports sequential access — including unsorted arrays, linked lists, and data streams.

[takeaways]
- Linear search is O(n) worst-case and O(1) best-case; average is n/2 comparisons when the element is present
- It requires no preprocessing and works on unsorted data — making it the only general search for linked lists and streams
- The sentinel variant places the target at position n before looping, eliminating the bounds check for a constant-factor speedup
- In interviews, the key signal for linear search is: unsorted input, or you need all occurrences, or the dataset is small; always ask about sortedness before defaulting to O(n)
- When searching the same collection repeatedly and k queries dominate, sort once and switch to O(log n) binary search — the crossover is roughly k > n / log n
[/takeaways]

</collapsible-section>

<collapsible-section>
## Glossary {#glossary}

[glossary]
t: Linear Search
d: A sequential search algorithm that checks each element one by one from start to end until the target is found or the list is exhausted.
e: Searching for 7 in [3, 1, 7, 9] checks 3, then 1, then 7 — found at index 2.
[/glossary]

[glossary]
t: Sequential Access
d: A data traversal pattern where elements are visited in order, one after another, without random jumping.
e: Reading a linked list node by node is sequential access; jumping to arr[5] is random access.
[/glossary]

[glossary]
t: Target Value
d: The specific element being searched for within a collection.
e: In linearSearch(arr, 9), the value 9 is the target.
[/glossary]

[glossary]
t: Sentinel
d: A special value placed at a known position (often the end of an array) to guarantee a loop terminates without a separate bounds check.
e: Placing target at arr[n-1] before the loop means the loop always hits the target, removing the i < n condition.
[/glossary]

[glossary]
t: Sentinel Linear Search
d: A variant of linear search that inserts the target as a sentinel at the last position, reducing per-iteration comparisons from two to one.
e: Saves roughly half the comparisons per step compared to a naive loop with a bounds check.
[/glossary]

[glossary]
t: Worst Case
d: The input arrangement that causes the algorithm to do the maximum work; for linear search this is when the target is at the last index or absent.
e: Searching for 99 in [1, 2, 3, 99] is worse than searching for 1, because 99 is found last.
[/glossary]

[glossary]
t: Best Case
d: The input arrangement that causes the algorithm to do the minimum work; for linear search this is when the target is the very first element.
e: Searching for 3 in [3, 7, 1, 9] returns immediately after one comparison.
[/glossary]

[glossary]
t: Average Case
d: The expected performance over all possible inputs assuming a uniform distribution; for linear search this is (n+1)/2 comparisons.
e: On average, the target is found halfway through a randomly ordered array of n elements.
[/glossary]

[glossary]
t: Index
d: The integer position of an element within an array, starting at 0 in most languages.
e: In arr = [5, 3, 8], value 8 is at index 2.
[/glossary]

[glossary]
t: Unsorted Array
d: An array whose elements are in no particular order, making index-based shortcuts like binary search inapplicable.
e: [7, 2, 5, 1, 9] is unsorted; linear search is the safe default.
[/glossary]

[glossary]
t: Binary Search
d: A divide-and-conquer search that halves the search space at each step; requires the array to be sorted.
e: On [1, 3, 5, 7, 9], binary search finds 7 in 2 comparisons versus 4 for linear search.
[/glossary]

[glossary]
t: Brute Force
d: A problem-solving strategy that exhaustively tries every possibility without exploiting structure; linear search is the brute-force approach to searching.
e: Checking every element is brute force; exploiting sortedness with binary search is not.
[/glossary]

[glossary]
t: Move-to-Front Heuristic
d: An optimization for repeated searches where each found element is moved to the head of the list, so frequently queried items are found faster over time.
e: If 7 is searched 100 times in a list, moving it to the front after the first find makes all subsequent searches O(1).
[/glossary]

[glossary]
t: O(1) Space
d: A constant-space guarantee meaning the algorithm uses the same amount of extra memory regardless of input size.
e: Linear search only needs one loop counter and one comparand — it never allocates memory proportional to n.
[/glossary]

[glossary]
t: Data Stream
d: A potentially infinite or real-time sequence of values that can only be read once in order; random access is unavailable.
e: Sensor readings arriving in real time form a stream — only linear scanning is possible.
[/glossary]

[glossary]
t: Occurrence
d: A single instance of the target value appearing in the array; a value may have zero, one, or many occurrences.
e: In [1, 3, 3, 7, 3], value 3 has three occurrences at indices 1, 2, and 4.
[/glossary]

[glossary]
t: Random Access
d: The ability to read any element in O(1) time by index, as arrays support; enables algorithms like binary search.
e: arr[5] is random access; following five next pointers in a linked list is sequential access.
[/glossary]

[glossary]
t: Predicate Search
d: A generalized form of linear search that accepts a boolean function rather than a fixed target value, returning the first element satisfying the condition.
e: Find first element greater than 5: linear_search_if(arr, lambda x: x > 5).
[/glossary]

</collapsible-section>

<collapsible-section>
## Interview Questions {#interview-questions}

[interview]
q: What is the time complexity of linear search in the best, average, and worst cases?
a: Best case is O(1) — the target is at index 0. Worst case is O(n) — the target is at the last position or absent, requiring all n comparisons. Average case is O(n) as well; with uniform distribution the target is found halfway on average, meaning (n+1)/2 comparisons, which is still Θ(n). Space is O(1) throughout because only a loop counter is used.
d: easy
cat: complexity
[/interview]

[interview]
q: When would you prefer linear search over binary search?
a: When the array is unsorted and sorting is expensive or forbidden — sorting costs O(n log n) which only pays off if you search many times. Also when the data structure is a linked list (no random access, so binary search is impossible) or a data stream (elements arrive one at a time). For very small n (under ~10), linear search often beats binary search because it has lower constant overhead.
d: easy
cat: application
[/interview]

[interview]
q: How do you find all occurrences of a target using linear search?
a: Remove the early return and accumulate indices into a result list. Iterate the full array, appending each matching index. Return the list; an empty list means the element is absent. This always runs in O(n) time because every element must be checked even after the first match, since later duplicates may exist.
d: easy
cat: implementation
[/interview]

[interview]
q: What is sentinel linear search and why is it faster?
a: Sentinel search places the target value at position n-1 before the loop starts, then loops with only the equality check (no bounds check). The sentinel guarantees the loop always terminates without ever going out of bounds, eliminating one comparison per iteration. After the loop, we check whether we stopped before the sentinel position or whether the original last element was the target. This halves the number of comparisons per step — a constant-factor improvement at the same O(n) asymptotic complexity, relevant in performance-critical inner loops.
d: medium
cat: implementation
[/interview]

[interview]
q: Can linear search be applied to a linked list? What about binary search?
a: Yes — linear search traverses nodes one by one via next pointers, which is exactly how linked lists are read. Binary search cannot be applied to a standard singly-linked list because it requires O(1) random access to compute and jump to the midpoint. Even if the list were sorted, reaching the midpoint takes O(n) time per step, degrading binary search to O(n log n) — worse than linear search. Skip lists are a data structure designed to recover sub-linear search on linked structures.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: How does the move-to-front heuristic improve repeated linear searches?
a: After finding the target at index i, move it to index 0 (shifting other elements right). Future searches for the same element cost O(1). Over many queries with skewed access patterns — where a small subset of values is searched far more often — popular elements cluster at the front and average search time drops significantly. The tradeoff is that you alter the original order of the list, which may be unacceptable if ordering carries meaning.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: What is the exact expected number of comparisons for a successful linear search on n elements?
a: Assuming each of the n elements is equally likely to be the target and the target is present exactly once, the expected position is (1 + 2 + … + n) / n = (n+1)/2. So the expected comparisons for a successful search is (n+1)/2. For an unsuccessful search (target absent), it is always exactly n. The combined expected comparisons (assuming p is the probability the element is present) is p × (n+1)/2 + (1-p) × n.
d: medium
cat: complexity
[/interview]

[interview]
q: How would you implement linear search to return the last occurrence of a target?
a: Scan from right to left: iterate from index n-1 down to 0 and return the first match. Alternatively scan left to right but don't return on match — instead update a result variable and continue; return the variable after the loop. The reverse scan version can exit early on the first hit from the right, which is slightly more elegant and allows early termination if the last occurrence happens to be near the end.
d: easy
cat: implementation
[/interview]

[interview]
q: At what query count k does binary search (with pre-sorting) beat repeated linear searches on an array of n elements?
a: Sorting costs O(n log n). Each binary search costs O(log n), each linear search costs O(n). Total cost with sorting: O(n log n + k log n). Total without: O(kn). Binary search wins when n log n + k log n < kn, which simplifies to k(n - log n) > n log n, giving k > n log n / (n - log n) ≈ log n for large n. Practically speaking: if you will query the same array more than ~log n times, sort it first.
d: hard
cat: complexity
[/interview]

[interview]
q: Describe how linear search behaves when elements are not uniformly distributed.
a: If certain elements are searched far more frequently, the average case improves if those elements happen to be near the front. With the move-to-front heuristic, the list self-organizes to match the access distribution over time, and expected search length approaches the harmonic number scaled by frequency (similar to the optimal encoding length in information theory). Without any heuristic, a skewed distribution gives no improvement — the algorithm still checks all preceding elements before a popular-but-late element.
d: hard
cat: complexity
[/interview]

[interview]
q: How does linear search apply to 2D matrices?
a: Flatten the 2D access into a single scan. Iterate row by row (or column by column), checking each element. For an m×n matrix this is O(mn) time, O(1) space. If the matrix has special structure — rows sorted, or rows and columns both sorted (the "sorted matrix" problem) — linear scan is suboptimal and the staircase search (start top-right, move left or down) achieves O(m+n). Always ask about structure before defaulting to brute-force scan.
d: medium
cat: application
[/interview]

[interview]
q: What is the difference between linear search returning an index versus a boolean?
a: Index-returning search gives strictly more information — you can derive the boolean by checking whether the returned index is -1. Boolean-returning search discards location, which is fine for existence checks but useless if the caller needs to modify the found element or verify its position. In practice, always implement the index version; callers that only need existence can ignore the index.
d: easy
cat: implementation
[/interview]

[interview]
q: How would you use linear search to find the minimum element in an unsorted array?
a: Initialize a variable `min_val = arr[0]` (handle empty array as a special case). Scan from index 1 to n-1; whenever `arr[i] < min_val`, update `min_val = arr[i]`. Return `min_val` after the loop. This is O(n) time, O(1) space. Finding minimum is structurally identical to linear search — both scan once and maintain one piece of state. To also return the index, maintain `min_idx` alongside `min_val`.
d: easy
cat: application
[/interview]

[interview]
q: Can you parallelize linear search? What are the tradeoffs?
a: Yes — divide the array into p roughly equal chunks and assign each chunk to a thread. Each thread searches its chunk independently; the first to find the target signals the others to stop. Time drops to O(n/p) with p processors. Tradeoffs: coordination overhead for the early-exit signal, cache coherence costs when threads share the array, and thread setup overhead that dominates for small n. For very large arrays (millions of elements) in latency-critical systems, parallel scan is used in databases and SIMD instruction sets (which scan multiple elements per clock cycle).
d: hard
cat: tradeoffs
[/interview]

[interview]
q: When does linear search have better cache performance than binary search?
a: Linear search accesses memory in sequential order — exactly how CPUs prefetch cache lines. Each iteration reads the next adjacent memory address, so cache misses are rare after the first access. Binary search jumps to the midpoint each time, causing cache misses whenever the jump crosses a cache line boundary. For small arrays that fit in L1/L2 cache both are fast, but for large arrays on modern hardware, linear search's sequential access pattern can make it competitive with binary search for moderate n due to hardware prefetching.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: How do you search for a target in a sorted array using linear search — and should you?
a: You can exit early when `arr[i] > target` (for ascending order), since no later element can match. This doesn't improve worst-case O(n) but halves average comparisons for unsuccessful searches. However, on a sorted array binary search achieves O(log n) worst case, so unless n is tiny or you specifically need the early-exit property without restructuring the algorithm, binary search is the correct choice. The early-exit optimization is primarily useful when a sorted property is incidental and you can't restructure the code to use binary search.
d: medium
cat: application
[/interview]

[interview]
q: What does it mean for linear search to be "comparison-based" and why does it matter?
a: Comparison-based means the algorithm's only operation on data is less-than or equal-to comparisons — it never looks at bit patterns or uses hashing. This makes it universal (works on any type with a defined equality) but means it cannot beat O(n) for search on unsorted data — there is no way to rule out an unseen element without comparing it. Algorithms that exploit structure (hash tables achieve O(1) average; radix structures achieve O(k) for key length k) are not comparison-based and can outperform O(n).
d: expert
cat: complexity
[/interview]

[interview]
q: What is the theoretical lower bound for searching in an unsorted array?
a: The lower bound is Ω(n) — any deterministic algorithm must examine every element in the worst case, because with one element unseen, an adversary can place the target there. This is a linear information-theoretic argument: you have n unknowns and each comparison gives exactly one bit of information, so n comparisons are necessary in the worst case. Linear search is therefore asymptotically optimal for unsorted data — no algorithm can do better in the worst case.
d: expert
cat: complexity
[/interview]

[interview]
q: How would you implement a type-generic linear search in a statically typed language?
a: Use generics (Java/C++) or templates (C++) with an equality comparator or Comparable interface. In Java: `public static <T> int linearSearch(T[] arr, T target, Comparator<T> cmp)`, comparing via `cmp.compare(arr[i], target) == 0`. In C++: `template<typename T, typename Pred> int linearSearch(vector<T>& arr, Pred predicate)`. The predicate approach is the most flexible — it decouples the search from the equality definition, enabling searches like "first element satisfying condition" without changing the function signature.
d: medium
cat: implementation
[/interview]

[interview]
q: What happens if the array has duplicate targets and you run linear search?
a: Standard linear search returns the first (leftmost) occurrence and stops — duplicates at higher indices are never visited. To find all occurrences, remove the early return and collect all matching indices in O(n). To find the last occurrence, scan right to left or scan all and keep updating the answer. The choice depends on the problem specification. In interviews, always clarify: "Should I return the first occurrence, last, or all?" before coding.
d: easy
cat: implementation
[/interview]

[interview]
q: How does linear search relate to the "find peak element" problem?
a: A peak element is one greater than its neighbours. Naive linear scan — check every element for the peak condition — works in O(n) and is essentially linear search with a custom predicate. However, the sorted structure of the peak problem (the array rises then falls) allows binary search to find a peak in O(log n) by comparing mid to mid+1. Knowing that linear search is the brute-force baseline lets you recognize when problem structure enables something faster.
d: hard
cat: application
[/interview]

[interview]
q: What is SIMD and how does it accelerate linear search?
a: SIMD (Single Instruction, Multiple Data) lets a CPU compare 4, 8, or 16 array elements to the target simultaneously in a single instruction (e.g., SSE, AVX on x86). A SIMD linear search loads 8 integers at once, compares all 8 to the target in parallel, and checks the comparison mask in one step — effectively giving a constant-factor speedup of 4–16× over scalar loops while maintaining O(n) asymptotic complexity. Languages expose this via intrinsics (C/C++) or libraries (numpy's vectorized operations in Python).
d: expert
cat: implementation
[/interview]

[interview]
q: In what situations should you still use linear search even if the data is sorted?
a: When the searched range is tiny (under ~8 elements) — binary search's overhead of computing midpoints and branch prediction misses can exceed the cost of a simple scan. Standard library implementations (like `std::lower_bound` in C++) often switch to linear scan for small sub-ranges internally. Also when accessing sorted data over a network or from disk, where each read is expensive regardless, and the latency dominates over the comparison count.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: How would you verify the correctness of a linear search implementation?
a: Test four categories: (1) element present at the start (best case), (2) element present at the end (worst case), (3) element present in the middle, (4) element absent (should return -1). Additionally test edge cases: empty array (should return -1 without crashing), single-element array with match, single-element array without match, duplicate elements (returns first occurrence), and all elements equal to target. These seven to nine test cases cover all boundary conditions.
d: medium
cat: implementation
[/interview]

</collapsible-section>

<collapsible-section>
## Multiple Choice Questions {#multiple-choice-questions}

[mcq]
q: What does linear search return when the target element is not found in the array?
o: The last element of the array | -1 (or a sentinel indicating absence) | 0 | The length of the array
c: 1
e: By convention, linear search returns -1 when the target is absent, signalling "not found" without ambiguity (since -1 is not a valid array index).
w: The last element of the array would be confusing — that's a real value, not a status. 0 is a valid index (element found at position 0). Array length n is also not a standard sentinel because it's outside valid indices but not the universal convention.
d: beginner
[/mcq]

[mcq]
q: What is the worst-case time complexity of linear search on an array of n elements?
o: O(1) | O(log n) | O(n) | O(n²)
c: 2
e: In the worst case the target is at the last index or absent, so all n elements are checked — O(n).
w: O(1) is the best case (target at index 0). O(log n) is binary search. O(n²) would require a nested loop, which linear search does not have.
d: beginner
[/mcq]

[mcq]
q: What is the best-case time complexity of linear search?
o: O(n) | O(log n) | O(n log n) | O(1)
c: 3
e: Best case occurs when the target is at index 0, requiring only one comparison — O(1).
w: O(n) is the average and worst case. O(log n) describes binary search. O(n log n) describes sorting algorithms.
d: beginner
[/mcq]

[mcq]
q: Which of the following is a requirement for using linear search?
o: The array must be sorted in ascending order | The array must contain unique elements | The array must be stored in a hash table | No special requirement — it works on any sequence
c: 3
e: Linear search makes no assumptions about order, uniqueness, or data structure — it scans whatever sequence it is given.
w: Sorted order is required by binary search, not linear search. Unique elements are required by some algorithms but not linear search. A hash table enables O(1) lookup — a completely different mechanism.
d: beginner
[/mcq]

[mcq]
q: How many comparisons does linear search make on [5, 3, 8, 1, 9] when searching for 8?
o: 1 | 2 | 3 | 5
c: 2
e: Index 0: 5≠8, index 1: 3≠8, index 2: 8==8 — found after 3 comparisons.
w: 1 comparison would mean 8 is at index 0, which it isn't. 2 comparisons would mean it's at index 1. 5 would mean it's absent or last.
d: beginner
[/mcq]

[mcq]
q: What space complexity does standard linear search use?
o: O(n) | O(log n) | O(1) | O(n²)
c: 2
e: Linear search uses only a loop counter and a comparand — constant extra memory regardless of n.
w: O(n) would imply the algorithm allocates memory proportional to input size, which it does not. O(log n) is the stack space of recursive binary search. O(n²) applies to algorithms like bubble sort with certain implementations.
d: beginner
[/mcq]

[mcq]
q: On which data structure can linear search be used but binary search cannot?
o: Sorted array | Hash table | Singly-linked list | Balanced BST
c: 2
e: A singly-linked list supports only sequential access — reaching the midpoint takes O(n) time, making binary search impractical. Linear search only needs to advance one step at a time, which is exactly what linked lists support.
w: Sorted array supports both. Hash table supports O(1) lookup directly — neither search algorithm is needed. Balanced BST supports O(log n) search by design.
d: beginner
[/mcq]

[mcq]
q: What is the average number of comparisons linear search makes when the target is present in an array of n elements (assuming uniform distribution)?
o: n | n/2 | (n+1)/2 | log n
c: 2
e: With uniform distribution the target is equally likely to be at any index 1..n, so the expected comparisons are (1+2+…+n)/n = (n+1)/2.
w: n is the worst case (element absent or last). n/2 is close but off by 0.5 — the exact formula is (n+1)/2. log n is binary search.
d: beginner
[/mcq]

[mcq]
q: In sentinel linear search, what does the sentinel accomplish?
o: It sorts the array before searching | It eliminates the bounds check inside the loop | It speeds up equality comparison | It prevents duplicate elements
c: 1
e: By placing the target at arr[n-1], the loop is guaranteed to find it eventually, so the condition i < n is never needed — only arr[i] != target drives the loop.
w: Sentinel search does not sort. Equality comparison speed is unchanged. It does not prevent duplicates.
d: intermediate
[/mcq]

[mcq]
q: After sentinel linear search places the target at arr[n-1] and the loop exits at index i, what additional check is needed?
o: Verify i < n | Verify i < n-1 or arr[n-1] equals the original last element | Verify arr[i] equals target again | No additional check is needed
c: 1
e: The loop exits at i when arr[i] equals the target (the sentinel or a real match). We need i < n-1 (real match before sentinel) or the original last element actually equals target — otherwise we only hit the sentinel and the element is absent.
w: i < n is always true by construction. Checking arr[i] == target again is redundant (the loop already ensures this). Skipping the check would incorrectly return n-1 for absent elements.
d: intermediate
[/mcq]

[mcq]
q: Which modification allows early termination during linear search on a sorted array?
o: Break when arr[i] < target | Break when arr[i] > target (ascending) | Break when arr[i] == arr[i-1] | There is no valid early termination
c: 1
e: In an ascending array, once arr[i] > target, all subsequent elements are also greater and the target cannot appear later — so we can exit immediately.
w: Breaking when arr[i] < target would exit too soon (elements less than target are still before it). Breaking on duplicates is unrelated to the target. Early termination is valid and useful on sorted arrays.
d: intermediate
[/mcq]

[mcq]
q: What is the time complexity of finding all occurrences of a target in an unsorted array?
o: O(1) | O(log n) | O(n) | O(n log n)
c: 2
e: Every element must be checked because the target could appear anywhere, including the last position. Worst case: all n elements match or none match — both require n comparisons.
w: O(1) and O(log n) are impossible without structure information. O(n log n) would require sorting, which is not needed here.
d: intermediate
[/mcq]

[mcq]
q: How many searches k on an n-element array make it worth sorting first (to enable binary search)?
o: k > 1 | k > log n | k > n | k > n log n
c: 1
e: Sort costs O(n log n). Each binary search costs O(log n). Total cost with sorting: O(n log n + k log n). Without sorting (linear): O(kn). Sorting wins when n log n + k log n < kn → k > n log n / (n - log n) ≈ log n for large n.
w: k > 1 is too low — for small k, linear search wins even after sorting. k > n means waiting far too long. k > n log n is far too conservative.
d: intermediate
[/mcq]

[mcq]
q: You call linearSearch([2, 4, 4, 7, 4], 4). What does the standard implementation return?
o: 4 | 1 | 2 | [1, 2, 4]
c: 1
e: Standard linear search returns the FIRST occurrence. Index 1 holds value 4 and is the first match; the algorithm returns immediately.
w: 4 is the value itself, not the index. 2 is the second occurrence (index 2). Returning a list requires the find-all variant.
d: intermediate
[/mcq]

[mcq]
q: What is the primary advantage of linear search over hash table lookup?
o: Linear search is faster on average | Linear search uses less space | Linear search works on unsorted data while hash tables require a key | Linear search has O(1) worst case
c: 1
e: A linear scan over an array uses O(1) extra memory — no hash table overhead. Hash tables require O(n) extra space for the buckets and collision structures, plus O(n) time to build.
w: Hash table is O(1) average — faster than O(n). Both work on unsorted data conceptually. Linear search is O(n) worst case, not O(1).
d: intermediate
[/mcq]

[mcq]
q: A data stream delivers elements one at a time and cannot be rewound. Which search strategy applies?
o: Binary search | Linear search | Hash table lookup | B-tree search
c: 1
e: A stream delivers elements sequentially with no way to jump to an arbitrary position or re-read earlier elements. Linear search naturally consumes elements one by one, making it the only applicable general search strategy.
w: Binary search requires random access and re-reads. Hash table lookup requires the full dataset to be ingested first. B-tree search requires an indexed structure.
d: intermediate
[/mcq]

[mcq]
q: What does the move-to-front heuristic do to improve linear search performance?
o: Sorts the array every time an element is found | Moves the found element to index 0 after each successful search | Removes duplicates during search | Caches the last found index
c: 1
e: After finding an element at index i, move it to position 0. Repeated searches for popular elements then cost O(1) because they sit at the front. Over many queries, access frequency self-sorts the list.
w: Sorting the array each time would cost O(n log n) per search — far worse. Removing duplicates changes the data. Caching helps repeated searches for the same element but not for different popular elements.
d: intermediate
[/mcq]

[mcq]
q: Which scenario makes linear search preferable to binary search even on sorted data?
o: n = 10⁶ with 10⁶ queries | n = 8 with 3 queries | The array is never modified | The array is stored in a database
c: 1
e: For very small n (here n=8), linear search's constant overhead is lower than binary search's midpoint computation and conditional branching — linear search wins on tiny arrays.
w: n=10⁶ with many queries strongly favors binary search (O(log n) per query vs O(n)). Mutability is unrelated to the choice. Database storage is also unrelated.
d: intermediate
[/mcq]

[mcq]
q: What is the theoretical lower bound on search time for unsorted data?
o: O(log n) | O(√n) | O(n) | O(n log n)
c: 2
e: Any deterministic algorithm must examine every element in the worst case because with one unseen element, an adversary can place the target there. This gives Ω(n) — and linear search achieves this bound, making it asymptotically optimal for unsorted data.
w: O(log n) and O(√n) are below the lower bound and impossible for arbitrary unsorted data without additional structure. O(n log n) is an upper bound for sorting, not a lower bound for searching.
d: advanced
[/mcq]

[mcq]
q: SIMD linear search compares 8 elements per instruction. What is its time complexity?
o: O(n/8) | O(n) | O(8) | O(log n)
c: 1
e: O(n/8) simplifies to O(n) — the constant 8 disappears in big-O notation. SIMD provides a constant-factor speedup but does not change the asymptotic class.
w: O(n/8) as a final answer is imprecise — big-O absorbs constants. O(8) would imply constant time. O(log n) is binary search.
d: advanced
[/mcq]

[mcq]
q: Why does linear search sometimes outperform binary search on modern hardware for medium-sized arrays?
o: Linear search has better asymptotic complexity | Sequential memory access matches CPU cache prefetching, reducing cache misses | Binary search uses more memory | Linear search can be parallelised easily
c: 1
e: CPUs prefetch cache lines sequentially. Linear search accesses arr[0], arr[1], arr[2]… in order, so the prefetcher loads upcoming elements ahead of time. Binary search jumps to random midpoints, causing cache misses that each stall the pipeline.
w: Binary search has better asymptotic complexity. Both use O(1) extra memory. Parallelism is not the reason for cache-level wins.
d: advanced
[/mcq]

[mcq]
q: Parallel linear search divides an array of n elements among p threads. What is the ideal time complexity?
o: O(n) | O(n/p) | O(p) | O(log n)
c: 1
e: Each thread scans n/p elements. With p equal-sized chunks processed simultaneously, total time is O(n/p). Communication and synchronization overhead make the actual constant larger, but the ideal asymptotic is O(n/p).
w: O(n) is the single-threaded time. O(p) would mean faster with more threads regardless of n — not true. O(log n) is binary search.
d: advanced
[/mcq]

[mcq]
q: What is the expected search length for linear search with move-to-front on highly skewed access distributions?
o: Always O(1) | O(n) in the worst case for any single element | Approaches O(1) for the most popular elements | Degrades to O(n²) due to shuffling overhead
c: 2
e: Move-to-front self-organizes the list so the most frequently accessed elements cluster at the front. After enough queries, the top-k most popular elements are at positions 1..k and are found in O(k) comparisons. For the single most popular element, the expected cost approaches O(1).
w: Always O(1) is false — rare elements stay near the back. O(n) worst-case for a single element is true but misses the optimization point. O(n²) is wrong; shuffling is O(n) but rarely triggered.
d: advanced
[/mcq]

[mcq]
q: Which statement correctly describes the relationship between linear search and comparison-based lower bounds?
o: Linear search beats the Ω(n) lower bound using comparison tricks | Linear search is asymptotically optimal for searching unsorted data | Linear search is suboptimal because hash tables are O(1) | Linear search requires Ω(n log n) comparisons
c: 1
e: The information-theoretic lower bound for searching unsorted data is Ω(n) — you must inspect every element in the worst case. Linear search achieves exactly O(n), making it optimal among comparison-based algorithms on unsorted inputs.
w: No comparison-based algorithm beats Ω(n) on unsorted data. Hash tables are not comparison-based — they exploit numeric structure. Linear search is Θ(n), not Θ(n log n).
d: advanced
[/mcq]

[mcq]
q: A function returns arr[i] instead of i when the target is found. Under what condition will callers notice the bug?
o: Always | When the target value equals its own index | When the target value does not equal its own index | Never — value and index are equivalent
c: 2
e: Callers expecting an index receive the value instead. The bug is invisible only when arr[i] == i (the value happens to equal its index). In all other cases, the returned number is wrong — either a valid but incorrect index, or a value outside [0, n-1] entirely.
w: Not always visible — if arr[3] == 3, returning 3 looks correct. When value equals index the bug is hidden. They are never equivalent in general.
d: intermediate
[/mcq]

[mcq]
q: You implement linear search with the condition i <= n instead of i < n. What happens?
o: It silently skips the last element | It accesses arr[n], causing an out-of-bounds error | It returns the correct answer but wastes one comparison | It works correctly in all languages
c: 1
e: arr[n] is one past the end of a 0-indexed array of size n — an out-of-bounds access that causes undefined behaviour in C/C++ and an IndexError in Python/Java.
w: i <= n does not skip the last element — it over-reads past it. The extra comparison is not harmless; it accesses invalid memory. Python/Java raise an exception, so "works correctly" is false.
d: intermediate
[/mcq]

[mcq]
q: What happens if sentinel linear search forgets to restore arr[n-1] after the search?
o: The search returns a wrong index | The array is permanently corrupted at its last position | The algorithm runs in infinite loop | Performance degrades to O(n²)
c: 1
e: The sentinel temporarily overwrites arr[n-1] with the target value. Failing to restore the original last element mutates the caller's array, causing hard-to-diagnose bugs in subsequent operations.
w: The index returned is still correct — corruption happens after the return. No infinite loop results. Performance is unaffected.
d: intermediate
[/mcq]

[mcq]
q: Linear search on a sorted array with early exit (break when arr[i] > target) reduces which complexity measure?
o: Worst-case time | Average time for unsuccessful searches | Space complexity | Best-case time
c: 1
e: For unsuccessful searches on sorted data, without early exit you always scan all n elements. With early exit you stop at the first element exceeding the target — on average halfway through, cutting unsuccessful-search time to n/2. Worst case (target would be the largest) still visits n elements.
w: Worst-case time remains O(n) (target larger than all elements). Space is unchanged at O(1). Best case is already O(1) — target at index 0.
d: advanced
[/mcq]

[mcq]
q: Which input causes the maximum number of comparisons in linear search?
o: Target is at index 0 | Target is at index n/2 | Target is absent from the array | Target appears at every index
c: 2
e: When the target is absent, the loop runs to completion — all n comparisons are made without finding a match. This ties with the case where the target is at index n-1.
w: Target at index 0 costs 1 comparison (best case). Target at index n/2 costs n/2+1. Target appearing everywhere costs 1 comparison (first element matches immediately).
d: beginner
[/mcq]

[mcq]
q: What must be true of the equality operator used in linear search for the algorithm to be correct?
o: It must be a strict less-than comparison | It must be reflexive, symmetric, and transitive (an equivalence relation) | It must compare by memory address only | It must sort elements before comparing
c: 1
e: Linear search relies on equality. For equality to behave predictably, it must satisfy: a==a (reflexive), a==b implies b==a (symmetric), and a==b and b==c implies a==c (transitive). Violating these (e.g. NaN != NaN in IEEE 754) causes linear search to miss elements even when they are present.
w: Less-than is not needed — only equality. Address comparison would miss equal-valued objects at different addresses. Sorting before comparing would change O(n) to O(n log n).
d: expert
[/mcq]

</collapsible-section>

<collapsible-section>
## Visual Questions {#visual-questions}

[visual-mcq]
type: fillblank
d: beginner
q: Complete the missing return statement so this linear search correctly signals "not found".
code:
def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return ____
o: 0 | -1 | None | len(arr)
c: 1
e: -1 is the universal sentinel for "not found" in index-returning search. 0 is a valid index (the first element). None is used in Python but -1 is the conventional numeric sentinel. len(arr) is outside valid indices but not the standard.
[/visual-mcq]

[visual-mcq]
type: fillblank
d: beginner
q: Fill in the blank so the loop scans every element in the array exactly once.
code:
def linear_search(arr, target):
    for i in range(____):
        if arr[i] == target:
            return i
    return -1
o: len(arr) - 1 | len(arr) | len(arr) + 1 | 0
c: 1
e: range(len(arr)) generates indices 0, 1, …, n-1 — exactly n iterations covering every element. range(len(arr)-1) misses the last element. range(len(arr)+1) accesses index n which is out of bounds.
[/visual-mcq]

[visual-mcq]
type: trace
d: intermediate
q: The array [6, 3, 8, 2, 5] is searched for target = 2. At which index is the match found, and how many comparisons were made?
img: images/visual-trace-01-search-for-2.png
o: Index 2, 3 comparisons | Index 3, 4 comparisons | Index 3, 3 comparisons | Index 4, 4 comparisons
c: 1
e: Comparisons: index 0 (6≠2), index 1 (3≠2), index 2 (8≠2), index 3 (2==2). Four comparisons, found at index 3.
[/visual-mcq]

[visual-mcq]
type: trace
d: intermediate
q: The array [1, 4, 7, 10, 13] is searched for target = 6 using linear search (no early exit). What is returned and how many comparisons occur?
img: images/visual-trace-02-not-found.png
o: -1, 4 comparisons | -1, 5 comparisons | 6, 5 comparisons | -1, 3 comparisons
c: 1
e: Linear search (without early exit) checks all 5 elements before reporting -1: 1≠6, 4≠6, 7≠6, 10≠6, 13≠6 — five comparisons, then return -1.
[/visual-mcq]

[visual-mcq]
type: output
d: intermediate
q: What does this function return when called with arr = [5, 3, 5, 1, 5] and target = 5?
code:
def search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1
o: 0 | [0, 2, 4] | 2 | 4
c: 0
e: The function returns on the first match. Index 0 holds value 5 — the very first comparison succeeds and the function returns 0 immediately.
[/visual-mcq]

[visual-mcq]
type: output
d: intermediate
q: What is the output of the following code?
code:
arr = [9, 4, 7, 2, 6]
result = -1
for i in range(len(arr) - 1, -1, -1):
    if arr[i] == 7:
        result = i
        break
print(result)
o: 1 | 2 | -1 | 7
c: 1
e: The loop runs right to left: i=4 (6≠7), i=3 (2≠7), i=2 (7==7) — result = 2, break. Output is 2.
[/visual-mcq]

[visual-mcq]
type: spotbug
d: advanced
q: What is the bug in this linear search implementation?
code:
def linear_search(arr, target):
    for i in range(len(arr) - 1):
        if arr[i] == target:
            return i
    return -1
o: The function never returns -1 | The last element is never checked | The loop runs one extra iteration | The equality check is backwards
c: 1
e: range(len(arr) - 1) generates indices 0 through n-2, skipping the last element at index n-1. If the target is the last element, the function returns -1 incorrectly. The fix is range(len(arr)).
[/visual-mcq]

[visual-mcq]
type: spotbug
d: advanced
q: Identify the bug in this sentinel linear search.
code:
def sentinel_search(arr, target):
    n = len(arr)
    arr[n - 1] = target          # place sentinel
    i = 0
    while arr[i] != target:
        i += 1
    if i < n - 1 or arr[n - 1] == target:
        return i
    return -1
o: The sentinel is placed at the wrong index | The original last element is never saved or restored | The while condition is inverted | The return -1 is unreachable
c: 1
e: The function overwrites arr[n-1] with the target sentinel but never saves the original last element. It cannot restore it after the search, permanently mutating the caller's array. The fix: save `last = arr[n-1]` before placing the sentinel, then restore `arr[n-1] = last` before returning.
[/visual-mcq]

</collapsible-section>

<collapsible-section o>
## LeetCode Problems {#leetcode-problems}

[problem]
n: 1
title: Two Sum
url: https://leetcode.com/problems/two-sum/
diff: easy
pattern: Linear scan with complement lookup — a direct extension of searching for a target
[/problem]

[problem]
n: 268
title: Missing Number
url: https://leetcode.com/problems/missing-number/
diff: easy
pattern: Linear scan to find the absent element in a range 0..n
[/problem]

[problem]
n: 153
title: Find Minimum in Rotated Sorted Array
url: https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/
diff: medium
pattern: Linear scan works as O(n) brute force; contrast with O(log n) binary variant
[/problem]

[problem]
n: 169
title: Majority Element
url: https://leetcode.com/problems/majority-element/
diff: medium
pattern: Linear scan counting occurrences — brute-force linear search per candidate
[/problem]

[problem]
n: 41
title: First Missing Positive
url: https://leetcode.com/problems/first-missing-positive/
diff: hard
pattern: Linear scan with in-place marking to find the first absent value
[/problem]

[problem]
n: 295
title: Find Median from Data Stream
url: https://leetcode.com/problems/find-median-from-data-stream/
diff: hard
pattern: Demonstrates why linear scan (O(n) per query) is inadequate for streams at scale, motivating heap-based solutions
[/problem]

</collapsible-section>

<collapsible-section>
## Contest Problems {#contest-problems}

[contest]
title: Linear Search (introductory problem)
platform: CSES
url: https://cses.fi/problemset/task/1620
diff: easy
pattern: Direct linear scan over an array of queries
[/contest]

[contest]
title: Distinct Numbers
platform: CSES
url: https://cses.fi/problemset/task/1621
diff: easy
pattern: Linear scan to count unique values after sorting — linear search used as a component
[/contest]

[contest]
title: Array Description
platform: CSES
url: https://cses.fi/problemset/task/1746
diff: medium
pattern: DP with linear scan over valid transitions between states
[/contest]

</collapsible-section>

<collapsible-section>
## Learning Checklist {#learning-checklist}

[checklist]
cat: Understanding
- I can explain linear search using an everyday analogy without using any CS jargon
- I understand why the worst-case is O(n) and can prove it requires checking every element when the target is absent
- I understand why the average case is (n+1)/2 comparisons and can derive this from the uniform distribution assumption
- I can explain when linear search is preferable to binary search despite being asymptotically slower
- I understand the theoretical lower bound Ω(n) for searching unsorted data and why linear search is optimal
[/checklist]

[checklist]
cat: Implementation
- I can implement linear search from scratch in Python, Java, and C++ without reference
- I can implement the find-all-occurrences variant that returns every matching index
- I can implement reverse linear search to find the last occurrence
- I can implement sentinel linear search with correct save-and-restore of the last element
- I can implement predicate-based linear search with a custom comparator function
[/checklist]

[checklist]
cat: Problem Solving
- I solved Two Sum (LC #1) using linear search with a complement scan, without hints
- I solved Missing Number (LC #268) using linear scan, without hints
- I solved First Missing Positive (LC #41) using linear scan with in-place marking, without hints
- I attempted Find Median from Data Stream (LC #295) and can explain why O(n) linear scan per query is too slow
[/checklist]

[checklist]
cat: Expert Level
- I know when NOT to use linear search: sorted array with large n, repeated queries on the same data, or data in a hash table
- I can identify the linear search pattern in unseen problems — any "find the first element satisfying condition X" framing
- I understand the sentinel trick and can explain the constant-factor improvement it provides
- I can reason about cache effects and explain why linear search sometimes beats binary search on medium-sized arrays in practice
- I know the move-to-front heuristic and can describe when it does and does not improve expected search time
[/checklist]

</collapsible-section>

<collapsible-section>
## YouTube Recommendations {#youtube-recommendations}

[youtube]
title: Linear Search Algorithm
channel: Abdul Bari
url: https://www.youtube.com/watch?v=C46QfTjVCNU
level: beginner
why: Clean blackboard walkthrough with concrete trace and complexity derivation — ideal first exposure before touching code
[/youtube]

[youtube]
title: Linear Search vs Binary Search
channel: CS Dojo
url: https://www.youtube.com/watch?v=TwsgCHYmbbA
level: intermediate
why: Side-by-side comparison with practical worked examples; bridges the gap between "knowing both" and "knowing which to pick"
[/youtube]

[youtube]
title: Searching Algorithms and Their Complexities
channel: MIT OpenCourseWare
url: https://www.youtube.com/watch?v=P3YID7liBug
level: advanced
why: Formal lower-bound proof for comparison-based search and connection to information theory — builds the rigorous foundation for why O(n) cannot be beaten on unsorted data
[/youtube]

</collapsible-section>

<collapsible-section>
## Links & References {#links-references}

[ref]
text: GeeksForGeeks — Linear Search
url: https://www.geeksforgeeks.org/linear-search/
[/ref]

[ref]
text: CLRS Chapter 2 — Insertion Sort and Loop Invariants (sequential scan fundamentals)
url:
[/ref]

[ref]
text: Competitive Programmer's Handbook — Chapter 3: Sorting and Searching (linear scan baseline)
url: https://cses.fi/book/book.pdf
[/ref]

[ref]
text: CSES Problem Set — Sorting and Searching
url: https://cses.fi/problemset/
[/ref]

[ref]
text: Wikipedia — Linear Search
url: https://en.wikipedia.org/wiki/Linear_search
[/ref]

[ref]
text: Wikipedia — Sentinel Value
url: https://en.wikipedia.org/wiki/Sentinel_value
[/ref]

</collapsible-section>

[image-prompts]
overview.png:
CONCEPT: Linear search scans an unsorted array from left to right, comparing each element to the target until a match is found or the array is exhausted.
SHOW:
- Unsorted array [3, 7, 1, 9, 4, 6, 2, 8] on the left with cells labelled index 0-7
- A magnifying-glass or pointer icon moving left to right
- Target value "4" shown in a box on the right labeled "target"
- An arrow from the array to a green result box showing "Found at index 4"
- A red result path showing "Not found → return -1" as an alternative outcome below
---
step-01-initial.png:
CONCEPT: Initial state — the pointer is at index 0 and no elements have been examined yet.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8] with all cells in neutral colour
- An orange "i" pointer arrow below index 0
- Target value badge "target = 4" in the top right
- A comparison label "Checking index 0: 3 ≠ 4"
- Step counter "Step 1 of 5" in the corner
---
step-02-scanning.png:
CONCEPT: Scanning phase — elements at indices 0, 1, 2, 3 have been checked and eliminated; pointer is now at index 3.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8]
- Indices 0-2 greyed out with small ✗ marks (values 3, 7, 1 eliminated)
- Orange "i" pointer below index 3 (value 9)
- Comparison label "Checking index 3: 9 ≠ 4"
- Eliminated count badge "3 eliminated"
---
step-03-match.png:
CONCEPT: Match found — the pointer reaches index 4 where value 4 equals the target; the cell lights up green.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8]
- Indices 0-3 greyed out
- Index 4 cell highlighted bright green with a ✓ checkmark, value "4"
- Green result banner "return 4" at the top
- Orange "i" pointer below index 4
---
step-04-not-found.png:
CONCEPT: Not-found scenario — same array searched for target = 5; every element is eliminated and -1 is returned.
SHOW:
- Array [3, 7, 1, 9, 4, 6, 2, 8] with all 8 cells greyed out and ✗ marks
- Target badge "target = 5"
- Red result banner "return -1 (not found)"
- All eight comparison labels visible below the array: "3≠5, 7≠5, 1≠5, 9≠5, 4≠5, 6≠5, 2≠5, 8≠5"
---
step-05-complexity.png:
CONCEPT: Complexity summary and decision guide for when to use linear search versus binary search.
SHOW:
- Complexity table with three rows: Best O(1), Average O(n), Worst O(n), Space O(1)
- Decision flowchart: "Array sorted?" → Yes → Binary Search O(log n); No → Linear Search O(n)
- When-to-use signals: unsorted data, linked list, data stream, n is small, search once
- When NOT to use: large sorted array, many repeated queries on same data
---
summary.png:
CONCEPT: All-in-one reference diagram — complexity, decision signals, sentinel trick, and comparison with binary search.
SHOW:
- Complexity table: Best O(1), Avg O(n/2), Worst O(n), Space O(1)
- Mini comparison table: Linear vs Binary — sorted required, complexity, space, linked list support
- Sentinel trick diagram: arr[n-1] = target before loop, remove bounds check, restore after
- Key pattern signals: "unsorted", "linked list", "stream", "find all", "small n"
- Crossover note: "Sort + binary wins when k > log n queries on same data"
[/image-prompts]

[animation]
type: array
input_boxes: [array-number, target-number]
default_array: 3,7,1,9,4,6,2,8
default_target: 4

```js
function computeSteps(input) {
    const arr = input.array;
    const target = input.target;
    const steps = [];
    const eliminated = [];

    // Initial state
    steps.push({
        active: [],
        eliminated: [],
        found: null,
        pointers: { i: 0 },
        label: `Initial state — searching for ${target} in [${arr.join(', ')}]`,
        decision: ""
    });

    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) {
            steps.push({
                active: [i],
                eliminated: [...eliminated],
                found: i,
                pointers: { i },
                label: `arr[${i}] = ${arr[i]} — match found! Returning index ${i}`,
                decision: `${arr[i]} == ${target} → found at index ${i}`
            });
            return steps;
        } else {
            eliminated.push(i);
            steps.push({
                active: [],
                eliminated: [...eliminated],
                found: null,
                pointers: { i },
                label: `arr[${i}] = ${arr[i]} — not a match, continue`,
                decision: `${arr[i]} ≠ ${target} → move to index ${i + 1}`
            });
        }
    }

    // Not found
    steps.push({
        active: [],
        eliminated: [...eliminated],
        found: null,
        pointers: { i: arr.length },
        label: `Search complete — ${target} not found in array, returning -1`,
        decision: `All ${arr.length} elements checked, target absent → return -1`
    });

    return steps;
}
```
[/animation]
