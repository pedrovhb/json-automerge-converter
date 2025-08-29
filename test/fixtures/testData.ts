/**
 * Shared test data fixtures
 */

export const TEST_FIXTURES = {
  simple: {
    string: "hello",
    number: 42,
    boolean: true,
    nullValue: null,
  },

  complex: {
    users: [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
    ],
    metadata: {
      created: "2025-08-29T00:00:00.000Z",
      version: "1.0.0",
      config: {
        debug: true,
        maxRetries: 3,
        endpoints: ["api.example.com", "backup.example.com"],
      },
    },
    stats: {
      totalUsers: 2,
      activeUsers: 1,
      conversionRate: 0.5,
    },
  },

  unicode: {
    emoji: "🚀✨🎉",
    chinese: "你好世界",
    arabic: "مرحبا بالعالم",
    special: "Special chars: !@#$%^&*()[]{}|\\:;\"'<>?,./",
    newlines: "Line 1\nLine 2\r\nLine 3",
    tabs: "Col1\tCol2\tCol3",
  },

  edgeCases: {
    empty: {},
    emptyArray: { items: [] },
    primitives: [
      { value: null },
      { value: "string" },
      { value: 42 },
      { value: true },
      { value: false },
    ],
    deepNesting: {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                data: "deep value",
                array: [1, 2, { nested: "in array" }],
              },
            },
          },
        },
      },
    },
  },

  large: {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      active: i % 2 === 0,
      data: Array(10).fill(`data-${i}`).join("-"),
    })),
  },

  invalid: {
    withDate: { date: new Date() },
    withRegExp: { pattern: /test/ },
    withFunction: { fn: () => {} },
    withSymbol: { sym: Symbol("test") },
  },
} as const;

export const VALID_ACTOR_ID =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const INVALID_BINARIES = {
  random: new Uint8Array([1, 2, 3, 4, 5]),
  truncated: new Uint8Array([0x85, 0x01, 0x00]), // Incomplete Automerge header
} as const;

// Empty binary actually returns valid empty document in Automerge
export const EMPTY_BINARY = new Uint8Array();
