/**
 * Core API tests for JSON ↔ Automerge conversion
 */

import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import {
  automergeToJson,
  jsonToAutomerge,
  readAutomergeAsJson,
  testRepoCompatibility,
  validateAutomergeBinary,
  writeJsonAsAutomerge,
} from "@jsonAutomergeConverter";

// Test fixtures
const SIMPLE_DATA = {
  string: "hello",
  number: 42,
  boolean: true,
  nullValue: null,
};

const COMPLEX_DATA = {
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
};

const UNICODE_DATA = {
  emoji: "🚀✨🎉",
  chinese: "你好世界",
  arabic: "مرحبا بالعالم",
  special: "Special chars: !@#$%^&*()[]{}|\\:;\"'<>?,./",
  newlines: "Line 1\nLine 2\r\nLine 3",
  tabs: "Col1\tCol2\tCol3",
};

Deno.test("JSON to Automerge conversion", async (t) => {
  await t.step("converts simple data correctly", () => {
    const binary = jsonToAutomerge(SIMPLE_DATA);
    const restored = automergeToJson(binary);

    assertEquals(restored, SIMPLE_DATA);
    assertEquals(binary instanceof Uint8Array, true);
    assertEquals(binary.length > 0, true);
  });

  await t.step("converts complex nested data", () => {
    const binary = jsonToAutomerge(COMPLEX_DATA);
    const restored = automergeToJson(binary);

    assertEquals(restored, COMPLEX_DATA);
  });

  await t.step("handles Unicode and special characters", () => {
    const binary = jsonToAutomerge(UNICODE_DATA);
    const restored = automergeToJson(binary);

    assertEquals(restored, UNICODE_DATA);
  });

  await t.step("supports custom actor ID", () => {
    const customActor =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const binary = jsonToAutomerge(SIMPLE_DATA, { actor: customActor });
    const restored = automergeToJson(binary, { actor: customActor });

    assertEquals(restored, SIMPLE_DATA);
  });

  await t.step("validates JSON when requested", () => {
    const invalidData = { date: new Date() };

    assertThrows(
      () => jsonToAutomerge(invalidData, { validateJson: true }),
      Error,
      "Invalid JSON object",
    );
  });
});

Deno.test("Automerge to JSON conversion", async (t) => {
  await t.step("handles valid binary data", () => {
    const binary = jsonToAutomerge(SIMPLE_DATA);
    const result = automergeToJson(binary);

    assertEquals(result, SIMPLE_DATA);
  });

  await t.step("throws on invalid binary data", () => {
    const invalidBinary = new Uint8Array([1, 2, 3, 4, 5]);

    assertThrows(() => automergeToJson(invalidBinary));
  });
});

Deno.test("Binary validation", async (t) => {
  await t.step("validates correct Automerge binary", () => {
    const binary = jsonToAutomerge(SIMPLE_DATA);
    const isValid = validateAutomergeBinary(binary);

    assertEquals(isValid, true);
  });

  await t.step("rejects invalid binary data", () => {
    const invalidBinary = new Uint8Array([1, 2, 3, 4, 5]);
    const isValid = validateAutomergeBinary(invalidBinary);

    assertEquals(isValid, false);
  });

  await t.step("handles empty binary", () => {
    const emptyBinary = new Uint8Array();
    const isValid = validateAutomergeBinary(emptyBinary);

    assertEquals(isValid, false);
  });
});

Deno.test("Edge cases and data types", async (t) => {
  await t.step("handles empty objects and arrays", () => {
    const emptyObject = {};
    const arrayWrapper = { items: [] };

    const binaryObject = jsonToAutomerge(emptyObject);
    const binaryArray = jsonToAutomerge(arrayWrapper);

    assertEquals(automergeToJson(binaryObject), emptyObject);
    assertEquals(automergeToJson(binaryArray), arrayWrapper);
  });

  await t.step("handles primitive values in objects", () => {
    const testCases = [
      { value: null },
      { value: "string" },
      { value: 42 },
      { value: true },
      { value: false },
    ];

    for (const testCase of testCases) {
      const binary = jsonToAutomerge(testCase);
      const restored = automergeToJson(binary);
      assertEquals(restored, testCase);
    }
  });

  await t.step("handles deeply nested structures", () => {
    const deeplyNested = {
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
    };

    const binary = jsonToAutomerge(deeplyNested);
    const restored = automergeToJson(binary);

    assertEquals(restored, deeplyNested);
  });

  await t.step("handles large data structures", () => {
    const largeData = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        active: i % 2 === 0,
      })),
    };

    const binary = jsonToAutomerge(largeData);
    const restored = automergeToJson(binary);

    assertEquals(restored, largeData);
    assertEquals(binary.length > 1000, true);
  });
});

Deno.test({
  name: "Repository compatibility",
  ignore: true, // Automerge-repo has timer leaks in Deno tests
  fn: async () => {
    const binary = jsonToAutomerge(SIMPLE_DATA);
    const isCompatible = await testRepoCompatibility(binary);

    assertEquals(isCompatible, true);
  },
});