# Task 3: Dry-Run Publish Results

## Summary

`bun publish --dry-run` was run twice: once before fixes and once after. The initial run included test files. The `package.json` `files` array was updated to explicitly enumerate only runtime source files (removing the glob `src/**/*` which was including `*.test.ts` files).

A `.npmignore` file was also created but found to have no effect with Bun 1.3.8. The fix was applied via the `files` array instead.

---

## Before Fix

Initial `files` array: `["cli.ts", "src/**/*", "config.example.json", "README.md"]`

```
packed 0.60KB package.json
packed 6.63KB README.md
packed 0.85KB cli.ts
packed 0.54KB config.example.json
packed 2.83KB src/agent/claude-code.test.ts    <-- UNWANTED
packed 2.0KB  src/agent/claude-code.ts
packed 1.29KB src/chat/telegram.test.ts         <-- UNWANTED
packed 4.0KB  src/chat/telegram.ts
packed 1.66KB src/config.test.ts                <-- UNWANTED
packed 2.27KB src/config.ts
packed 5.59KB src/core/session-manager.test.ts  <-- UNWANTED
packed 6.0KB  src/core/session-manager.ts
packed 10.52KB src/core/wrapper.ts
packed 1.39KB src/index.ts
packed 0.62KB src/interfaces/agent-adapter.ts
packed 0.95KB src/interfaces/chat-adapter.ts

Total files: 16
Unpacked size: 47.81KB
```

**Problem:** `src/**/*` glob includes all `*.test.ts` files.

**Attempted fix:** Added `.npmignore` with `**/*.test.ts` — had no effect in Bun 1.3.8.

---

## Fix Applied

Updated `files` array in `package.json` to explicitly list each runtime source file:

```json
"files": [
  "cli.ts",
  "src/agent/claude-code.ts",
  "src/chat/telegram.ts",
  "src/config.ts",
  "src/core/session-manager.ts",
  "src/core/wrapper.ts",
  "src/index.ts",
  "src/interfaces/agent-adapter.ts",
  "src/interfaces/chat-adapter.ts",
  "config.example.json",
  "README.md"
]
```

---

## After Fix — Final Verified Output

```
bun publish v1.3.8 (b64edcb4)

packed 0.84KB package.json
packed 6.63KB README.md
packed 0.85KB cli.ts
packed 0.54KB config.example.json
packed 2.0KB  src/agent/claude-code.ts
packed 4.0KB  src/chat/telegram.ts
packed 2.27KB src/config.ts
packed 6.0KB  src/core/session-manager.ts
packed 10.52KB src/core/wrapper.ts
packed 1.39KB src/index.ts
packed 0.62KB src/interfaces/agent-adapter.ts
packed 0.95KB src/interfaces/chat-adapter.ts

Total files: 12
Unpacked size: 36.69KB
Tag: latest
Access: public
Registry: https://registry.npmjs.org/

 + assurgent@0.1.0 (dry-run)
```

Exit code: 0

---

## Verification Checklist

### Files INCLUDED (expected)

| File | Present |
|------|---------|
| `package.json` | yes |
| `cli.ts` | yes |
| `src/agent/claude-code.ts` | yes |
| `src/chat/telegram.ts` | yes |
| `src/config.ts` | yes |
| `src/core/session-manager.ts` | yes |
| `src/core/wrapper.ts` | yes |
| `src/index.ts` | yes |
| `src/interfaces/agent-adapter.ts` | yes |
| `src/interfaces/chat-adapter.ts` | yes |
| `config.example.json` | yes |
| `README.md` | yes |

### Files EXCLUDED (expected)

| File/Directory | Absent |
|----------------|--------|
| `*.test.ts` | yes |
| `.chief/` | yes |
| `node_modules/` | yes |
| `.env` | yes |
| `config.json` | yes |
| `state/` | yes |
| `biome.json` | yes |
| `tsconfig.json` | yes |
| `bun.lock` | yes |

---

## Note on .npmignore

A `.npmignore` file was created at the repo root with `**/*.test.ts`. It was found to have no effect with Bun 1.3.8 — Bun's `publish` does not appear to honor `.npmignore` in this version. The file remains in the repo but is not relied upon. The `files` array in `package.json` is the authoritative exclusion mechanism.
