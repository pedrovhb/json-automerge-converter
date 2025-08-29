/**
 * File operations tests for Automerge binary format
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  readAutomergeAsJson,
  writeJsonAsAutomerge,
} from "@jsonAutomergeConverter";

const TEST_DATA = {
  document: "test file operations",
  metadata: {
    created: "2025-08-29T00:00:00.000Z",
    version: 1,
  },
  items: [1, 2, 3],
};

Deno.test("File write and read operations", async (t) => {
  await t.step("writes and reads simple data", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = `${tempDir}/test.automerge`;

    try {
      await writeJsonAsAutomerge(TEST_DATA, testFile);
      const restored = await readAutomergeAsJson(testFile);

      assertEquals(restored, TEST_DATA);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("handles multiple write/read cycles", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = `${tempDir}/multi-test.automerge`;

    const testCases = [
      { case: 1, data: "first write" },
      { case: 2, data: [1, 2, 3] },
      { case: 3, data: { nested: { deep: "value" } } },
    ];

    try {
      for (const testCase of testCases) {
        await writeJsonAsAutomerge(testCase, testFile);
        const restored = await readAutomergeAsJson(testFile);
        assertEquals(restored, testCase);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("supports conversion options in file operations", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = `${tempDir}/options-test.automerge`;
    const customActor =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    try {
      await writeJsonAsAutomerge(TEST_DATA, testFile, {
        actor: customActor,
        validateJson: true,
      });
      const restored = await readAutomergeAsJson(testFile, {
        actor: customActor,
      });

      assertEquals(restored, TEST_DATA);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("preserves binary data integrity", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = `${tempDir}/integrity-test.automerge`;

    const largeData = {
      items: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: Array(100).fill("x").join(""),
      })),
    };

    try {
      await writeJsonAsAutomerge(largeData, testFile);
      const restored = await readAutomergeAsJson(testFile);

      assertEquals(restored, largeData);

      // Verify file size is reasonable
      const fileInfo = await Deno.stat(testFile);
      assertEquals(fileInfo.size > 1000, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("File operation error handling", async (t) => {
  await t.step("handles non-existent file reads", async () => {
    await assertRejects(
      async () => await readAutomergeAsJson("/nonexistent/file.automerge"),
      Error,
    );
  });

  await t.step("handles invalid directory writes", async () => {
    await assertRejects(
      async () =>
        await writeJsonAsAutomerge(
          TEST_DATA,
          "/nonexistent/directory/file.automerge",
        ),
      Error,
    );
  });

  await t.step("handles permission errors gracefully", async () => {
    // Create a read-only directory for permission testing
    const tempDir = await Deno.makeTempDir();
    const readOnlyDir = `${tempDir}/readonly`;
    await Deno.mkdir(readOnlyDir);

    try {
      await Deno.chmod(readOnlyDir, 0o444);

      await assertRejects(
        async () =>
          await writeJsonAsAutomerge(
            TEST_DATA,
            `${readOnlyDir}/test.automerge`,
          ),
        Error,
      );
    } finally {
      // Restore permissions for cleanup
      await Deno.chmod(readOnlyDir, 0o755);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("handles corrupted file reads", async () => {
    const tempDir = await Deno.makeTempDir();
    const corruptedFile = `${tempDir}/corrupted.automerge`;

    try {
      // Write corrupted binary data
      const corruptedData = new Uint8Array([1, 2, 3, 4, 5]);
      await Deno.writeFile(corruptedFile, corruptedData);

      await assertRejects(
        async () => await readAutomergeAsJson(corruptedFile),
        Error,
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
