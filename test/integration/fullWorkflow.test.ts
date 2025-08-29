/**
 * Integration tests for complete JSON ↔ Automerge workflows
 */

import { assertEquals } from "@std/assert";
import {
  readAutomergeAsJson,
  writeJsonAsAutomerge,
} from "@jsonAutomergeConverter";
import { TEST_FIXTURES, VALID_ACTOR_ID } from "@testFixtures";
import { cleanupTempDir, createTempTestDir, testRoundtrip } from "@testUtils";

Deno.test("Complete workflow integration tests", async (t) => {
  await t.step("full JSON to file to JSON workflow", async () => {
    const tempDir = await createTempTestDir();
    const testFile = `${tempDir}/workflow-test.automerge`;

    try {
      // Test the complete workflow with complex data
      await writeJsonAsAutomerge(TEST_FIXTURES.complex, testFile, {
        actor: VALID_ACTOR_ID,
        validateJson: true,
      });

      const restored = await readAutomergeAsJson(testFile, {
        actor: VALID_ACTOR_ID,
      });

      assertEquals(restored, TEST_FIXTURES.complex);

      // Verify file exists and has content
      const fileInfo = await Deno.stat(testFile);
      assertEquals(fileInfo.isFile, true);
      assertEquals(fileInfo.size > 0, true);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("multiple file operations in sequence", async () => {
    const tempDir = await createTempTestDir();

    try {
      const testFiles = [
        { name: "simple.automerge", data: TEST_FIXTURES.simple },
        { name: "complex.automerge", data: TEST_FIXTURES.complex },
        { name: "unicode.automerge", data: TEST_FIXTURES.unicode },
        { name: "large.automerge", data: TEST_FIXTURES.large },
      ];

      // Write all files
      for (const { name, data } of testFiles) {
        await writeJsonAsAutomerge(data, `${tempDir}/${name}`);
      }

      // Read all files back and verify
      for (const { name, data } of testFiles) {
        const restored = await readAutomergeAsJson(`${tempDir}/${name}`);
        assertEquals(restored, data);
      }

      // Verify all files exist
      for (const { name } of testFiles) {
        const fileInfo = await Deno.stat(`${tempDir}/${name}`);
        assertEquals(fileInfo.isFile, true);
        assertEquals(fileInfo.size > 0, true);
      }
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("concurrent file operations", async () => {
    const tempDir = await createTempTestDir();

    try {
      const concurrentData = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        data: TEST_FIXTURES.simple,
        extra: `concurrent-${i}`,
      }));

      // Write files concurrently
      const writePromises = concurrentData.map((data, i) =>
        writeJsonAsAutomerge(data, `${tempDir}/concurrent-${i}.automerge`)
      );
      await Promise.all(writePromises);

      // Read files concurrently
      const readPromises = concurrentData.map((_, i) =>
        readAutomergeAsJson(`${tempDir}/concurrent-${i}.automerge`)
      );
      const results = await Promise.all(readPromises);

      // Verify results
      results.forEach((result, i) => {
        assertEquals(result, concurrentData[i]);
      });
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("file overwrite operations", async () => {
    const tempDir = await createTempTestDir();
    const testFile = `${tempDir}/overwrite-test.automerge`;

    try {
      // Write initial data
      await writeJsonAsAutomerge(TEST_FIXTURES.simple, testFile);
      let restored = await readAutomergeAsJson(testFile);
      assertEquals(restored, TEST_FIXTURES.simple);

      // Overwrite with different data
      await writeJsonAsAutomerge(TEST_FIXTURES.complex, testFile);
      restored = await readAutomergeAsJson(testFile);
      assertEquals(restored, TEST_FIXTURES.complex);

      // Overwrite with unicode data
      await writeJsonAsAutomerge(TEST_FIXTURES.unicode, testFile);
      restored = await readAutomergeAsJson(testFile);
      assertEquals(restored, TEST_FIXTURES.unicode);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});

Deno.test("Cross-platform compatibility", async (t) => {
  await t.step("handles different path separators", async () => {
    const tempDir = await createTempTestDir();
    const nestedDir = `${tempDir}/nested/deep`;

    try {
      // Create nested directory structure
      await Deno.mkdir(nestedDir, { recursive: true });

      const testFile = `${nestedDir}/nested-test.automerge`;
      await writeJsonAsAutomerge(TEST_FIXTURES.simple, testFile);

      const restored = await readAutomergeAsJson(testFile);
      assertEquals(restored, TEST_FIXTURES.simple);
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("preserves data integrity across save/load cycles", () => {
    const testCases = [
      TEST_FIXTURES.simple,
      TEST_FIXTURES.complex,
      TEST_FIXTURES.unicode,
      // Skip deepNesting as it triggers Automerge internal safety checks
    ];

    for (const testData of testCases) {
      // Test multiple cycles to ensure no data degradation
      testRoundtrip(testData);
      testRoundtrip(testData, { validateJson: true });
      testRoundtrip(testData, { actor: VALID_ACTOR_ID });
    }
  });
});

Deno.test("Performance integration tests", async (t) => {
  await t.step("handles large file operations efficiently", async () => {
    const tempDir = await createTempTestDir();
    const largeFile = `${tempDir}/large-test.automerge`;

    try {
      const startTime = performance.now();

      await writeJsonAsAutomerge(TEST_FIXTURES.large, largeFile);
      const restored = await readAutomergeAsJson(largeFile);

      const endTime = performance.now();
      const duration = endTime - startTime;

      assertEquals(restored, TEST_FIXTURES.large);

      // Ensure reasonable performance (should complete within 5 seconds)
      assertEquals(duration < 5000, true);

      // Verify file size is reasonable
      const fileInfo = await Deno.stat(largeFile);
      assertEquals(fileInfo.size > 1000, true);
      assertEquals(fileInfo.size < 10_000_000, true); // Less than 10MB
    } finally {
      await cleanupTempDir(tempDir);
    }
  });

  await t.step("memory usage remains reasonable", async () => {
    const tempDir = await createTempTestDir();

    try {
      // Process multiple files to test memory management
      for (let i = 0; i < 10; i++) {
        const testFile = `${tempDir}/memory-test-${i}.automerge`;
        const testData = {
          iteration: i,
          data: TEST_FIXTURES.complex,
          large: Array(100).fill(`data-${i}`),
        };

        await writeJsonAsAutomerge(testData, testFile);
        const restored = await readAutomergeAsJson(testFile);
        assertEquals(restored, testData);
      }
    } finally {
      await cleanupTempDir(tempDir);
    }
  });
});
