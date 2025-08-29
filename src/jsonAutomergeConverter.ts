/**
 * Core API for converting between JSON and Automerge binary format
 */

import * as A from "@automerge/automerge";
import { Repo } from "@automerge/automerge-repo";

export interface ConversionOptions {
  /** Actor ID for the automerge document */
  actor?: string;
  /** Whether to validate JSON before conversion */
  validateJson?: boolean;
}

/**
 * Convert JSON object to Automerge binary format
 * @param json - The JSON object to convert
 * @param options - Optional conversion settings
 * @returns Uint8Array containing the Automerge binary representation
 */
export function jsonToAutomerge(json: unknown, options: ConversionOptions = {}): Uint8Array {
  if (options.validateJson && !isValidJsonObject(json)) {
    throw new Error("Invalid JSON object: must be a plain object or array");
  }

  const doc = A.from(json as Record<string, unknown>, options.actor);
  return A.save(doc);
}

/**
 * Convert Automerge binary format to JSON object
 * @param binary - The Automerge binary data
 * @param options - Optional conversion settings  
 * @returns The JSON object representation
 */
export function automergeToJson(binary: Uint8Array, options: ConversionOptions = {}): unknown {
  const doc = A.load(binary, options.actor);
  return doc;
}

/**
 * Write JSON object to Automerge binary file
 * @param json - The JSON object to write
 * @param filePath - Path where to write the binary file
 * @param options - Optional conversion settings
 */
export async function writeJsonAsAutomerge(
  json: unknown, 
  filePath: string, 
  options: ConversionOptions = {}
): Promise<void> {
  const binary = jsonToAutomerge(json, options);
  await Deno.writeFile(filePath, binary);
}

/**
 * Read Automerge binary file and convert to JSON
 * @param filePath - Path to the Automerge binary file
 * @param options - Optional conversion settings
 * @returns The JSON object representation
 */
export async function readAutomergeAsJson(
  filePath: string, 
  options: ConversionOptions = {}
): Promise<unknown> {
  const binary = await Deno.readFile(filePath);
  return automergeToJson(binary, options);
}

/**
 * Create a repo-compatible binary that can be imported with repo.import()
 * @param json - The JSON object to convert
 * @param options - Optional conversion settings
 * @returns Uint8Array that can be used with repo.import()
 */
export function jsonToRepoCompatible(json: unknown, options: ConversionOptions = {}): Uint8Array {
  // repo.import() expects the same format as A.save() produces
  return jsonToAutomerge(json, options);
}

/**
 * Test if a repo can successfully import the binary data
 * @param binary - The binary data to test
 * @returns Promise<boolean> indicating if import was successful
 */
export async function testRepoCompatibility(binary: Uint8Array): Promise<boolean> {
  try {
    const repo = new Repo({ 
      storage: undefined,
      network: []
    });
    
    const handle = repo.import(binary);
    return handle.isReady();
  } catch {
    return false;
  }
}

/**
 * Validate that a value is a valid JSON object/array
 */
function isValidJsonObject(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return true;
  }
  
  if (Array.isArray(value)) {
    return value.every(item => isValidJsonObject(item));
  }
  
  if (typeof value === "object") {
    // Check if it's a plain object (not Date, RegExp, etc.)
    if (value.constructor !== Object && value.constructor !== undefined) {
      return false;
    }
    
    return Object.values(value).every(val => isValidJsonObject(val));
  }
  
  return false;
}