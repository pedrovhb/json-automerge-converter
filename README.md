# JSON ↔ Automerge Binary Converter

A TypeScript/Deno library and CLI tool for converting between JSON objects and Automerge binary format, enabling seamless integration with `automerge-repo` collaborative document systems.

## Features

✅ **Bidirectional conversion** - JSON ↔ Automerge binary  
✅ **Repo compatibility** - Generated binaries work with `repo.import()`  
✅ **File & stdin/stdout support** - Flexible input/output options  
✅ **Validation** - Optional JSON validation before conversion  
✅ **Error handling** - Proper error messages and exit codes  
✅ **Type safety** - Full TypeScript support with strict typing  
✅ **Zero config** - Works out of the box with sensible defaults

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd json-automerge-converter

# Install dependencies
deno cache src/index.ts
```

## Usage

### CLI Tool

```bash
# Convert JSON file to Automerge binary
deno task json2bin -i data.json -o document.automerge -v -t

# Convert JSON from stdin to binary file  
echo '{"hello": "world"}' | deno task json2bin -o document.automerge

# Convert binary file to JSON (stdout)
deno task bin2json -i document.automerge

# Convert binary file to JSON file
deno task bin2json -i document.automerge -o output.json

# Show help
deno run -A src/cli.ts --help
```

#### CLI Options

- `-i, --input <FILE>` - Input file path (stdin for json2bin if not provided)
- `-o, --output <FILE>` - Output file path (stdout for bin2json if not provided)  
- `-a, --actor <ID>` - Actor ID for the automerge document
- `-v, --validate` - Validate JSON before conversion
- `-t, --test` - Test repo compatibility after conversion
- `-h, --help` - Show help message

### Programmatic API

```typescript
import {
  jsonToAutomerge,
  automergeToJson,
  writeJsonAsAutomerge, 
  readAutomergeAsJson,
  testRepoCompatibility
} from "./src/index.ts";

// Convert JSON to Automerge binary
const json = { title: "My Document", content: "Hello, world!" };
const binary = jsonToAutomerge(json, { validateJson: true });

// Convert binary back to JSON
const restored = automergeToJson(binary);
console.log(restored); // { title: "My Document", content: "Hello, world!" }

// File operations
await writeJsonAsAutomerge(json, "document.automerge");
const fromFile = await readAutomergeAsJson("document.automerge");

// Test repo compatibility
const isCompatible = await testRepoCompatibility(binary);
console.log("Repo compatible:", isCompatible); // true
```

### Integration with automerge-repo

```typescript
import { Repo } from "@automerge/automerge-repo";
import { jsonToRepoCompatible } from "./src/index.ts";

const repo = new Repo({ /* your config */ });

// Convert JSON and import to repo
const json = { users: [{ name: "Alice" }, { name: "Bob" }] };
const binary = jsonToRepoCompatible(json);
const handle = repo.import(binary);

console.log("Document URL:", handle.url);
console.log("Document ready:", handle.isReady());
console.log("Document content:", handle.doc());
```

## API Reference

### Core Functions

#### `jsonToAutomerge(json, options?)`
Convert JSON object to Automerge binary format.

- **json**: `unknown` - The JSON object to convert
- **options**: `ConversionOptions` - Optional conversion settings
- **Returns**: `Uint8Array` - Automerge binary representation

#### `automergeToJson(binary, options?)`
Convert Automerge binary format to JSON object.

- **binary**: `Uint8Array` - The Automerge binary data
- **options**: `ConversionOptions` - Optional conversion settings
- **Returns**: `unknown` - The JSON object representation

#### `writeJsonAsAutomerge(json, filePath, options?)`
Write JSON object directly to Automerge binary file.

#### `readAutomergeAsJson(filePath, options?)`
Read Automerge binary file and convert to JSON.

#### `testRepoCompatibility(binary)`
Test if binary data can be successfully imported by automerge-repo.

### Options

```typescript
interface ConversionOptions {
  actor?: string;        // Actor ID for the document
  validateJson?: boolean; // Validate JSON before conversion
}
```

## Development

### Available Tasks

```bash
deno task dev              # Development mode with watch
deno task json2bin         # JSON to binary conversion
deno task bin2json         # Binary to JSON conversion  
deno task test             # Run tests
deno task test:comprehensive # Run comprehensive tests
```

### Testing

```bash
# Run all tests
deno task test

# Run comprehensive integration tests
deno task test:comprehensive

# Test CLI manually
echo '{"test": true}' | deno task json2bin -o test.automerge -v -t
deno task bin2json -i test.automerge
```

## Technical Details

### Binary Format
- Uses Automerge's native binary format via `A.save()` and `A.load()`
- Fully compatible with `repo.import()` and `repo.export()`
- Efficient CRDT encoding preserves document structure and history

### Validation
- Optional JSON validation ensures only serializable data
- Rejects non-plain objects (Date, RegExp, functions, etc.)
- Supports nested objects and arrays with proper type checking

### Error Handling
- Clear error messages for invalid JSON or binary data
- Graceful handling of file I/O errors
- Proper exit codes for CLI usage

## License

MIT License - see LICENSE file for details.