/**
 * Comprehensive error handling tests
 */

import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  automergeToJson,
  jsonToAutomerge,
  readAutomergeAsJson,
  validateAutomergeBinary,
  writeJsonAsAutomerge,
} from "../src/jsonAutomergeConverter.ts";
import {
  EMPTY_BINARY,
  INVALID_BINARIES,
  TEST_FIXTURES,
} from "./fixtures/test_data.ts";
import { cleanupTempDir, createTempTestDir } from "./fixtures/test_utils.ts";

Deno.test("JSON validation errors", async (t) => {
  await t.step("rejects Date objects when validation enabled", () => {
    assertThrows(
      () =>
        jsonToAutomerge(TEST_FIXTURES.invalid.withDate, { validateJson: true }),
      Error,
      "Invalid JSON object",
    );
  });

  await t.step("rejects RegExp objects when validation enabled", () => {
    assertThrows(
      () =>
        jsonToAutomerge(TEST_FIXTURES.invalid.withRegExp, {
          validateJson: true,
        }),
      Error,
      "Invalid JSON object",
    );
  });

  await t.step("rejects function objects when validation enabled", () => {
    assertThrows(
      () =>
        jsonToAutomerge(TEST_FIXTURES.invalid.withFunction, {
          validateJson: true,
        }),
      Error,
      "Invalid JSON object",
    );
  });

  await t.step("rejects Symbol objects when validation enabled", () => {
    assertThrows(
      () =>
        jsonToAutomerge(TEST_FIXTURES.invalid.withSymbol, {
          validateJson: true,
        }),
      Error,
      "Invalid JSON object",
    );
  });

  await t.step("accepts invalid objects when validation disabled", () => {
    // Should not throw when validation is disabled (default)
    const binary = jsonToAutomerge(TEST_FIXTURES.invalid.withDate);
    assertEquals(binary instanceof Uint8Array, true);
  });

  await t.step("rejects undefined inputs but accepts null", () => {
    // null is valid JSON
    const nullBinary = jsonToAutomerge(null, { validateJson: true });
    assertEquals(nullBinary instanceof Uint8Array, true);

    // undefined is not valid JSON
    assertThrows(
      () => jsonToAutomerge(undefined, { validateJson: true }),
      Error,
      "Invalid JSON object",
    );
  });
});

Deno.test("Binary format errors", async (t) => {
  await t.step("rejects empty binary data", () => {
    assertThrows(() => automergeToJson(EMPTY_BINARY));
  });

  await t.step("rejects random binary data", () => {
    assertThrows(() => automergeToJson(INVALID_BINARIES.random));
  });

  await t.step("rejects truncated binary data", () => {
    assertThrows(() => automergeToJson(INVALID_BINARIES.truncated));
  });

  await t.step(
    "validateAutomergeBinary handles invalid data gracefully",
    () => {
      assertEquals(validateAutomergeBinary(EMPTY_BINARY), false);
      assertEquals(validateAutomergeBinary(INVALID_BINARIES.random), false);
      assertEquals(validateAutomergeBinary(INVALID_BINARIES.truncated), false);
    },
  );

  await t.step("validateAutomergeBinary accepts valid data", () => {
    const validBinary = jsonToAutomerge(TEST_FIXTURES.simple);
    assertEquals(validateAutomergeBinary(validBinary), true);
  });
});

Deno.test("File system errors", async (t) => {
  await t.step("handles non-existent file reads", async () => {
    await assertRejects(
      () => readAutomergeAsJson("/path/that/does/not/exist.automerge"),
      Error,
    );
  });

  await t.step("handles invalid write paths", async () => {
    await assertRejects(
      () =>
        writeJsonAsAutomerge(
          TEST_FIXTURES.simple,
          "/root/invalid/path.automerge",
        ),
      Error,
    );
  });

  await t.step("handles permission denied scenarios", async () => {
    const tempDir = await createTempTestDir();
    const readOnlyDir = `${tempDir}/readonly`;

    try {
      await Deno.mkdir(readOnlyDir);
      await Deno.chmod(readOnlyDir, 0o444); // Read-only

      await assertRejects(
        () =>
          writeJsonAsAutomerge(
            TEST_FIXTURES.simple,
            `${readOnlyDir}/test.automerge`,
          ),
        Error,
      );
    } finally {
      // Restore permissions for cleanup
      try {
        await Deno.chmod(readOnlyDir, 0o755);
      } catch {
        // Ignore if already cleaned up
      }
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("handles corrupted file content", async () => {
    const tempDir = await createTempTestDir();
    const corruptedFile = `${tempDir}/corrupted.automerge`;

    try {
      // Write invalid binary data to file
      await Deno.writeFile(corruptedFile, INVALID_BINARIES.random);

      await assertRejects(
        () => readAutomergeAsJson(corruptedFile),
        Error,
      );
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("handles empty files", async () => {
    const tempDir = await createTempTestDir();
    const emptyFile = `${tempDir}/empty.automerge`;

    try {
      // Create empty file
      await Deno.writeFile(emptyFile, new Uint8Array());

      await assertRejects(
        () => readAutomergeAsJson(emptyFile),
        Error,
      );
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});

Deno.test("Actor ID validation", async (t) => {
  await t.step("handles invalid actor ID format", () => {
    const invalidActor = "not-a-valid-hex-string";

    // Automerge should handle invalid actor gracefully
    assertThrows(() => {
      jsonToAutomerge(TEST_FIXTURES.simple, { actor: invalidActor });
    });
  });

  await t.step("handles empty actor ID", () => {
    const binary = jsonToAutomerge(TEST_FIXTURES.simple, { actor: "" });
    assertEquals(binary instanceof Uint8Array, true);
  });

  await t.step("handles very long actor ID", () => {
    const longActor = "a".repeat(1000);
    const binary = jsonToAutomerge(TEST_FIXTURES.simple, { actor: longActor });
    assertEquals(binary instanceof Uint8Array, true);
  });
});

Deno.test("Memory and performance edge cases", async (t) => {
  await t.step("handles extremely large objects gracefully", () => {
    const hugeObject = {
      data: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        content: "x".repeat(100),
      })),
    };

    // Should not crash or timeout
    const binary = jsonToAutomerge(hugeObject);
    assertEquals(binary instanceof Uint8Array, true);
    assertEquals(binary.length > 100000, true);
  });

  await t.step("handles circular references in input", () => {
    const circular: any = { name: "test" };
    circular.self = circular;

    // Automerge should detect circular references and throw
    assertThrows(() => jsonToAutomerge(circular));
  });

  await t.step("handles deeply nested objects", () => {
    let deepObject: any = { value: "deep" };
    // Reduce depth to avoid triggering Automerge's internal safety checks
    for (let i = 0; i < 100; i++) {
      deepObject = { level: i, child: deepObject };
    }

    // Should handle reasonable deep nesting without issues
    const binary = jsonToAutomerge(deepObject);
    assertEquals(binary instanceof Uint8Array, true);
  });
});
