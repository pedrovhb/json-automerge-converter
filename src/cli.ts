#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * CLI tool for converting between JSON and Automerge binary format
 */

import {
  type ConversionOptions,
  jsonToAutomerge,
  readAutomergeAsJson,
  testRepoCompatibility,
} from "./jsonAutomergeConverter.ts";

interface CliOptions {
  input?: string;
  output?: string;
  actor?: string;
  validate?: boolean;
  test?: boolean;
  help?: boolean;
}

const HELP_TEXT = `
JSON ↔ Automerge Binary Converter

USAGE:
  deno run -A cli.ts [OPTIONS] <COMMAND>

COMMANDS:
  json2bin    Convert JSON (from stdin or file) to Automerge binary
  bin2json    Convert Automerge binary file to JSON (to stdout or file)

OPTIONS:
  -i, --input <FILE>     Input file path (if not provided, reads from stdin for json2bin)
  -o, --output <FILE>    Output file path (if not provided, writes to stdout for bin2json)
  -a, --actor <ID>       Actor ID for the automerge document
  -v, --validate         Validate JSON before conversion
  -t, --test             Test repo compatibility after conversion
  -h, --help             Show this help message

EXAMPLES:
  # Convert JSON from stdin to binary file
  echo '{"hello": "world"}' | deno run -A cli.ts json2bin -o document.automerge

  # Convert JSON file to binary file
  deno run -A cli.ts json2bin -i data.json -o document.automerge

  # Convert binary file to JSON (stdout)
  deno run -A cli.ts bin2json -i document.automerge

  # Convert binary file to JSON file
  deno run -A cli.ts bin2json -i document.automerge -o output.json

  # With validation and testing
  echo '{"test": true}' | deno run -A cli.ts json2bin -o test.automerge -v -t

  # Using deno tasks
  deno task json2bin -i data.json -o document.automerge -v -t
  deno task bin2json -i document.automerge -o output.json
`;

function parseArgs(args: string[]): { command: string; options: CliOptions } {
  const options: CliOptions = {};
  let command = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-i" || arg === "--input") {
      options.input = args[++i];
    } else if (arg === "-o" || arg === "--output") {
      options.output = args[++i];
    } else if (arg === "-a" || arg === "--actor") {
      options.actor = args[++i];
    } else if (arg === "-v" || arg === "--validate") {
      options.validate = true;
    } else if (arg === "-t" || arg === "--test") {
      options.test = true;
    } else if (!command && !arg.startsWith("-")) {
      command = arg;
    }
  }

  return { command, options };
}

async function readStdin(): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];

  for await (const chunk of Deno.stdin.readable) {
    chunks.push(chunk);
  }

  const combined = new Uint8Array(
    chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return decoder.decode(combined);
}

async function json2bin(options: CliOptions): Promise<void> {
  const conversionOptions: ConversionOptions = {
    actor: options.actor,
    validateJson: options.validate,
  };

  let jsonData: unknown;

  if (options.input) {
    // Read from file
    const jsonText = await Deno.readTextFile(options.input);
    try {
      jsonData = JSON.parse(jsonText);
    } catch (error) {
      console.error(
        "Error parsing JSON file:",
        error instanceof Error ? error.message : String(error),
      );
      Deno.exit(1);
    }
  } else {
    // Read from stdin
    const jsonText = await readStdin();
    try {
      jsonData = JSON.parse(jsonText);
    } catch (error) {
      console.error(
        "Error parsing JSON from stdin:",
        error instanceof Error ? error.message : String(error),
      );
      Deno.exit(1);
    }
  }

  try {
    const binary = jsonToAutomerge(jsonData, conversionOptions);

    if (options.output) {
      await Deno.writeFile(options.output, binary);
      console.error(
        `✓ Converted JSON to Automerge binary (${binary.length} bytes) -> ${options.output}`,
      );
    } else {
      // Write binary to stdout
      await Deno.stdout.write(binary);
    }

    // Test repo compatibility if requested
    if (options.test) {
      const compatible = await testRepoCompatibility(binary);
      console.error(
        `✓ Repo compatibility test: ${compatible ? "PASS" : "FAIL"}`,
      );
    }
  } catch (error) {
    console.error(
      "Error during conversion:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

async function bin2json(options: CliOptions): Promise<void> {
  if (!options.input) {
    console.error("Error: Input file required for bin2json command");
    Deno.exit(1);
  }

  const conversionOptions: ConversionOptions = {
    actor: options.actor,
  };

  try {
    const jsonData = await readAutomergeAsJson(
      options.input,
      conversionOptions,
    );
    const jsonText = JSON.stringify(jsonData, null, 2);

    if (options.output) {
      await Deno.writeTextFile(options.output, jsonText);
      console.error(
        `✓ Converted Automerge binary to JSON -> ${options.output}`,
      );
    } else {
      // Write to stdout
      console.log(jsonText);
    }
  } catch (error) {
    console.error(
      "Error during conversion:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

async function main() {
  const { command, options } = parseArgs(Deno.args);

  if (options.help || !command) {
    console.log(HELP_TEXT);
    Deno.exit(0);
  }

  switch (command) {
    case "json2bin":
      await json2bin(options);
      break;
    case "bin2json":
      await bin2json(options);
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.error("Use --help to see available commands");
      Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
