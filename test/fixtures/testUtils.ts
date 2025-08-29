/**
 * Shared test utilities and helpers
 */

import { assertEquals } from "@std/assert";
import {
  automergeToJson,
  type ConversionOptions,
  jsonToAutomerge,
} from "@jsonAutomergeConverter";

/**
 * Test roundtrip conversion (JSON → Binary → JSON)
 */
export function testRoundtrip(
  data: unknown,
  options?: ConversionOptions,
): void {
  const binary = jsonToAutomerge(data, options);
  const restored = automergeToJson(binary, options);
  assertEquals(restored, data);
}

/**
 * Create a temporary directory for test files
 */
export async function createTempTestDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "json-automerge-test-" });
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Measure binary size for performance testing
 */
export function measureBinarySize(data: unknown): number {
  const binary = jsonToAutomerge(data);
  return binary.length;
}

/**
 * Generate test data of specified size
 */
export function generateTestData(
  itemCount: number,
  itemSize: number = 10,
): Record<string, unknown> {
  return {
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: Array(itemSize).fill(`x`).join(""),
      active: i % 2 === 0,
    })),
    metadata: {
      count: itemCount,
      generated: new Date().toISOString(),
    },
  };
}

/**
 * Assert that binary is valid Automerge format
 */
export function assertValidBinary(binary: Uint8Array): void {
  assertEquals(binary instanceof Uint8Array, true);
  assertEquals(binary.length > 0, true);

  // Should be loadable by Automerge
  try {
    automergeToJson(binary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid binary format: ${message}`);
  }
}
