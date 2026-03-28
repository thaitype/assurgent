# TypeScript Coding Standards

## Language Configuration

- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- Target: ESNext (Bun runtime)
- Module: ESNext with Bun module resolution

## Imports

- Use ES module imports (`import`/`export`), never `require()`
- Use `import type` for type-only imports

```typescript
import type { Config } from "./config";
import { SessionManager } from "./core/session-manager";
```

- Prefer named exports over default exports
- Order imports: external packages first, then internal modules

## Naming Conventions

- Files: kebab-case (`session-manager.ts`, `chat-adapter.ts`)
- Interfaces: PascalCase, no `I` prefix (`ChatAdapter`, not `IChatAdapter`)
- Classes: PascalCase (`TelegramAdapter`)
- Functions/methods: camelCase (`resolveSession`)
- Constants: camelCase for module-level, UPPER_SNAKE_CASE only for true global constants
- Type aliases: PascalCase (`AgentResponse`)

## Error Handling

- Throw `Error` or custom error subclasses, never throw strings
- Catch specific errors when possible; avoid empty catch blocks
- Log errors with context before rethrowing

## Code Style

- Use `const` by default; use `let` only when reassignment is needed; never use `var`
- Use async/await, not raw Promises or callbacks
- Use template literals for string interpolation
- Prefer `interface` over `type` for object shapes
- Keep functions small and focused (under ~50 lines)
- Use early returns to reduce nesting

## Comments

- Write JSDoc for public interfaces and exported functions
- Do not write comments that restate what the code does
- Use `// TODO:` for planned future work

## Testing

- Test files: `*.test.ts` colocated with source
- Use Bun's built-in test runner (`bun:test`)
- One test file per module
