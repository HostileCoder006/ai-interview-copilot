import type { InterviewQuestion } from "./interview-types";

// ─── Mock Question Bank ───────────────────────────────────────────────────────
// TODO: Replace with API call to GET /api/questions?category=DSA&difficulty=Medium
// when backend is integrated.

export const QUESTION_BANK: InterviewQuestion[] = [
  // ── DSA · Easy ──────────────────────────────────────────────────────────────
  {
    id: "dsa-easy-1",
    text: "Given an array of integers, find two numbers that sum to a target value. Return their indices. What's the most optimal approach?",
    category: "DSA",
    difficulty: "Easy",
    tags: ["arrays", "hash-map", "two-sum"],
    followUps: [
      "What's the time and space complexity of your solution?",
      "How does your solution handle duplicate values in the array?",
      "Can you walk me through the hash map invariant as you iterate?",
    ],
    hints: [
      "Think about what data structure gives O(1) lookup.",
      "As you iterate, store each number. Check if target − num already exists.",
      "A single-pass hash map: key = number, value = index.",
    ],
  },
  {
    id: "dsa-easy-2",
    text: "Explain how you'd reverse a linked list in-place. Walk me through both iterative and recursive approaches.",
    category: "DSA",
    difficulty: "Easy",
    tags: ["linked-list", "pointers", "recursion"],
    followUps: [
      "What's the space complexity difference between iterative and recursive?",
      "How would you handle reversing only a portion of the list?",
      "What if the list has a cycle — how do you detect it first?",
    ],
    hints: [
      "You need three pointers: prev, current, next.",
      "At each step: save next, flip the pointer, advance.",
      "Recursive base case: null or single node.",
    ],
  },
  // ── DSA · Medium ────────────────────────────────────────────────────────────
  {
    id: "dsa-med-1",
    text: "Find the longest substring without repeating characters. Explain your approach and analyze its complexity.",
    category: "DSA",
    difficulty: "Medium",
    tags: ["sliding-window", "hash-map", "strings"],
    followUps: [
      "Why is a sliding window better than brute force here?",
      "How do you handle the window shrink step efficiently?",
      "What changes if the input contains Unicode characters?",
    ],
    hints: [
      "Use a sliding window with two pointers.",
      "A hash map tracks the last seen index of each character.",
      "When a duplicate is found, move the left pointer past the previous occurrence.",
    ],
  },
  {
    id: "dsa-med-2",
    text: "Given a matrix of 0s and 1s, count the number of islands. An island is a group of connected 1s (horizontally or vertically).",
    category: "DSA",
    difficulty: "Medium",
    tags: ["graph", "BFS", "DFS", "matrix"],
    followUps: [
      "BFS or DFS — which do you prefer here and why?",
      "How would you handle a very large matrix that doesn't fit in memory?",
      "What if diagonal connections also count as connected?",
    ],
    hints: [
      "Iterate through every cell. When you find a 1, trigger a flood-fill.",
      "Mark visited cells as 0 (or use a visited set) to avoid re-counting.",
      "Each flood-fill call = one island.",
    ],
  },
  // ── DSA · Hard ──────────────────────────────────────────────────────────────
  {
    id: "dsa-hard-1",
    text: "Design an LRU (Least Recently Used) cache that supports O(1) get and put operations. Walk me through your data structure choice.",
    category: "DSA",
    difficulty: "Hard",
    tags: ["design", "hash-map", "doubly-linked-list", "LRU"],
    followUps: [
      "Why a doubly linked list over a singly linked list?",
      "How would you make this implementation thread-safe?",
      "What if you needed to add TTL (time-to-live) expiry per key?",
    ],
    hints: [
      "Combine a hash map (O(1) lookup) with a doubly linked list (O(1) reorder).",
      "The map stores key → node. The list maintains access order.",
      "On get: move node to head. On put: add to head, evict tail if over capacity.",
    ],
  },
  {
    id: "dsa-hard-2",
    text: "Find the median of a data stream in real time. Design a data structure that supports addNum(int num) and findMedian() efficiently.",
    category: "DSA",
    difficulty: "Hard",
    tags: ["heap", "design", "streaming"],
    followUps: [
      "Why two heaps? Walk me through the rebalancing invariant.",
      "What's the time complexity of each operation?",
      "How would you handle the case where numbers can be removed from the stream?",
    ],
    hints: [
      "Use a max-heap for the lower half and a min-heap for the upper half.",
      "Keep the heaps balanced: sizes differ by at most 1.",
      "Median = top of larger heap, or average of both tops if equal size.",
    ],
  },
  // ── System Design · Medium ───────────────────────────────────────────────────
  {
    id: "sys-med-1",
    text: "Design a URL shortener like bit.ly. Walk me through the system architecture, data model, and how you'd handle scale.",
    category: "System Design",
    difficulty: "Medium",
    tags: ["system-design", "hashing", "databases", "scale"],
    followUps: [
      "How do you generate unique short codes at scale without collisions?",
      "How would you handle 100M URLs and 10B redirects per day?",
      "What's your caching strategy for hot URLs?",
    ],
    hints: [
      "Core: encode a long URL to a 6–8 char key, store in a DB.",
      "Use base62 encoding of an auto-increment ID or a hash.",
      "Cache the most-accessed URLs in Redis with a TTL.",
    ],
  },
  // ── Behavioral ───────────────────────────────────────────────────────────────
  {
    id: "beh-1",
    text: "Tell me about a time you had to make a difficult technical decision with incomplete information. How did you approach it and what was the outcome?",
    category: "Behavioral",
    difficulty: "Medium",
    tags: ["decision-making", "ambiguity", "leadership"],
    followUps: [
      "What would you do differently in hindsight?",
      "How did you communicate the uncertainty to your team or stakeholders?",
      "What signals told you it was time to make a call despite incomplete data?",
    ],
    hints: [
      "Use the STAR format: Situation, Task, Action, Result.",
      "Be specific — name the technology, team size, and stakes.",
      "Show self-awareness: what you learned matters as much as the outcome.",
    ],
  },
];

export function getQuestionsByFilter(category: string, difficulty: string): InterviewQuestion[] {
  return QUESTION_BANK.filter(
    (q) =>
      (category === "All" || q.category === category) &&
      (difficulty === "All" || q.difficulty === difficulty),
  );
}

export function getRandomQuestion(category: string, difficulty: string): InterviewQuestion {
  const pool = getQuestionsByFilter(category, difficulty);
  if (pool.length === 0) return QUESTION_BANK[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
