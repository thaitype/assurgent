#!/usr/bin/env bun
// Entry point for `bunx assurgent`

import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
assurgent - Telegram bot bridge to Claude Code CLI

Usage:
  assurgent [options]

Options:
  --help, -h       Show this help message
  --version, -v    Print the version number

Configuration:
  Requires config.json and .env in the working directory.
  See config.example.json for the expected structure.
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  const pkgPath = join(import.meta.dirname, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  console.log(pkg.version);
  process.exit(0);
}

await import("./src/index.ts");
