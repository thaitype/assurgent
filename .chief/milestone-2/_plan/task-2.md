# Task 2: Define Interfaces and Config Module

## Objective

Create the core interface files (`ChatAdapter`, `AgentAdapter`) and the config loader module so the rest of the codebase can import them.

## Scope

- Create `app/src/interfaces/chat-adapter.ts`
- Create `app/src/interfaces/agent-adapter.ts`
- Create `app/src/config.ts` with Config type, validation, and loader
- Create `app/src/config.test.ts` with validation tests

## Rules & Contracts to Follow

- `.chief/milestone-2/_contract/interfaces.md` -- exact interface definitions
- `.chief/milestone-2/_contract/config-schema.md` -- config validation rules
- `.chief/_rules/_standard/typescript.md` -- coding standards

## Steps

1. Create `src/interfaces/chat-adapter.ts` with `IncomingMessage` and `ChatAdapter` interfaces exactly as defined in the contract
2. Create `src/interfaces/agent-adapter.ts` with `AgentResponse`, `AgentInvokeOptions`, and `AgentAdapter` interfaces exactly as defined in the contract
3. Create `src/config.ts` with:
   - `Config` interface matching the contract
   - `validateConfig(config: Config): void` -- throws on invalid config
   - `loadConfig(configPath: string): Config` -- reads and validates config.json
   - Config path defaults to `app/config.json` (resolved relative to project)
   - No profile system, no template bootstrapping (unlike reference)
4. Create `src/config.test.ts` testing:
   - Valid config passes validation
   - Missing `botToken` throws
   - Empty `allowedUserIds` throws
   - Invalid `turnLimit` throws (0, negative, missing)

## Acceptance Criteria

- Interface files export the exact types from the contract
- `validateConfig` rejects invalid configs with clear error messages
- `loadConfig` reads a JSON file, parses it, validates, and returns typed Config
- All tests pass
- `bun run typecheck` passes
- `bun run lint` passes

## Verification

```bash
cd app && bun run typecheck && bun test && bun run lint
```

## Deliverables

- `app/src/interfaces/chat-adapter.ts`
- `app/src/interfaces/agent-adapter.ts`
- `app/src/config.ts`
- `app/src/config.test.ts`
