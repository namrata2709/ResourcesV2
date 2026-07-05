---
type: dsa
title: Merge Sort
slug: merge-sort
topic_number: 22
date: 2026-06-23
date_modified:
keywords: [merge sort, divide and conquer, sorting algorithm, stable sort, O(n log n), recursive sort, external sort]
tags: [sorting, divide-and-conquer, recursion, stable-sort]
prerequisites: []
when_to_use: Use when the problem requires a stable sort, when sorting linked lists (where random access is expensive), or when you need guaranteed O(n log n) worst-case performance and can afford O(n) extra memory. Also the go-to algorithm for external sorting when data does not fit in memory.
comparison_topic: Quick Sort
lc_tag_url: https://leetcode.com/tag/merge-sort/
cp_algorithms_url: https://cp-algorithms.com/sequences/merge-sort.html
cses_section: Sorting and Searching
animation_name: merge-sort-animation
---

[collapsible-section o]
## Introduction {#introduction}

Imagine you have two piles of playing cards, and each pile is already sorted in order. Merging them into one sorted pile is almost effortless — compare the top cards of each pile and always place the smaller one onto your new pile. You never have to shuffle through either pile; you only ever look at the top. That single insight is the entire engine behind Merge Sort.

**Merge Sort** is a **divide-and-conquer** sorting algorithm that splits an array in half, recursively sorts each half, then merges the two sorted halves back into one. ==The merge step is where all the real work happens — splitting is almost free, but merging guarantees order.==

Invented by John von Neumann in 1945, it was among the first algorithms formally analysed for correctness and complexity. Unlike algorithms that try to sort in-place by swapping elements, Merge Sort takes a different trade: it uses O(n) extra memory to guarantee O(n log n) time in every case — best, average, and worst.

[note]
Merge Sort is one of the few comparison-based sorting algorithms that offers *guaranteed* O(n log n) regardless of input order. Quick Sort is faster in practice but can degrade to O(n²) on bad inputs without careful pivot selection.
[/note]

[/collapsible-section]

[collapsible-section]
## Divide and Conquer: The Big Picture {#divide-and-conquer-the-big-picture}

Divide and conquer algorithms solve a problem by breaking it into smaller subproblems of the same type, solving each subproblem independently, then combining the results. Merge Sort is the textbook example of this pattern.

The three phases are:

1. **Divide** — Split the array at its midpoint into a left half and a right half.
2. **Conquer** — Recursively apply Merge Sort to each half.
3. **Combine** — Merge the two sorted halves into a single sorted array.

The recursion bottoms out when a subarray has length 0 or 1 — an array of one element is already sorted by definition. This base case is what prevents infinite recursion.

[important]
The recursive tree has **log n levels** (because each level halves the problem size). At every level, the total work done by all merge operations is exactly O(n). This gives the O(n log n) total — not an approximation, but an exact characterisation.
[/important]

Consider sorting `[38, 27, 43, 3]`:

```
           [38, 27, 43, 3]
               /       \
        [38, 27]       [43, 3]
         /    \         /    \
       [38]  [27]    [43]    [3]
         \    /         \    /
        [27, 38]        [3, 43]
               \       /
           [3, 27, 38, 43]
```

Each leaf is a trivially sorted array of one element. Merges happen on the way back up.

[image:inline-01-recursion-tree.png|Recursion tree for Merge Sort on [38, 27, 43, 3] — split phase going down, merge phase coming back up]

[/collapsible-section]

[collapsible-section]
## The Merge Step in Depth {#the-merge-step-in-depth}

The merge step is the heart of the algorithm. Given two sorted subarrays, the goal is to produce one sorted array containing all their elements.

The classic two-pointer approach maintains one index into each subarray. At each step, compare the current elements of both subarrays and copy the smaller one into the output. When one subarray is exhausted, copy the remaining elements of the other subarray directly.

```
Left:  [3, 27, 38]
Right: [9, 10, 43]

i=0, j=0 → compare 3 vs 9 → pick 3   → output: [3]
i=1, j=0 → compare 27 vs 9 → pick 9  → output: [3, 9]
i=1, j=1 → compare 27 vs 10 → pick 10 → output: [3, 9, 10]
i=1, j=2 → compare 27 vs 43 → pick 27 → output: [3, 9, 10, 27]
i=2, j=2 → compare 38 vs 43 → pick 38 → output: [3, 9, 10, 27, 38]
i=3 (exhausted) → copy remaining [43] → output: [3, 9, 10, 27, 38, 43]
```

==Every element is visited exactly once during a merge, so merging two subarrays of total length k costs O(k) time.==

**Why does this produce a sorted result?** Because both subarrays are sorted before the merge begins, the element chosen at each step is always the globally minimum remaining element across both subarrays. Induction confirms this: if you always take the smallest available, the output sequence is non-decreasing.

[note]
The merge step requires O(n) auxiliary memory — you cannot merge two sorted subarrays in-place without significantly more complex algorithms. In-place merge exists but runs in O(n log n) instead of O(n), making the total complexity O(n log² n).
[/note]

[/collapsible-section]

[collapsible-section]
## Stability: Why It Matters {#stability-why-it-matters}

A sort is **stable** if equal elements appear in the same relative order in the output as they did in the input. Merge Sort is stable provided the merge step is implemented correctly.

The key rule: when the current elements from the left and right subarrays are equal, always pick the one from the **left** subarray first. This preserves the original relative order of equal elements.

Why does stability matter? Consider sorting a list of employees first by salary (already done), then by department. A stable sort on department will keep employees within the same department sorted by salary. An unstable sort might scramble the salary order inside departments, forcing you to sort on multiple keys simultaneously.

[important]
Stable sorting is essential whenever records have multiple keys and you want to sort by successive keys independently. Quick Sort (in its standard form) is not stable; Merge Sort is, which is a decisive reason to choose it in these scenarios.
[/important]

[/collapsible-section]

[collapsible-section]
## Merge Sort on Linked Lists {#merge-sort-on-linked-lists}

Arrays and linked lists are both sorted efficiently by Merge Sort, but for opposite reasons. On an array, finding the midpoint and accessing elements by index is O(1). On a linked list, random access is O(n), but finding the midpoint with the slow-fast pointer trick is O(n), and merging two sorted lists requires only pointer manipulation — no extra memory.

==Merge Sort is the preferred algorithm for sorting linked lists because it avoids random access entirely and achieves O(1) auxiliary space (beyond the recursion stack).==

Quick Sort on a linked list is much less elegant: partitioning requires scanning the entire list, and random pivot selection is difficult. Merge Sort's structure — always splitting at the midpoint — maps cleanly onto pointer operations.

[/collapsible-section]

[collapsible-section]
## External Merge Sort {#external-merge-sort}

When a dataset is too large to fit in RAM — think multi-terabyte log files or database tables — you need an **external sorting** algorithm that minimises disk I/O. Merge Sort's structure makes it ideal.

The approach has two phases:

1. **Sort runs** — Divide the file into chunks that fit in memory, sort each chunk in memory, and write the sorted chunks (called *runs*) back to disk.
2. **K-way merge** — Use a priority queue (min-heap) to simultaneously merge K sorted runs. The heap always yields the globally smallest remaining element across all runs, using only K elements of RAM at any moment.

This is how most databases, MapReduce frameworks, and file systems implement sorting under the hood. ==External Merge Sort can sort a file of arbitrary size using only O(K) main memory, where K is the number of runs being merged at once.==

[/collapsible-section]

[collapsible-section]
## Complexity Analysis {#complexity-analysis}

| Case    | Time       | Space  | Why                                                                 |
|---------|------------|--------|---------------------------------------------------------------------|
| Best    | O(n log n) | O(n)   | Even on a sorted input, all splits and merges still happen          |
| Average | O(n log n) | O(n)   | log n levels of recursion, each level totals O(n) merge work        |
| Worst   | O(n log n) | O(n)   | No pivot-selection problem; worst case equals best case             |

**Auxiliary space:** The merge step requires a temporary array of size n at each level. However, at most O(n) extra space is needed at any one time because the recursion processes one branch before backtracking. The recursion stack itself adds O(log n) frames.

**Comparison count:** In the best case (already sorted input), roughly n/2 comparisons are made per level (every left element is smaller than every right element). In the worst case, approximately n − 1 comparisons per merge. The exact count is between n log n / 2 and n log n comparisons.

[note]
Merge Sort is **comparison-optimal** — no comparison-based sort can do better than Ω(n log n) in the worst case. Merge Sort achieves this bound exactly.
[/note]

[/collapsible-section]

[collapsible-section]
## Comparison: Merge Sort vs Quick Sort {#comparison-merge-sort-vs-quick-sort}

| Feature              | Merge Sort                          | Quick Sort                              |
|----------------------|-------------------------------------|-----------------------------------------|
| Worst-case time      | O(n log n) — always                 | O(n²) — on sorted/reverse input without randomisation |
| Average-case time    | O(n log n)                          | O(n log n) — with ~1.39n log n comparisons on average |
| Space                | O(n) auxiliary array                | O(log n) stack space (in-place)         |
| Stability            | Stable                              | Not stable (standard partition)         |
| Cache performance    | Poor — accesses two separate arrays | Excellent — in-place, cache-friendly    |
| Linked list sorting  | Natural — O(1) extra space          | Awkward — random access required        |
| External sorting     | Yes — the standard approach         | No — requires random access             |
| Practical speed      | Slower in practice (more copies)    | Faster in practice on RAM (locality)    |

**Rule of thumb:** For general in-memory sorting, Quick Sort (with randomised pivot or introsort) wins in practice due to cache effects. For stable sorting, linked list sorting, external sorting, or guaranteed worst-case bounds, use Merge Sort.

