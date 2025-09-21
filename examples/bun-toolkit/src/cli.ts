#!/usr/bin/env bun

import { parseArgs } from "util";

function printVersion() {
  console.log("Verifiable Supply Chain Toolkit v0.1.0");
}

function printHelp() {
  console.log(`
Verifiable Supply Chain CLI

Usage: bun cli.ts <command> [options]

Commands:
  version                                       Show version information
  help                                          Show this help message
`);
}

// Main CLI logic
try {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
  });

  const command = positionals[0];

  if (!command || command === "help") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'version':
      printVersion();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error}`);
  process.exit(1);
}