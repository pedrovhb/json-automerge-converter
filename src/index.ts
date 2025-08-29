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
  jsonToAutomerge,
  automergeToJson,
  writeJsonAsAutomerge,
  readAutomergeAsJson,
  jsonToRepoCompatible,
  testRepoCompatibility,
  type ConversionOptions
} from "./jsonAutomergeConverter.ts";