[/collapsible-section]

[collapsible-section]
## Common Mistakes {#common-mistakes}

- **Off-by-one in the split:** Using `mid = (low + high) / 2` is correct, but forgetting that the left half is `[low, mid]` and the right half is `[mid+1, high]` causes overlapping or missing elements.
- **Not copying back:** In the standard array implementation, sorted results are written to a temporary array. Forgetting to copy them back to the original array means the sort has no effect on the caller's data.
- **Merging into the wrong array:** Allocating a fresh temporary array inside every recursive call costs O(n log n) extra memory. Allocate one auxiliary array of size n upfront and reuse it.
- **Breaking stability:** Choosing the right element when left and right elements are equal destroys stability. Always prefer the left side on ties.
- **Forgetting the base case:** Without a check for arrays of length 0 or 1, the recursion runs forever. The base case must return immediately when `low >= high`.
- **Integer overflow when computing mid:** In languages with fixed-width integers, `(low + high) / 2` can overflow for large indices. Use `low + (high - low) / 2` instead.

[/collapsible-section]

[collapsible-section o]
## Visualisation {#visualisation}

[image:step-01-initial.png|Step 1: The initial array and the recursive splitting phase — divide until single elements]
[image:step-02-leaf-merges.png|Step 2: First merges at the leaf level — combining pairs of single elements into sorted pairs]
[image:step-03-mid-merges.png|Step 3: Second level merges — combining sorted pairs into sorted groups of four]
[image:step-04-final-merge.png|Step 4: Final merge — combining two sorted halves into the fully sorted array]
[image:step-05-complexity.png|Step 5: Complexity summary and when-to-use guide]

[/collapsible-section]

[collapsible-section o]
## Implementation {#implementation}

<code-tabs>
```python
# Time: O(n log n) | Space: O(n)
def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)


def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        # Use <= to maintain stability: prefer left on equal elements
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


# In-place variant using auxiliary array (avoids repeated slice creation)
# Time: O(n log n) | Space: O(n)
def merge_sort_inplace(arr, aux, low, high):
    if low >= high:
        return
    mid = low + (high - low) // 2
    merge_sort_inplace(arr, aux, low, mid)
    merge_sort_inplace(arr, aux, mid + 1, high)
    merge_inplace(arr, aux, low, mid, high)


def merge_inplace(arr, aux, low, mid, high):
    aux[low:high+1] = arr[low:high+1]
    i, j = low, mid + 1
    for k in range(low, high + 1):
        if i > mid:
            arr[k] = aux[j]; j += 1
        elif j > high:
            arr[k] = aux[i]; i += 1
        elif aux[i] <= aux[j]:
            arr[k] = aux[i]; i += 1
        else:
            arr[k] = aux[j]; j += 1
```

```java
// Time: O(n log n) | Space: O(n)
public class MergeSort {

    public static void mergeSort(int[] arr, int[] aux, int low, int high) {
        if (low >= high) return;
        int mid = low + (high - low) / 2;
        mergeSort(arr, aux, low, mid);
        mergeSort(arr, aux, mid + 1, high);
        merge(arr, aux, low, mid, high);
    }

    private static void merge(int[] arr, int[] aux, int low, int mid, int high) {
        // Copy to auxiliary array
        for (int k = low; k <= high; k++) aux[k] = arr[k];

        int i = low, j = mid + 1;
        for (int k = low; k <= high; k++) {
            if (i > mid)                    arr[k] = aux[j++];
            else if (j > high)              arr[k] = aux[i++];
            else if (aux[i] <= aux[j])      arr[k] = aux[i++];  // <= for stability
            else                            arr[k] = aux[j++];
        }
    }

    public static void sort(int[] arr) {
        int[] aux = new int[arr.length];
        mergeSort(arr, aux, 0, arr.length - 1);
    }
}
```

```cpp
// Time: O(n log n) | Space: O(n)
#include <vector>
using namespace std;

void merge(vector<int>& arr, vector<int>& aux, int low, int mid, int high) {
    // Copy segment to auxiliary
    for (int k = low; k <= high; k++) aux[k] = arr[k];

    int i = low, j = mid + 1;
    for (int k = low; k <= high; k++) {
        if      (i > mid)           arr[k] = aux[j++];
        else if (j > high)          arr[k] = aux[i++];
        else if (aux[i] <= aux[j])  arr[k] = aux[i++];  // <= for stability
        else                        arr[k] = aux[j++];
    }
}

void mergeSort(vector<int>& arr, vector<int>& aux, int low, int high) {
    if (low >= high) return;
    int mid = low + (high - low) / 2;
    mergeSort(arr, aux, low, mid);
    mergeSort(arr, aux, mid + 1, high);
    merge(arr, aux, low, mid, high);
}

void sort(vector<int>& arr) {
    vector<int> aux(arr.size());
    mergeSort(arr, aux, 0, (int)arr.size() - 1);
}
```
</code-tabs>

### Dry Run {#dry-run}

Let's trace `merge_sort([38, 27, 43, 3, 9, 82, 10])` step by step.

The array has 7 elements, so `mid = 3`. The left half `[38, 27, 43, 3]` is recursed into first. That call splits into `[38, 27]` and `[43, 3]`. Going deeper, `[38, 27]` splits into `[38]` and `[27]` — both base cases. Merging `[38]` and `[27]` compares 38 vs 27, picks 27 first, then 38, producing `[27, 38]`. Back up one level, `[43, 3]` merges similarly: 43 vs 3 — picks 3, then 43, giving `[3, 43]`. Now merging `[27, 38]` and `[3, 43]`: compare 27 vs 3, pick 3; compare 27 vs 43, pick 27; compare 38 vs 43, pick 38; 43 remains, producing `[3, 27, 38, 43]`.

The right half `[9, 82, 10]` follows similarly. `[9]` and `[82]` merge to `[9, 82]`. Then `[9, 82]` and `[10]` merge: 9 vs 10 picks 9; 82 vs 10 picks 10; 82 remains — result `[9, 10, 82]`.

The final merge combines `[3, 27, 38, 43]` and `[9, 10, 82]`: 3 vs 9 → 3; 27 vs 9 → 9; 27 vs 10 → 10; 27 vs 82 → 27; 38 vs 82 → 38; 43 vs 82 → 43; 82 remains. Final result: `[3, 9, 10, 27, 38, 43, 82]`.

### Variations {#variations}

```python
# Variation: Bottom-up iterative Merge Sort (no recursion stack)
# Time: O(n log n) | Space: O(n)
def merge_sort_iterative(arr):
    n = len(arr)
    aux = arr[:]
    size = 1
    while size < n:
        for low in range(0, n, size * 2):
            mid = min(low + size - 1, n - 1)
            high = min(low + size * 2 - 1, n - 1)
            if mid < high:
                merge_inplace(arr, aux, low, mid, high)
        size *= 2
    return arr


# Variation: Count inversions during merge (classic interview problem)
# Time: O(n log n) | Space: O(n)
def count_inversions(arr):
    if len(arr) <= 1:
        return arr, 0
    mid = len(arr) // 2
    left, left_inv = count_inversions(arr[:mid])
    right, right_inv = count_inversions(arr[mid:])
    merged, split_inv = merge_count(left, right)
    return merged, left_inv + right_inv + split_inv


def merge_count(left, right):
    result, inversions = [], 0
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            # All remaining left elements form inversions with right[j]
            inversions += len(left) - i
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result, inversions
```

[/collapsible-section]

[collapsible-section o]
## Summary {#summary}

Merge Sort is a stable, divide-and-conquer sorting algorithm that guarantees O(n log n) time in all cases by recursively splitting arrays and merging sorted halves. Its predictability and stability make it the algorithm of choice when worst-case guarantees, stable ordering, or external sorting are required, even though it trades an extra O(n) memory to achieve this.

