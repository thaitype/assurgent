#!/usr/bin/env bun
// Entry point for `bunx assurgent`

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
assurgent - Telegram bot bridge to Claude Code CLI

Usage:
  assurgent          Start the bot
  assurgent init     Scaffold config.json into ASSURGENT_HOME
  assurgent --help   Show this help message
  assurgent --version  Print the version number

Configuration:
  Config is loaded from $ASSURGENT_HOME/config.json.
  ASSURGENT_HOME defaults to ~/.assurgent/ if not set.

  Run "assurgent init" to create the config file, then edit it with your settings.
`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  const pkgPath = join(import.meta.dirname, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
  console.log(pkg.version);
  process.exit(0);
}

if (args[0] === "init") {
  const { getAssurgentHome } = await import("./src/config.ts");
  const target = join(getAssurgentHome(), "config.json");

  if (existsSync(target)) {
    console.error(
      `Config already exists at ${target}. Edit it directly or delete it to re-initialize.`,
    );
    process.exit(1);
  }

  mkdirSync(dirname(target), { recursive: true });
  const source = join(import.meta.dirname, "config.example.json");
  copyFileSync(source, target);
  console.log(`Created config at ${target}. Edit it with your settings, then run "assurgent".`);
  process.exit(0);
}

await import("./src/index.ts");
