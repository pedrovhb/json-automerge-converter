/**
 * JSON ↔ Automerge Binary Converter
 *
 * This package provides utilities for converting between JSON objects and
 * Automerge binary format, enabling seamless integration with automerge-repo
 * collaborative document systems.
 *
 * @module
 */

export {
  automergeToJson,
  type ConversionOptions,
  jsonToAutomerge,
  jsonToRepoCompatible,
  readAutomergeAsJson,
  testRepoCompatibility,
  writeJsonAsAutomerge,
} from "./jsonAutomergeConverter.ts";