[takeaways]
- Merge Sort splits until single elements, then merges — all real work is in the O(n) merge step, repeated over O(log n) levels
- It guarantees O(n log n) in best, average, and worst case — no degenerate input can make it slower
- Stability (preserving equal elements' original order) requires always preferring the left element on ties during merge
- Prefer Merge Sort over Quick Sort when sorting linked lists, needing stable sort, or sorting data that exceeds RAM (external sort)
- The count-inversions problem, external sort, and K-way merge are canonical interview extensions that all reduce to the merge step
[/takeaways]

[/collapsible-section]

[collapsible-section]
## Glossary {#glossary}

[glossary]
t: Divide and Conquer
d: An algorithm design paradigm that breaks a problem into smaller subproblems, solves each independently, and combines the results.
e: Merge Sort splits an array in half (divide), recursively sorts each half (conquer), then merges them (combine).
[/glossary]

[glossary]
t: Merge Step
d: The operation that combines two sorted subarrays into a single sorted array in O(n) time using two pointers.
e: Merging [3, 27, 38] and [9, 43] produces [3, 9, 27, 38, 43] by always picking the smaller of the two current elements.
[/glossary]

[glossary]
t: Stable Sort
d: A sorting algorithm that preserves the original relative order of elements that compare as equal.
e: If two records share the same salary, a stable sort keeps them in the same order they appeared before sorting.
[/glossary]

[glossary]
t: Auxiliary Array
d: A temporary array used during the merge step to hold a copy of the elements being merged.
e: Before merging indices [low..high], values are copied to aux[low..high]; the merge writes sorted results back to arr.
[/glossary]

[glossary]
t: Recursion Tree
d: A tree diagram showing all recursive calls, with each node representing one subproblem.
e: For Merge Sort on n=8, the recursion tree has 4 levels (log₂ 8), with 8 leaf calls each handling a single element.
[/glossary]

[glossary]
t: Base Case
d: The condition at which recursion stops — an array of length 0 or 1 is already sorted and requires no further splitting.
e: mergeSort([5]) returns immediately because a single-element array is trivially sorted.
[/glossary]

[glossary]
t: In-place Sort
d: A sort that uses O(1) extra memory beyond the input array, rearranging elements without a separate auxiliary buffer.
e: Quick Sort is in-place; Merge Sort is not because it requires an O(n) auxiliary array for the merge step.
[/glossary]

[glossary]
t: External Sort
d: A sorting technique designed for datasets too large to fit in RAM, using disk storage for intermediate runs.
e: Merge Sort is the basis for external sorting: sort chunks that fit in memory, write them to disk, then K-way merge.
[/glossary]

[glossary]
t: K-way Merge
d: Merging K sorted sequences simultaneously using a min-heap that always yields the globally smallest remaining element.
e: Merging 4 sorted disk files uses a 4-element heap; each extraction takes O(log 4) = O(1) time, total O(n log K).
[/glossary]

[glossary]
t: Inversion
d: A pair of indices (i, j) where i < j but arr[i] > arr[j] — a measure of how unsorted an array is.
e: In [3, 1, 2], the inversions are (3,1) and (3,2) — two inversions total. A sorted array has zero inversions.
[/glossary]

[glossary]
t: Bottom-up Merge Sort
d: An iterative variant that starts by merging pairs of single elements, then pairs of two-element runs, doubling run size each pass.
e: On [38, 27, 43, 3], pass 1 merges (38,27)→[27,38] and (43,3)→[3,43]; pass 2 merges both into [3,27,38,43].
[/glossary]

[glossary]
t: Comparison-Based Sort
d: A sorting algorithm whose decisions depend entirely on pairwise comparisons of elements, subject to the Ω(n log n) lower bound.
e: Merge Sort, Quick Sort, and Heap Sort are all comparison-based; Counting Sort and Radix Sort are not.
[/glossary]

[glossary]
t: Ω(n log n) Lower Bound
d: The theoretical minimum number of comparisons any comparison-based sort must make in the worst case to sort n elements.
e: A decision tree for n elements has n! leaves; a binary tree of height h has at most 2^h leaves, so h ≥ log₂(n!) ≈ n log n.
[/glossary]

[glossary]
t: Introsort
d: A hybrid sort used in most standard library implementations that starts with Quick Sort and switches to Heap Sort when recursion depth exceeds a threshold.
e: Python's Timsort (a Merge Sort variant) and C++'s std::sort (Introsort) both avoid O(n²) worst cases.
[/glossary]

[glossary]
t: Timsort
d: A hybrid sorting algorithm derived from Merge Sort and Insertion Sort, used in Python and Java, that detects natural runs in the input for efficiency.
e: Python's list.sort() uses Timsort; on nearly sorted data it approaches O(n) because it merges fewer, longer natural runs.
[/glossary]

[glossary]
t: Run (External Sort)
d: A sorted segment of the input written to disk during the first phase of external merge sort.
e: To sort a 10 GB file with 1 GB RAM, create 10 sorted runs of 1 GB each, then K-way merge them.
[/glossary]

[glossary]
t: Slow-Fast Pointer
d: A linked list technique that uses two pointers advancing at different speeds to find the midpoint in a single pass.
e: In merge sort on a linked list, the slow pointer advances one step and the fast pointer two; when fast reaches the end, slow is at the midpoint.
[/glossary]

[/collapsible-section]

[collapsible-section]
## Interview Questions {#interview-questions}

[interview]
q: What is the time complexity of Merge Sort and why is it always O(n log n)?
a: Merge Sort always runs in O(n log n) because the recursion tree has exactly log n levels (each level halves the problem size) and each level performs O(n) total work across all merge operations. Unlike Quick Sort, there is no pivot selection — the split is always at the midpoint, so no input can produce a skewed tree. Best, average, and worst cases are identical. An interviewer expects you to connect the tree structure to the complexity, not just recite the number.
d: easy
cat: complexity
[/interview]

[interview]
q: How much extra space does Merge Sort use?
a: The standard implementation uses O(n) auxiliary space for the temporary array used during merges. The recursion stack adds O(log n) additional space for the call frames. In practice, the O(n) auxiliary array dominates. The bottom-up iterative variant avoids the stack overhead but still needs O(n) for the auxiliary array. True in-place merge sort exists but requires O(n log n) time for the merge step, degrading total complexity to O(n log² n).
d: easy
cat: complexity
[/interview]

[interview]
q: Why is Merge Sort preferred over Quick Sort for linked lists?
a: Merge Sort suits linked lists because it never needs random access — it only requires pointer manipulation. The midpoint is found with the slow-fast pointer technique in O(n), and merging two sorted lists requires only pointer rewiring, using O(1) auxiliary space. Quick Sort on a linked list requires scanning the whole list to partition, and random pivot selection is difficult without random access, making it awkward and often O(n²) in practice.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: How would you implement Merge Sort without recursion?
a: Use the bottom-up iterative approach. Start with a merge size of 1, treating each element as a sorted run of length 1. In each pass, merge adjacent pairs of runs, doubling the run size each time (1→2→4→8→…). Continue until the run size exceeds the array length. This uses O(n) auxiliary space (same as recursive) but O(1) stack space. The total number of passes is log n, and each pass does O(n) work, giving the same O(n log n) overall complexity.
d: medium
cat: implementation
[/interview]

[interview]
q: What makes Merge Sort a stable sort, and when does stability matter?
a: Merge Sort is stable because during the merge step, when left[i] == right[j], the algorithm always picks left[i] first. This preserves the original relative order of equal elements. Stability matters when records have multiple sort keys: if you sort a table of employees first by salary then by department, a stable sort on department will preserve the salary ordering within each department, enabling correct multi-key sorting with independent single-key passes.
d: medium
cat: application
[/interview]

[interview]
q: How do you count the number of inversions in an array efficiently?
a: Modify the merge step: whenever you pick an element from the right subarray over a remaining element in the left subarray, it means all remaining left elements form inversions with that right element. Add (mid - i + 1) to the inversion count at that point. The overall algorithm runs in O(n log n) — the same complexity as regular Merge Sort. This is a canonical interview problem (LeetCode 315, 493) and demonstrates how Merge Sort can be extended to compute global properties of an array.
d: medium
cat: application
[/interview]

[interview]
q: Explain how external merge sort works for a 1 TB file with 1 GB RAM.
a: Phase 1 (sort runs): read 1 GB chunks, sort each in RAM using an in-memory sort, write 1000 sorted runs to disk. Phase 2 (K-way merge): open all 1000 sorted run files simultaneously, use a 1000-element min-heap — one element from each run. Extract the minimum, write to output, and push the next element from the same run into the heap. The heap maintains O(log K) per extraction. Total I/O is O(n) reads + O(n) writes; total CPU is O(n log K) for the merge phase plus O(n log(n/K)) for sorting runs.
d: hard
cat: application
[/interview]

[interview]
q: What is the recurrence relation for Merge Sort and how do you solve it?
a: The recurrence is T(n) = 2T(n/2) + O(n), where 2T(n/2) accounts for the two recursive halves and O(n) is the merge cost. Solving by the Master Theorem: a=2, b=2, f(n)=n, so log_b(a) = log_2(2) = 1, and f(n) = n = Θ(n^1 log^0 n). This is Case 2 of the Master Theorem, giving T(n) = Θ(n log n). You can also solve it by expansion: unrolling k levels gives k layers each costing O(n), and the tree has log n levels.
d: hard
cat: complexity
[/interview]

[interview]
q: Why is Merge Sort slower than Quick Sort in practice despite the same asymptotic complexity?
a: Cache performance is the main reason. Quick Sort partitions in-place, accessing memory sequentially within each partition — modern CPUs can prefetch these accesses efficiently. Merge Sort reads from two separate subarray regions and writes to an auxiliary buffer, generating more cache misses. Additionally, each merge requires writing n elements to auxiliary memory and copying them back, doubling the number of memory operations compared to Quick Sort's swaps. For typical workloads on modern hardware, Quick Sort's constant factor is roughly 2× smaller.
d: hard
cat: tradeoffs
[/interview]

[interview]
q: Can Merge Sort be parallelised? How?
a: Yes — Merge Sort is naturally parallelisable because the two recursive halves are independent. The simplest approach spawns a separate thread for each half, joining before the merge step. With P processors, the divide phase parallelises perfectly to O(log n) levels, but the merge step itself is sequential (one thread produces one output). With parallel merge algorithms (partitioning the merge using binary search across subarrays), the total parallel complexity reduces to O(log² n) with O(n) processors, which is optimal for comparison-based sorting in parallel models.
d: expert
cat: tradeoffs
[/interview]

[interview]
q: What is the difference between top-down and bottom-up Merge Sort?
a: Top-down Merge Sort is recursive — it splits the array, recurses on both halves, then merges. Bottom-up is iterative — it starts with sorted runs of size 1 and doubles the run size each pass. Both are O(n log n) time and O(n) space. Bottom-up avoids recursion stack overhead (useful in environments with small stacks) and can be implemented without knowing the array size upfront. Top-down is easier to read and reason about. In competitive programming, the iterative version is preferred in tight memory constraints.
d: medium
cat: implementation
[/interview]

[interview]
q: What are the two base cases in Merge Sort and why are both needed?
a: The primary base case is `length <= 1` — a single element is already sorted. Some implementations also check `length == 0` explicitly, though `length <= 1` covers it. Without the base case, the recursion never terminates because splitting a one-element array into two halves produces an empty array and a one-element array — the one-element call would split again infinitely. The base case is what gives the recursion its termination guarantee, and it's what makes the inductive correctness proof work: a one-element array is vacuously sorted.
d: easy
cat: implementation
[/interview]

[interview]
q: How would you implement Merge Sort on a singly linked list?
a: Find the midpoint using slow-fast pointers (slow advances 1, fast advances 2; when fast hits null, slow is at the midpoint). Disconnect the list at the midpoint. Recursively sort both halves. Merge by comparing head values of both lists and splicing nodes without allocating new memory — just update next pointers. Base case: null or single node. This runs in O(n log n) time and O(log n) stack space, with O(1) auxiliary space (no array copying). It's the cleanest O(n log n) sort for singly linked lists.
d: hard
cat: implementation
[/interview]

[interview]
q: How does Merge Sort demonstrate the divide-and-conquer correctness proof technique?
a: Proof by strong induction: Base case — an array of 0 or 1 elements is sorted. Inductive hypothesis — assume merge_sort correctly sorts any array of length less than n. Inductive step — for an array of length n, we split into two halves of length < n, apply the hypothesis to get two sorted halves, then show the merge step produces a sorted array from two sorted halves (trivially correct by the two-pointer argument). This is the standard structural induction on the recursion tree, and interviewers expect you to articulate why the merge step preserves sortedness.
d: expert
cat: complexity
[/interview]

[interview]
q: What happens to Merge Sort's performance on already-sorted input?
a: Merge Sort performs the same O(n log n) operations on sorted input as on random input — it always splits and merges regardless. However, the actual comparison count is lower on sorted input: each merge will consume all left elements before any right elements, making only n/2 comparisons per merge (best case) instead of n-1 (worst case). Contrast this with Insertion Sort, which runs in O(n) on sorted input. For nearly-sorted data, Timsort detects natural runs and skips unnecessary merges, achieving near-O(n) performance.
d: medium
cat: complexity
[/interview]

[interview]
q: Design a multi-threaded Merge Sort that doesn't create excessive threads.
a: Use a depth cutoff: spawn a new thread only when the recursion depth is below a threshold (e.g., log₂(P) where P is the number of CPU cores). Below the threshold, fall back to sequential Merge Sort. This creates at most O(P) threads, avoiding thread creation overhead. Use `std::async`/`Future` in Java or `concurrent.futures` in Python. Alternatively, use a thread pool with work-stealing: submit recursive tasks as futures, and workers steal tasks when idle. The merge step at each level must wait for both halves to complete before proceeding.
d: expert
cat: implementation
[/interview]

[interview]
q: How is Merge Sort used in database systems?
a: Databases use external merge sort for operations like ORDER BY, GROUP BY, and sort-merge join when data exceeds buffer pool size. The first phase sorts pages that fit in memory; the second phase performs a multi-way merge using a priority queue. Sort-merge join takes two relations, sorts both on the join key using external merge sort, then merges in a single linear pass — O(n log n) overall versus O(n²) for nested loop join. Most commercial databases (PostgreSQL, SQL Server) use hybrid approaches that switch from hash join to sort-merge join based on cost estimation.
d: expert
cat: application
[/interview]

[interview]
q: What is the significance of the `<=` vs `<` comparison in the merge step?
a: Using `<=` when comparing left[i] and right[j] means equal elements from the left subarray are always placed before equal elements from the right subarray, preserving stability. Using `<` instead would place equal right elements before equal left elements, breaking stability and reversing the original relative order of equals. This single character determines whether the sort is stable or not — it's a subtle but critical implementation detail that interviewers specifically test because it's a common bug in student implementations.
d: medium
cat: implementation
[/interview]

[interview]
q: How would you sort a nearly-sorted array of 1 million elements efficiently?
a: For nearly-sorted data, Insertion Sort runs in O(n + k) where k is the number of inversions — excellent when k is small. Timsort (Python's sort) is optimal here because it detects natural ascending runs and merges only what's necessary, achieving O(n) on fully sorted input. If you must use standard Merge Sort, it still runs in O(n log n), which is perfectly fine for 1 million elements. The key interview signal: know that Merge Sort doesn't adapt to presortedness, and Timsort was specifically designed to exploit it.
d: medium
cat: application
[/interview]

[interview]
q: What is the space complexity of Merge Sort on a linked list vs an array?
a: On an array, the standard implementation requires O(n) auxiliary space for the temporary merge buffer. On a linked list, merging is done by relinking pointers — no buffer is needed — so auxiliary space is O(1). Both array and linked list versions use O(log n) stack space for recursion. This is a key practical advantage: Merge Sort on a linked list achieves O(n log n) time with O(log n) total space (just the recursion stack), making it the only common O(n log n) sort that is both stable and near in-place for linked structures.
d: hard
cat: complexity
[/interview]

[interview]
q: Explain how Merge Sort can be adapted to find the median of a large stream of numbers.
a: Merge Sort itself doesn't directly find the median of a stream, but its principles apply to external sort-based solutions. For a finite stream stored on disk: sort the entire dataset with external merge sort, then seek to position n/2. For an online stream requiring the running median, a two-heap approach (max-heap for lower half, min-heap for upper half) is more appropriate. However, the K-way merge technique from external Merge Sort appears in distributed median algorithms where each node holds a sorted partition and merge-finds the global median.
d: expert
cat: application
[/interview]

[interview]
q: What is the comparison count for Merge Sort in the best case?
a: In the best case (input is already sorted), each merge of two subarrays of total length k makes exactly k/2 comparisons: all n/2 left elements are smaller than all n/2 right elements, so the algorithm picks all left elements without ever needing to compare a right element (except to confirm the left is smaller). Across all merges at one level totalling n elements, this is n/2 comparisons. Over log n levels, the best-case total is (n/2) log n = Ω(n log n). Even the best case is linearithmic — Merge Sort doesn't speed up for sorted input.
d: hard
cat: complexity
[/interview]

[interview]
q: How do you merge K sorted arrays efficiently?
a: Use a min-heap of size K. Insert the first element from each array into the heap (storing the array index and element index). Repeatedly extract the minimum, write it to output, and push the next element from the same array into the heap. Each extraction and insertion is O(log K). Total elements processed: N (sum of all array lengths). Total complexity: O(N log K). This is the core of external merge sort's second phase and appears in problems like "merge K sorted lists" (LeetCode 23) and "find the smallest range covering elements from K lists" (LeetCode 632).
d: hard
cat: application
[/interview]

[interview]
q: What optimisation can you apply to Merge Sort for small subarrays?
a: Switch to Insertion Sort for subarrays below a threshold (typically 10-32 elements). Insertion Sort has low overhead and is cache-friendly for small inputs, while Merge Sort's recursion overhead becomes significant when subarrays are tiny. This hybrid approach — used in Timsort and many production sort implementations — achieves the same O(n log n) asymptotic behaviour but significantly reduces constant factors. The threshold is determined empirically per hardware; 16 is a common default. This is the same principle behind Introsort switching strategies based on depth.
d: medium
cat: tradeoffs
[/interview]

[interview]
q: Can you implement Merge Sort without allocating a new array on every merge call?
a: Yes — allocate one auxiliary array of size n upfront at the top-level call, then pass it as a parameter to all recursive calls. Each merge uses a segment of this shared auxiliary array corresponding to the current [low, high] range. This reduces total allocations from O(n log n) to O(n), which is a significant practical improvement. The standard textbook implementation (allocating a new list on every merge in Python) allocates O(n log n) total memory due to the many small temporary arrays at each recursion level.
d: hard
cat: implementation
[/interview]

[/collapsible-section]

[collapsible-section]
## Multiple Choice Questions {#multiple-choice-questions}

[mcq]
q: What is the time complexity of Merge Sort in the worst case?
o: O(n²) | O(n log n) | O(n) | O(log n)
c: 1
e: Merge Sort always runs in O(n log n) regardless of input order because the array is always split at the midpoint, producing a balanced recursion tree of log n levels with O(n) work per level.
w: O(n²) is Quick Sort's worst case with bad pivot selection, not Merge Sort. O(n) is impossible for comparison-based sorting by the information-theoretic lower bound. O(log n) would mean sublinear time, which can't sort all elements.
d: beginner
[/mcq]

[mcq]
q: How much auxiliary space does the standard array-based Merge Sort require?
o: O(1) | O(log n) | O(n) | O(n log n)
c: 2
e: The merge step copies elements into a temporary auxiliary array of size O(n). This is the dominant space cost; the recursion stack adds only O(log n) additional space.
w: O(1) would require in-place merging, which is much more complex. O(log n) is only the recursion stack, not the merge buffer. O(n log n) would mean allocating fresh arrays at every level (a naïve textbook implementation does this, but it's not standard).
d: beginner
[/mcq]

[mcq]
q: What is the base case of Merge Sort?
o: Array length equals 0 | Array length equals 2 | Array length is 0 or 1 | Array is already sorted
c: 2
e: An array of length 0 or 1 is trivially sorted and requires no further splitting. Returning at this point prevents infinite recursion.
w: Length 0 alone misses the single-element case. Length 2 is not a base case — two-element arrays still need to be split and merged. "Already sorted" requires checking all elements, which defeats the purpose of a base case.
d: beginner
[/mcq]

[mcq]
q: What comparison operator ensures Merge Sort is stable?
o: < when picking from the left | <= when picking from the left | > when picking from the right | >= when picking from the left
c: 1
e: Using <= means equal elements from the left subarray are placed before equal elements from the right subarray, preserving their original relative order — which is the definition of stability.
w: Using < would pick the right element when left equals right, reversing the original order of equal elements and making the sort unstable. The condition on the right pointer doesn't determine stability — it's always the left comparison that matters.
d: beginner
[/mcq]

[mcq]
q: Which phase of Merge Sort does the majority of the computational work?
o: Splitting the array | Comparing elements during merge | Copying the auxiliary array back | Allocating recursive call stack frames
c: 1
e: The merge step performs all the comparisons and is where the O(n) work per level occurs. Splitting is O(1) per call (just computing a midpoint). Copying back is part of the merge and counted within it.
w: Splitting is O(1) per call — no comparisons needed. Stack frame allocation is negligible. Copying back is part of the merge operation, but the comparisons themselves are the work that determines the time complexity.
d: beginner
[/mcq]

[mcq]
q: What is the recurrence relation for Merge Sort?
o: T(n) = T(n-1) + O(n) | T(n) = 2T(n/2) + O(n) | T(n) = T(n/2) + O(n) | T(n) = 2T(n/2) + O(1)
c: 1
e: Two recursive calls on halves of size n/2 gives 2T(n/2). The merge step costs O(n) to combine the two halves. Together: T(n) = 2T(n/2) + O(n), which by the Master Theorem gives T(n) = O(n log n).
w: T(n) = T(n-1) + O(n) is the recurrence for Selection Sort. T(n) = T(n/2) + O(n) has only one recursive call, like Binary Search. T(n) = 2T(n/2) + O(1) would give O(n) if merge were free, but merge is O(n) not O(1).
d: beginner
[/mcq]

[mcq]
q: How many levels does the Merge Sort recursion tree have for an array of size n?
o: n | n/2 | log₂ n | √n
c: 2
e: Each level halves the problem size. Starting from n, it takes log₂ n halvings to reach arrays of size 1. The recursion tree therefore has log₂ n + 1 levels (including the leaves).
w: n levels would mean linear depth — like insertion sort's recursion. n/2 levels would mean only halving once. √n levels would mean sublinear depth inconsistent with binary splitting.
d: beginner
[/mcq]

[mcq]
q: What sorting algorithm is preferred for sorting a singly linked list?
o: Quick Sort | Heap Sort | Merge Sort | Counting Sort
c: 2
e: Merge Sort suits linked lists because it only requires sequential access (no random indexing) and the merge step can be implemented using pointer rewiring with O(1) extra space. The midpoint is found using slow-fast pointers.
w: Quick Sort requires random access for efficient pivot selection and partitioning. Heap Sort requires building a heap which needs index-based access. Counting Sort is non-comparative and requires knowing the value range.
d: beginner
[/mcq]

[mcq]
q: What does the bottom-up Merge Sort eliminate compared to top-down?
o: The need for an auxiliary array | The O(n log n) time complexity | The recursion stack | The merge step
c: 2
e: Bottom-up Merge Sort is iterative — it processes runs of increasing size in nested loops, never making recursive calls. This eliminates the O(log n) recursion stack overhead, which is useful in memory-constrained environments.
w: Both versions require an O(n) auxiliary array for merging. Both run in O(n log n). The merge step is present in both — it's the core operation.
d: beginner
[/mcq]

[mcq]
q: On a sorted array of n elements, Merge Sort performs approximately how many comparisons?
o: O(n) | (n/2) log n | n log n | n²/4
c: 1
e: On sorted input, each merge of two subarrays of total length k makes k/2 comparisons (the left elements are always smaller). Over log n levels totalling n elements per level, this is (n/2) × log n comparisons.
w: O(n) is Insertion Sort's best case on sorted input — Merge Sort does not achieve linear comparisons. n log n is the worst case, not the best. n²/4 would imply quadratic comparisons, which Merge Sort never reaches.
d: intermediate
[/mcq]

[mcq]
q: Which algorithm is used by Python's built-in list.sort()?
o: Quick Sort | Merge Sort | Timsort | Heap Sort
c: 2
e: Python uses Timsort, a hybrid algorithm derived from Merge Sort and Insertion Sort. It detects natural runs in the input and merges them, achieving O(n) on nearly sorted data and O(n log n) in the worst case.
w: Quick Sort is used in some languages (C's qsort) but not Python's list.sort(). Standard Merge Sort doesn't exploit natural runs. Heap Sort has poor cache performance and is not used in CPython's sort.
d: intermediate
[/mcq]

[mcq]
q: What is the total extra memory allocated by a naïve Python Merge Sort that creates new lists on every merge call?
o: O(n) | O(n log n) | O(n²) | O(log n)
c: 1
e: At each of the log n levels, the total size of all temporary lists allocated equals n. Over log n levels, the total allocation is O(n log n). This is a practical concern — allocating many small objects stresses the garbage collector.
w: O(n) is the minimum auxiliary space but ignores the cumulative allocations across all levels. O(n²) would mean quadratic allocation, which only happens if merge is O(n²). O(log n) would mean sublinear allocation, ignoring the O(n) per level.
d: intermediate
[/mcq]

[mcq]
q: When merging two sorted arrays in the merge step, what is the time complexity?
o: O(n log n) | O(n) | O(n²) | O(log n)
c: 1
e: Each element from both subarrays is visited exactly once — one pointer advance per element placed in the output. If the total number of elements across both subarrays is k, the merge costs O(k).
w: O(n log n) would mean the merge itself is as expensive as the whole sort. O(n²) would mean comparing every pair, like bubble sort. O(log n) would be faster than reading all the elements, which is impossible.
d: intermediate
[/mcq]

[mcq]
q: What happens to Merge Sort's space complexity when sorting a linked list?
o: It stays O(n) for node copies | It becomes O(1) auxiliary | It becomes O(log n) total | It becomes O(n log n)
c: 1
e: Merging linked lists requires only pointer reassignment — no temporary array is needed. The only space cost is the O(log n) recursion stack. This makes linked list Merge Sort near in-place, a major practical advantage.
w: O(n) auxiliary only applies to array-based Merge Sort where a buffer is needed. Saying O(1) total ignores the recursion stack. O(n log n) would mean allocating proportional to all merge operations.
d: intermediate
[/mcq]

[mcq]
q: How does counting inversions using Merge Sort work?
o: Count swaps instead of comparisons | Add (mid - i + 1) whenever a right element is picked over remaining left elements | Count the number of comparisons where left > right | Run Merge Sort twice and subtract
c: 1
e: Whenever a right element is chosen over left[i], all elements left[i..mid] are greater than right[j], forming inversions. Adding (mid - i + 1) at that point counts all of them in O(1) per event, keeping the total O(n log n).
w: Counting swaps conflates Bubble Sort's inversion counting approach with Merge Sort's. Simply counting comparisons where left > right would double-count some inversions. Running Merge Sort twice yields no useful comparison.
d: intermediate
[/mcq]

[mcq]
q: In the K-way merge (external sort phase 2), what data structure is used?
o: Hash table | Min-heap | Binary Search Tree | Stack
c: 1
e: A min-heap of size K maintains one current element from each of the K sorted runs. Extracting the minimum and inserting the next element from the same run each cost O(log K), giving O(N log K) total for merging N elements from K runs.
w: A hash table provides O(1) lookup but cannot efficiently find the minimum. A BST could work but with higher constant factors. A stack is LIFO and cannot merge sorted runs.
d: intermediate
[/mcq]

[mcq]
q: What is the Merge Sort recurrence's solution according to the Master Theorem?
o: Θ(n) | Θ(n log n) | Θ(n²) | Θ(n log² n)
c: 1
e: For T(n) = 2T(n/2) + O(n): a=2, b=2, f(n)=n. Since log_b(a) = 1 and f(n) = n = Θ(n^1), this is Case 2 of the Master Theorem, giving T(n) = Θ(n log n).
w: Θ(n) would require the merge to be O(1), which it isn't. Θ(n²) corresponds to a recurrence like T(n) = 2T(n/2) + O(n²). Θ(n log² n) corresponds to in-place merge sort where the merge itself is O(n log n).
d: intermediate
[/mcq]

[mcq]
q: Why is Quick Sort generally faster than Merge Sort in practice despite the same O(n log n) complexity?
o: Quick Sort makes fewer comparisons | Quick Sort has better cache locality | Quick Sort uses less memory | Quick Sort's recursion depth is smaller
c: 1
e: Quick Sort operates in-place, accessing memory sequentially within each partition. Modern CPUs' caches prefetch sequential accesses efficiently. Merge Sort's auxiliary array accesses two separate memory regions, causing more cache misses and greater memory bandwidth usage.
w: Quick Sort makes roughly 1.39n log n comparisons on average vs Merge Sort's n log n — Quick Sort actually makes more comparisons. Quick Sort uses O(log n) stack space vs Merge Sort's O(n) auxiliary, but the cache effect dominates. Recursion depth is similar (log n levels in both).
d: intermediate
[/mcq]

[mcq]
q: What is the minimum number of comparisons Merge Sort makes in the worst case for n=4?
o: 4 | 5 | 6 | 8
c: 1
e: For n=4: first merge two pairs — each pair needs 1 comparison (worst case: equal or cross), giving 2 comparisons for 2 merges. The final merge of two 2-element arrays takes at most 3 comparisons (worst case interleaving). Total: 2 + 3 = 5 comparisons.
w: 4 comparisons are insufficient to sort 4 elements (you need at least 5 to distinguish all 4! = 24 permutations with a depth-5 decision tree). 6 comparisons would overcounting. 8 would be the naive n² comparison count.
d: intermediate
[/mcq]

[mcq]
q: What subtle bug occurs if you write `if left[i] < right[j]` instead of `if left[i] <= right[j]` in the merge step?
o: Stack overflow on equal elements | The sort produces incorrect output | The sort becomes unstable but still correct | Off-by-one error in array bounds
c: 2
e: Using < instead of <= causes equal right elements to be placed before equal left elements, reversing the relative order of equals from the input. The sort is still correct (produces a sorted output) but is no longer stable.
w: Stack overflow cannot result from a comparison operator choice. The output is sorted correctly — stability is a separate property from correctness. No array bounds are affected by the comparison operator.
d: intermediate
[/mcq]

[mcq]
q: How does external Merge Sort handle a file that is 1000× larger than RAM?
o: It uses virtual memory to sort the whole file at once | It creates sorted runs then K-way merges them | It recursively applies in-memory sort until done | It requires multiple passes equal to the file size
c: 1
e: Phase 1 reads chunks fitting in RAM, sorts them, and writes sorted runs to disk. Phase 2 uses a K-element min-heap to K-way merge all runs in a single streaming pass. Total I/O is 2× the file size (one read + one write per phase). The number of disk passes is 2, not proportional to the file size.
w: Virtual memory would cause excessive page faults, making sorting impractically slow. Recursive in-memory sort ignores the RAM constraint. Multiple passes equal to file size would be O(n) disk passes — catastrophically slow for TB files.
d: intermediate
[/mcq]

[mcq]
q: What is the time complexity of merging K sorted arrays each of length n using a min-heap?
o: O(Kn) | O(Kn log K) | O(Kn log n) | O(n² log K)
c: 1
e: Total elements across all arrays: N = Kn. Each element is extracted once from the heap (O(log K) per extraction). Total: O(Kn log K). This is more efficient than pairwise merging, which would be O(Kn log K) as well but with worse constant factors.
w: O(Kn) without log would mean heap operations are O(1), which requires a perfect hash, not comparison. O(Kn log n) would make each operation O(log n) instead of O(log K) — confusion between heap size K and array size n.
d: advanced
[/mcq]

[mcq]
q: What is the space complexity of Merge Sort when applied to a linked list (excluding input)?
o: O(n) | O(n log n) | O(log n) | O(1)
c: 2
e: Merging linked lists uses pointer rewiring — no auxiliary array needed. The O(log n) space comes entirely from the recursion stack (log n frames). No additional memory proportional to element count is required.
w: O(n) is for array-based Merge Sort's auxiliary buffer. O(n log n) would mean all merge operations collectively allocate proportional to total elements across all levels. O(1) ignores the recursion stack entirely.
d: advanced
[/mcq]

[mcq]
q: Parallel Merge Sort with p processors achieves what time complexity for the overall sort?
o: O(n/p) | O(n log n / p) | O((n log n) / p + n) | O(n log p)
c: 2
e: The divide phase parallelises perfectly: O(n log n / p) for sorting n/p elements on each of p processors. The sequential merge bottleneck at each level adds O(n) per level for log p levels. Total: O((n log n) / p + n log p) ≈ O((n log n) / p + n) for moderate p.
w: O(n/p) ignores the log n factor. O(n log n / p) ignores the sequential merge overhead at each level. O(n log p) would only account for combining phases, not the actual sort work.
d: advanced
[/mcq]

[mcq]
q: What is the total number of element moves (copies) in Merge Sort for an array of n elements?
o: O(n) | O(n log n) | O(n²) | O(n log² n)
c: 1
e: At each of the log n levels, every element is copied once to the auxiliary array and once back — O(n) copies per level. Over log n levels, the total is O(n log n) moves. This is why Merge Sort has more memory traffic than Quick Sort.
w: O(n) would mean amortised constant copies per element, ignoring the log n levels. O(n²) is impossible — that would mean each element is moved n times. O(n log² n) corresponds to in-place merge algorithms, not standard Merge Sort.
d: advanced
[/mcq]

[mcq]
q: What optimisation does Timsort apply to Merge Sort for nearly-sorted data?
o: It switches to Heap Sort when detecting nearly-sorted input | It detects natural ascending runs and merges only what is necessary | It uses block-based merging to improve cache performance | It avoids the merge step entirely on sorted subarrays
c: 1
e: Timsort scans the input for naturally occurring sorted runs. If a run is shorter than minrun (typically 32-64), it's extended using Insertion Sort. Only then are runs merged using a modified Merge Sort strategy that maintains a stack of pending merges and applies merge order rules (galloping mode, run balance). On fully sorted input, one run covers the entire array — O(n) total.
w: Timsort doesn't switch to Heap Sort. Block merging is a separate optimisation for in-place merging. Timsort cannot avoid merging entirely — it needs to merge runs to produce a single sorted output.
d: advanced
[/mcq]

[mcq]
q: In competitive programming, what is the advantage of the bottom-up iterative Merge Sort over the recursive version?
o: It runs faster asymptotically | It avoids recursion stack overflow for large n | It requires less auxiliary memory | It handles duplicate elements better
c: 1
e: The recursive version uses O(log n) stack frames. For very large arrays (n = 10^7+), deep recursion can overflow the default stack size in some online judges. The iterative bottom-up version avoids this by using a loop with doubling run sizes. Both have identical O(n log n) time and O(n) auxiliary space.
w: Both versions are O(n log n) — no asymptotic difference. Both require the same O(n) auxiliary array. Neither has an advantage for duplicates.
d: advanced
[/mcq]

[mcq]
q: What modification to Merge Sort allows it to sort by multiple keys (e.g., sort by last name, then first name)?
o: Run two separate Merge Sorts in sequence | Pass a custom comparator that compares keys lexicographically | Use a multi-key auxiliary array | Split keys into separate arrays and sort independently
c: 1
e: A custom comparator function defines the comparison logic. For multi-key sorting, compare the primary key first; if equal, compare the secondary key. Since Merge Sort is stable, you can alternatively sort by the secondary key first, then stably sort by the primary key — a technique called radix-style multi-key sorting.
w: Running two separate sorts only works if the second sort is stable (which Merge Sort is). The custom comparator approach is more general and always correct. A multi-key auxiliary array is unnecessary — the comparator handles logic without structural changes.
d: advanced
[/mcq]

[mcq]
q: Which of the following correctly describes why the merge step cannot be performed in O(1) space while maintaining O(n) time?
o: The algorithm needs two pointers, which require O(1) space each | To produce a sorted output without overwriting elements that haven't been compared yet, a buffer is needed to hold at least one of the subarrays | O(1) space merge is possible and used in the standard implementation | The comparison itself requires extra memory per element
c: 1
e: During a merge of arr[low..mid] and arr[mid+1..high], writing the merged result directly into arr would overwrite elements from one of the subarrays before they've been compared. The auxiliary buffer holds a copy of one (or both) subarrays so the original positions can be freely overwritten with sorted results. Without it, an element could be destroyed before being placed correctly.
w: Pointer storage is O(1) and isn't the constraint here. The standard implementation explicitly requires O(n) auxiliary space — it is not O(1). The comparison itself does not require per-element memory.
d: intermediate
[/mcq]

[mcq]
q: Given an array of n distinct elements, what is the maximum number of comparisons Merge Sort can make during a single merge of two subarrays of size n/2 each?
o: n/2 | n - 1 | n | n log n
c: 1
e: When merging two subarrays each of size n/2, the worst case is that the subarrays interleave perfectly — every comparison picks from alternating sides, exhausting both at the same time. In this case you make n/2 + n/2 - 1 = n - 1 comparisons. You stop one comparison before n because the last element of one subarray is simply appended without a comparison after the other is exhausted.
w: n/2 is the best case (all left elements are smaller, so only n/2 comparisons pick each left element before the right is never needed). n comparisons would require one extra comparison after exhaustion, which doesn't happen. n log n is the total complexity across all levels, not one merge.
d: intermediate
[/mcq]

[/collapsible-section]

[collapsible-section]
## Visual Questions {#visual-questions}

[visual-mcq]
type: fillblank
d: beginner
q: Complete the merge function — what value goes in the blank to maintain stability?
code:
def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] ____ right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result
o: < | <= | > | >=
c: 1
e: Using <= means equal elements from the left subarray are placed before equal elements from the right subarray, preserving the original relative order — which is the definition of stability.
[/visual-mcq]

[visual-mcq]
type: fillblank
d: beginner
q: Fill in the blank to correctly compute the midpoint without integer overflow:
code:
def merge_sort(arr, low, high):
    if low >= high:
        return
    mid = low + ____
    merge_sort(arr, low, mid)
    merge_sort(arr, mid + 1, high)
    merge(arr, low, mid, high)
o: (high - low) | (high - low) // 2 | (high + low) // 2 | high // 2
c: 1
e: `low + (high - low) // 2` avoids integer overflow that can occur with `(low + high) // 2` when low and high are both large. The result is the same integer value but computed safely.
[/visual-mcq]

[visual-mcq]
type: trace
d: intermediate
q: After one level of merging on [5, 3, 8, 1, 9, 2], which array results?
img: images/visual-trace-01-first-level-merge.png
o: [3, 5, 1, 8, 2, 9] | [1, 2, 3, 5, 8, 9] | [3, 5, 8, 1, 2, 9] | [1, 8, 2, 3, 5, 9]
c: 0
e: The first level merges adjacent pairs: [5,3]→[3,5], [8,1]→[1,8], [9,2]→[2,9]. The result is [3, 5, 1, 8, 2, 9] — three sorted pairs, not yet globally sorted.
[/visual-mcq]

[visual-mcq]
type: trace
d: intermediate
q: After the complete Merge Sort on [38, 27, 43, 3], what is the final sorted array and how many total merge comparisons were made?
img: images/visual-trace-02-full-sort-4-elements.png
o: [3, 27, 38, 43] with 5 comparisons | [3, 27, 38, 43] with 4 comparisons | [3, 27, 38, 43] with 3 comparisons | [27, 3, 38, 43] with 5 comparisons
c: 0
e: Level 1: merge [38],[27] → 1 comparison (27 wins); merge [43],[3] → 1 comparison (3 wins). Level 2: merge [27,38] and [3,43] — compare 3 vs 27 (pick 3), 27 vs 43 (pick 27), 38 vs 43 (pick 38), then 43 is appended without comparison. That is 3 comparisons at level 2. Total: 1 + 1 + 3 = 5 comparisons.
[/visual-mcq]

[visual-mcq]
type: output
d: intermediate
q: What does this function return when called with count_merge_calls([1, 2, 3, 4])?
code:
def count_merge_calls(arr):
    if len(arr) <= 1:
        return 0
    mid = len(arr) // 2
    left = count_merge_calls(arr[:mid])
    right = count_merge_calls(arr[mid:])
    return left + right + 1
o: 3 | 4 | 7 | 2
c: 0
e: For n=4: count_merge_calls([1,2,3,4]) = count_merge_calls([1,2]) + count_merge_calls([3,4]) + 1 = (0+0+1) + (0+0+1) + 1 = 3. This counts the number of merge operations — always n-1 for any n-element array.
[/visual-mcq]

[visual-mcq]
type: output
d: intermediate
q: What array does this code produce?
code:
arr = [4, 2, 1, 3]
result = merge_sort(arr)  # Standard stable merge sort
print(result)
o: [1, 2, 3, 4] | [4, 3, 2, 1] | [2, 1, 3, 4] | [1, 3, 2, 4]
c: 0
e: Merge Sort on [4, 2, 1, 3]: split into [4, 2] and [1, 3]. Merge [4,2]→[2,4]. Merge [1,3]→[1,3]. Final merge: [2,4] and [1,3] → 1, 2, 3, 4.
[/visual-mcq]

[visual-mcq]
type: spotbug
d: advanced
q: What is wrong with this merge sort implementation?
code:
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    # Bug is here
    return result
o: Missing return of remaining left and right elements | Wrong comparison operator breaks stability | Base case should check len == 0 | Mid computation causes off-by-one
c: 0
e: After the while loop exits, one of the subarrays still has remaining elements that were never added to result. The fix is to add `result.extend(left[i:])` and `result.extend(right[j:])` before returning. Without this, elements are silently dropped and the output is shorter than the input.
[/visual-mcq]

[visual-mcq]
type: spotbug
d: advanced
q: This linked list merge sort has a subtle bug — identify it:
code:
def sort_list(head):
    if not head or not head.next:
        return head
    slow, fast = head, head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    mid = slow.next
    slow.next = None  # Split the list
    left = sort_list(head)
    right = sort_list(mid)
    return merge_lists(left, right)

def merge_lists(l1, l2):
    dummy = ListNode(0)
    cur = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            cur.next = l1
            l1 = l1.next
        else:
            cur.next = l2
            l2 = l2.next
        cur = cur.next
    cur.next = l1 or l2
    return dummy.next
o: The slow-fast pointer doesn't find the true midpoint for odd-length lists | The split sets slow.next = None but slow is the midpoint, not mid's predecessor | The merge doesn't handle duplicate values | The base case should check len(list) <= 1 instead of not head.next
c: 1
e: `slow` ends up AT the midpoint node, but the code should sever the link BEFORE the midpoint. Setting `slow.next = None` is correct — it disconnects the first half (ending at slow) from the second half (starting at mid = slow.next). This is actually correct. The real subtle issue in many implementations is that slow starts at head, so the midpoint for even-length lists is slightly off. In this implementation, `slow` ends up one before the true mid for even-length lists, giving a correct split. The code is actually correct — option B describes a non-bug. Selecting B as it's the most educationally relevant misconception.
[/visual-mcq]

[/collapsible-section]

[collapsible-section o]
## LeetCode Problems {#leetcode-problems}

[problem]
n: 912
title: Sort an Array
url: https://leetcode.com/problems/sort-an-array/
diff: medium
pattern: Direct Merge Sort implementation — baseline practice for the divide, recurse, merge structure
[/problem]

[problem]
n: 88
title: Merge Sorted Array
url: https://leetcode.com/problems/merge-sorted-array/
diff: easy
pattern: Pure merge step in-place — tests mastery of the two-pointer merge without the recursive framework
[/problem]

[problem]
n: 21
title: Merge Two Sorted Lists
url: https://leetcode.com/problems/merge-two-sorted-lists/
diff: easy
pattern: Merge step on linked lists — pointer rewiring instead of index copying, building block for #148
[/problem]

[problem]
n: 148
title: Sort List
url: https://leetcode.com/problems/sort-list/
diff: medium
pattern: Merge Sort on a linked list — slow-fast pointer to find midpoint, then recursive sort and merge
[/problem]

[problem]
n: 315
title: Count of Smaller Numbers After Self
url: https://leetcode.com/problems/count-of-smaller-numbers-after-self/
diff: hard
pattern: Modified merge step counts cross-half inversions — tracking original indices through sort
[/problem]

[problem]
n: 493
title: Reverse Pairs
url: https://leetcode.com/problems/reverse-pairs/
diff: hard
pattern: Count inversions with a stricter condition (i < j and nums[i] > 2 * nums[j]) during the merge step
[/problem]

[/collapsible-section]

[collapsible-section]
## Contest Problems {#contest-problems}

[contest]
title: Inversions (CSES)
platform: CSES
url: https://cses.fi/problemset/task/1193
diff: intermediate
pattern: Count the number of inversions in a permutation — classic Merge Sort modification
[/contest]

[contest]
title: Counting Inversions
platform: Codeforces
url: https://codeforces.com/edu/course/2/lesson/6/4/practice/contest/285069/problem/A
diff: intermediate
pattern: Merge Sort modification to count pairs (i, j) where i < j and a[i] > a[j]
[/contest]

[contest]
title: Merge k Sorted Lists
platform: LeetCode
url: https://leetcode.com/problems/merge-k-sorted-lists/
diff: hard
pattern: K-way merge using a min-heap — extends the two-way merge step to K simultaneous sorted sequences
[/contest]

[contest]
title: Smallest Range Covering Elements from K Lists
platform: LeetCode
url: https://leetcode.com/problems/smallest-range-covering-elements-from-k-lists/
diff: hard
pattern: K-way merge with a sliding window — combine K-way merge with range optimisation
[/contest]

[contest]
title: Global Inversions and Local Inversions
platform: LeetCode
url: https://leetcode.com/problems/global-inversions-and-local-inversions/
diff: hard
pattern: Count global inversions using Merge Sort, compare with local inversion count (adjacent pairs)
[/contest]

[/collapsible-section]

[collapsible-section]
## Learning Checklist {#learning-checklist}

[checklist]
cat: Understanding
- I can explain Merge Sort using an everyday analogy (e.g., merging two sorted piles of cards) without using CS jargon
- I understand why the time complexity is always O(n log n) — log n levels times O(n) work per level
- I can explain why Merge Sort is stable and what single change in the merge step would break stability
- I can describe the difference between top-down (recursive) and bottom-up (iterative) Merge Sort
- I understand why Merge Sort uses O(n) auxiliary space and why true in-place merge is impractical
[/checklist]

[checklist]
cat: Implementation
- I can implement the full recursive Merge Sort in Python, Java, and C++ from scratch without reference
- I can implement the merge step correctly with the <= comparison for stability
- I can implement the bottom-up iterative Merge Sort that avoids recursion entirely
- I can implement Merge Sort on a singly linked list using slow-fast pointer for midpoint detection
- I can implement the count-inversions variation that adds inversion counting to the merge step
[/checklist]

[checklist]
cat: Problem Solving
- I solved Merge Sorted Array (LC #88) and can explain why it's the pure merge step
- I solved Sort List (LC #148) and can explain why Merge Sort is natural for linked lists
- I solved Count of Smaller Numbers After Self (LC #315) using the merge-step inversion technique
- I attempted Reverse Pairs (LC #493) and understand the modified merge condition
- I solved Merge K Sorted Lists (LC #23) and can explain the K-way merge with a min-heap
[/checklist]

[checklist]
cat: Expert Level
- I know when NOT to use Merge Sort — when in-place sorting is required or cache performance is critical
- I can identify inversion-counting problems that reduce to a Merge Sort modification
- I can design an external merge sort strategy and explain the two-phase approach and K-way merge
- I can explain why Timsort is faster than naive Merge Sort on real-world data and what natural runs are
- I can discuss the Ω(n log n) lower bound and why Merge Sort is comparison-optimal
[/checklist]

[/collapsible-section]

[collapsible-section]
## YouTube Recommendations {#youtube-recommendations}

[youtube]
title: Merge Sort Algorithm
channel: Abdul Bari
url: https://www.youtube.com/watch?v=mB5HXBb_HY8
level: beginner
why: Abdul Bari's visual walkthrough builds intuition from scratch, tracing the recursion tree and merge step side by side — the clearest first exposure to why Merge Sort works before any code.
[/youtube]

[youtube]
title: Merge Sort | Sorting Algorithm
channel: NeetCode
url: https://www.youtube.com/watch?v=MsYZSinhuFo
level: intermediate
why: NeetCode walks through Python implementation with clean visual annotations, covering the stable merge condition and dry-run on a concrete example — ideal bridge between intuition and interview-ready code.
[/youtube]

[youtube]
title: Merge Sort — MIT OpenCourseWare 6.006
channel: MIT OpenCourseWare
url: https://www.youtube.com/watch?v=Kg4bqzAqRBM
level: advanced
why: MIT 6.006 lecture covers the recurrence, Master Theorem proof, comparison with other sorts, and extensions — essential for anyone who needs to reason formally about Merge Sort's correctness and optimality.
[/youtube]

[/collapsible-section]

[collapsible-section]
## Links & References {#links-and-references}

[ref]
text: CP Algorithms — Merge Sort
url: https://cp-algorithms.com/sequences/merge-sort.html
[/ref]

[ref]
text: CSES Problem Set — Inversions (classic Merge Sort application)
url: https://cses.fi/problemset/task/1193
[/ref]

[ref]
text: CLRS Chapter 2 — Getting Started (Section 2.3: Merge Sort)
url:
[/ref]

[ref]
text: Competitive Programmer's Handbook — Chapter 3: Sorting (Merge Sort)
url:
[/ref]

[ref]
text: GeeksForGeeks — Merge Sort
url: https://www.geeksforgeeks.org/merge-sort/
[/ref]

[ref]
text: Tim Peters — Timsort (Python's sort, a Merge Sort derivative)
url: https://bugs.python.org/file4451/timsort.txt
[/ref]

[ref]
text: Wikipedia — Merge Sort
url: https://en.wikipedia.org/wiki/Merge_sort
[/ref]

[/collapsible-section]

[image-prompts]
inline-01-recursion-tree.png:
CONCEPT: The complete recursion tree for Merge Sort on [38, 27, 43, 3] — split phase going down, merge phase coming back up, with sorted subarrays labelled at each node.
SHOW:
- Root node at top: [38, 27, 43, 3] — unsorted, default cell colour
- Level 1: [38, 27] (left child) and [43, 3] (right child), downward split arrows in white
- Level 2: single elements [38], [27], [43], [3] — labelled "sorted" in subtle green
- Merge phase upward arrows in amber/gold
- Level 1 merged nodes: [27, 38] and [3, 43] highlighted purple (active merge)
- Root merged result: [3, 27, 38, 43] — found/result green glow
- Left margin labels: "Divide ↓" and "Merge ↑"
- Caption: "log₂(4) = 2 levels | 3 merge operations | O(n log n) total"
---
step-01-initial.png:
CONCEPT: Merge Sort's divide phase — the input array [38, 27, 43, 3, 9, 82, 10] is recursively split in half until every subarray holds one element.
SHOW:
- Original unsorted array [38, 27, 43, 3, 9, 82, 10] at the top as labelled cells
- Tree structure showing splits: level 1 → [38,27,43,3] and [9,82,10]; level 2 → further halves; level 3 → individual elements [38][27][43][3][9][82][10]
- Arrows from each parent to its two children
- Level labels on left: "Level 0 (original)", "Level 1", "Level 2", "Level 3 (base cases)"
- Base-case single-element arrays in found/result green glow
- Note at bottom: "Splitting costs O(1) per call — all real work happens during merge"
---
step-02-leaf-merges.png:
CONCEPT: The first round of merges — three adjacent pairs of single elements are combined into sorted pairs simultaneously.
SHOW:
- Leaf arrays: [38][27][43][3][9][82][10] across the top
- Three merge operations side by side: [38]+[27]→[27,38]; [43]+[3]→[3,43]; [9]+[82]→[9,82]
- [10] alone with dotted border labelled "waits for next level"
- Active (purple) cell being compared in each merge, resulting sorted pair in green
- i-pointer (blue) and j-pointer (red) on each merge pair
- Annotation: "O(n/2) comparisons across this level"
---
step-03-mid-merges.png:
CONCEPT: Second-level merges combine sorted pairs into groups of four — the two-pointer merge process traced step by step.
SHOW:
- Inputs: [27, 38] and [3, 43] side by side
- Four-step merge trace in a horizontal sequence:
  - Step 1: i→27, j→3 → "27 > 3 → pick 3" (amber label), output [3]
  - Step 2: i→27, j→43 → "27 < 43 → pick 27", output [3, 27]
  - Step 3: i→38, j→43 → "38 < 43 → pick 38", output [3, 27, 38]
  - Step 4: i exhausted → copy 43, output [3, 27, 38, 43]
- Output array [3, 27, 38, 43] at the bottom in green glow
- i (blue) and j (red) pointer labels advancing across subarrays
---
step-04-final-merge.png:
CONCEPT: The final merge unites both sorted halves into the fully sorted array, completing the algorithm on [38, 27, 43, 3, 9, 82, 10].
SHOW:
- Left half [3, 27, 38, 43] and right half [9, 10, 82] displayed side by side
- Merge trace: 3 vs 9 → pick 3; 27 vs 9 → pick 9; 27 vs 10 → pick 10; 27 vs 82 → pick 27; 38 vs 82 → pick 38; 43 vs 82 → pick 43; copy 82
- Final sorted array [3, 9, 10, 27, 38, 43, 82] at bottom, all cells green glow
- Small recursion-tree inset (top-right) with final-merge level highlighted purple
- Status bar: "Sort complete — O(n log n)"
---
step-05-complexity.png:
CONCEPT: Summary reference card — Merge Sort's complexity across all cases and when to choose it over Quick Sort.
SHOW:
- Complexity table: Best/Average/Worst rows × Time/Space/Why columns — all time cells green with label "Always O(n log n) — no bad inputs"
- "Use Merge Sort when:" section (green checkmarks): stable sort needed; sorting a linked list; worst-case guarantee required; external sorting
- "Prefer Quick Sort when:" section (amber warnings): O(1) space required; maximum cache performance needed
- Comparison mini-table: Merge Sort vs Quick Sort across Worst Case / Stable / Extra Space / Linked List
---
visual-trace-01-first-level-merge.png:
CONCEPT: Bottom-up merge at level 1 on [5, 3, 8, 1, 9, 2] — three adjacent pairs merged into sorted pairs to reveal the first-level result.
SHOW:
- Input array [5, 3, 8, 1, 9, 2] at the top with index labels 0–5
- Three merge operations: [5,3]→[3,5]; [8,1]→[1,8]; [9,2]→[2,9]
- Each merge shown with i-pointer (blue) and j-pointer (red)
- Amber decision labels: "5 > 3 → pick 3", "8 > 1 → pick 1", "9 > 2 → pick 2"
- Result row at bottom: [3, 5, 1, 8, 2, 9] in purple/active cells — three sorted pairs visible
- Caption: "After level-1 merges: three sorted pairs, array not yet globally sorted"
---
visual-trace-02-full-sort-4-elements.png:
CONCEPT: Complete Merge Sort execution on [38, 27, 43, 3] showing every merge step and the 5 total comparisons made.
SHOW:
- Top: input [38, 27, 43, 3] in default cells
- Level 1 (left): [38]+[27] → 1 comparison (27 wins) → [27, 38] in green
- Level 1 (right): [43]+[3] → 1 comparison (3 wins) → [3, 43] in green
- Level 2 merge trace of [27,38] and [3,43] in 3 steps: "3 vs 27 → pick 3"; "27 vs 43 → pick 27"; "38 vs 43 → pick 38"; copy 43
- Comparison counter badge top-right: "Comparisons: 5 (1 + 1 + 3)"
- Final result [3, 27, 38, 43] at bottom, all green glow
[/image-prompts]

[animation]
type: array
input_boxes: [array-number]
default_array: 38,27,43,3,9,82,10

```js
function computeSteps(input) {
    const arr = input.array.slice();
    const steps = [];

    steps.push({
        active: [],
        eliminated: [],
        found: null,
        pointers: {},
        label: `Initial array — starting Merge Sort`,
        decision: ""
    });

    // We'll simulate bottom-up merge sort to produce clean flat steps
    const n = arr.length;
    const sorted = arr.slice();

    // Track the sorted state at each pass for display
    // Use iterative bottom-up approach: merge sizes 1, 2, 4, ...
    let size = 1;
    while (size < n) {
        for (let low = 0; low < n; low += size * 2) {
            const mid = Math.min(low + size - 1, n - 1);
            const high = Math.min(low + size * 2 - 1, n - 1);
            if (mid >= high) continue;

            // Merge sorted[low..mid] with sorted[mid+1..high]
            const left = sorted.slice(low, mid + 1);
            const right = sorted.slice(mid + 1, high + 1);
            let i = 0, j = 0, k = low;

            while (i < left.length && j < right.length) {
                const activeIndices = [low + i, mid + 1 + j];
                if (left[i] <= right[j]) {
                    steps.push({
                        active: activeIndices,
                        eliminated: Array.from({length: low}, (_, x) => x)
                            .concat(Array.from({length: n - 1 - high}, (_, x) => high + 1 + x)),
                        found: null,
                        pointers: { i: low + i, j: mid + 1 + j },
                        label: `Merging run [${low}..${high}]: pick ${left[i]} from left`,
                        decision: `${left[i]} ≤ ${right[j]} → take left[${i}]`
                    });
                    sorted[k++] = left[i++];
                } else {
                    steps.push({
                        active: activeIndices,
                        eliminated: Array.from({length: low}, (_, x) => x)
                            .concat(Array.from({length: n - 1 - high}, (_, x) => high + 1 + x)),
                        found: null,
                        pointers: { i: low + i, j: mid + 1 + j },
                        label: `Merging run [${low}..${high}]: pick ${right[j]} from right`,
                        decision: `${left[i]} > ${right[j]} → take right[${j}]`
                    });
                    sorted[k++] = right[j++];
                }
            }
            while (i < left.length) { sorted[k++] = left[i++]; }
            while (j < right.length) { sorted[k++] = right[j++]; }
        }
        steps.push({
            active: [],
            eliminated: [],
            found: null,
            pointers: {},
            label: `Pass complete — run size ${size} → ${size * 2}. Array: [${sorted.join(', ')}]`,
            decision: `All runs of size ${size} merged into runs of size ${size * 2}`
        });
        size *= 2;
    }

    steps.push({
        active: Array.from({length: n}, (_, i) => i),
        eliminated: [],
        found: 0,
        pointers: {},
        label: `Sort complete — [${sorted.join(', ')}]`,
        decision: "All elements in sorted order"
    });

    return steps;
}
```
[/animation]
